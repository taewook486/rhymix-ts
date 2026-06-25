/**
 * admin.twoFactor tRPC 라우터 — SPEC-ADMIN-2FA-OTP-001 M3
 *   (REQ-2OTP-021~024, 040~045, 048, 049, 051, 081).
 *
 * 노출 mutate:
 *   - enrollStart:  후보 시크릿 발급 + QR/otpauth URL 반환 (DB 미저장).
 *   - enrollConfirm: 후보 시크릿으로 6자리 코드 검증 → 암호화 저장 + enabled=true
 *                    + 백업코드 해시 저장 + plaintext 백업코드 1회 반환 + M4 마커 등록.
 *   - verify:        mode='totp' | 'backup' 분기. 백업코드는 1회 소비.
 *
 * 보안 특성 (spec.md §4.3, §4.2):
 *   - 닭-달걀 회피: admin2FAProcedure(requireAdmin만)로 보호 (REQ-2OTP-045).
 *   - 레이트 리미팅: login.ts LoginAttempt ledger 재사용, per admin user id, 10분/5회.
 *   - 정보 누설 금지: 모든 실패는 동일 메시지로 반환 (REQ-2OTP-043/051/049).
 *
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-021~024, 040~045, 048, 049, 051, 081
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import { router, admin2FAProcedure } from '../../trpc';
import {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotp,
  generateTotpQrCode,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  normalizeBackupCode,
  registerTwoFactorVerifiedMarker,
} from '@rhymix-ts/auth/two-factor';
import type { Context } from '../../context';

// ---------------------------------------------------------------------------
// 상수 (REQ-2OTP-048: login.ts 기본값과 동일)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX_ERRORS = 5;
const RATE_LIMIT_WINDOW_MIN = 10;

// 후보 시크릿 서버측 임시 보관 (REQ-2OTP-024). 5분 TTL — 사용자가 QR을 스캔하고
// 코드를 입력할 충분한 시간. 미사용 후보는 메모리에 남지 않도록 만료 후 제거.
const PENDING_SECRET_TTL_MS = 5 * 60 * 1000;

const OTP_ISSUER = 'Rhymix';
const BACKUP_CODE_NORMALIZED_PATTERN = /^[A-Z0-9]{10}$/;

// ---------------------------------------------------------------------------
// 후보 시크릿 임시 저장소 (process-scoped Map + TTL)
// ---------------------------------------------------------------------------

interface PendingEntry {
  secret: string;
  expiresAt: number;
}

/**
 * 후보 TOTP 시크릿을 서버측에 임시 보관. REQ-2OTP-024: 클라이언트가 아닌
 * 서버에서 생성한 후보를 user id에 바인딩.
 *
 * @MX:WARN: [AUTO] process-scoped Map — multi-instance/serverless 비호환.
 *   autologin-marker.ts 와 동일 제약. 단일 프로세스 또는 sticky session 전제.
 * @MX:REASON: 다중 인스턴스 환경에서 enrollStart 와 enrollConfirm 이 서로 다른
 *   인스턴스로 라우팅되면 후보 시크릿을 찾지 못해 등록이 실패한다. SPEC-INFRA-001
 *   후속으로 Redis 등 외부 스토어로 이관 필요.
 */
const pendingSecrets = new Map<number, PendingEntry>();

function setPendingSecret(userId: number, secret: string): void {
  // 같은 사용자의 이전 후보는 덮어쓴다 (재진입 시나리오).
  pendingSecrets.set(userId, {
    secret,
    expiresAt: Date.now() + PENDING_SECRET_TTL_MS,
  });
}

function takePendingSecret(userId: number): string | null {
  const entry = pendingSecrets.get(userId);
  if (!entry) return null;
  pendingSecrets.delete(userId);
  if (Date.now() > entry.expiresAt) {
    return null;
  }
  return entry.secret;
}

/**
 * 테스트 전용 — pending store 비우기. 프로덕션 코드에서 호출 금지.
 */
export function __clearPendingSecretsForTests(): void {
  pendingSecrets.clear();
}

// ---------------------------------------------------------------------------
// 레이트 리미팅 (login.ts §0.5 패턴 재사용)
// ---------------------------------------------------------------------------

interface RateLimitCtx {
  prisma: PrismaClient;
  identifier: string; // admin User.id 문자열화 (REQ-2OTP-048)
  ip: string;
}

/**
 * REQ-2OTP-048/049: 2FA 실패 시도를 LoginAttempt ledger에 기록하고,
 * window 내 누적이 임계치 이상이면 추가 검증 없이 차단한다.
 *
 * login.ts 와의 차이: 로그인은 anonymous IP 기반, 2FA는 이미 인증된 관리자라
 * `identifier = userId` 기준으로 센다 (AC-12 "per admin user id").
 */
async function enforceTwoFactorRateLimit(ctx: RateLimitCtx): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000);
  const failCount = await ctx.prisma.loginAttempt.count({
    where: {
      identifier: ctx.identifier,
      result: 'INVALID_CREDENTIALS',
      createdAt: { gt: windowStart },
    } as never,
  });

  if (failCount >= RATE_LIMIT_MAX_ERRORS) {
    await ctx.prisma.loginAttempt.create({
      data: {
        ip: ctx.ip,
        identifier: ctx.identifier,
        result: 'RATE_LIMITED',
      } as never,
    });
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: '시도 횟수를 초과했습니다. 잠시 후 다시 시도하세요.',
    });
  }
}

/**
 * 검증 실패 시 INVALID_CREDENTIALS 행 추가. 남은 시도 횟수·실패 모드 노출 금지(REQ-2OTP-043/049).
 */
async function recordTwoFactorFailure(ctx: RateLimitCtx): Promise<void> {
  await ctx.prisma.loginAttempt.create({
    data: {
      ip: ctx.ip,
      identifier: ctx.identifier,
      result: 'INVALID_CREDENTIALS',
    } as never,
  });
}

// ---------------------------------------------------------------------------
// 인증 주체 helpers
// ---------------------------------------------------------------------------

function actorFromCtx(ctx: Context): { userId: number; identifier: string; ip: string } {
  const rawId = ctx.session?.user?.id;
  const userId =
    typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId ?? ''), 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    // requireAdmin 가 통과했으므로 이곳에 도달하면 안 된다. 방어적으로 거부.
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' });
  }
  return {
    userId,
    identifier: String(userId),
    ip: ctx.ip ?? '',
  };
}

function userAccountLabel(userId: number): string {
  // otpauth URL 의 account 자리. 개인정보(이메일) 노출을 피하기 위해 단순 id 사용.
  return `admin-${userId}`;
}

// ---------------------------------------------------------------------------
// 라우터
// ---------------------------------------------------------------------------

export const adminTwoFactorRouter = router({
  /**
   * REQ-2OTP-020/024: 후보 시크릿을 서버에서 생성하고 user id 에 바인딩.
   * DB에는 저장하지 않고, confirm 시에만 영구화한다.
   */
  enrollStart: admin2FAProcedure.mutation(async ({ ctx }) => {
    const { userId } = actorFromCtx(ctx);

    const secret = generateTotpSecret();
    setPendingSecret(userId, secret);

    const account = userAccountLabel(userId);
    const otpauthUrl = buildOtpauthUrl({ issuer: OTP_ISSUER, account, secret });
    const qrCodeDataUrl = await generateTotpQrCode({
      issuer: OTP_ISSUER,
      account,
      secret,
    });

    return {
      secret, // base32 수동 입력 폴백 (REQ-2OTP-020)
      otpauthUrl,
      qrCodeDataUrl,
    };
  }),

  /**
   * REQ-2OTP-021~024: 후보 시크릿으로 코드 검증 → 영구 저장 + 백업코드 발급.
   */
  enrollConfirm: admin2FAProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromCtx(ctx);
      const rlCtx: RateLimitCtx = {
        prisma: ctx.prisma,
        identifier: actor.identifier,
        ip: actor.ip,
      };

      // REQ-2OTP-048/049: 코드 검증 전 레이트 리미팅.
      await enforceTwoFactorRateLimit(rlCtx);

      const candidate = takePendingSecret(actor.userId);
      // 후보 시크릿이 없거나 만료된 경우에도 동일한 일반 오류로 응답 (정보 누설 방지).
      const verified = candidate ? verifyTotp(candidate, input.code) : false;
      if (!verified || !candidate) {
        await recordTwoFactorFailure(rlCtx);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '인증 코드가 올바르지 않습니다.',
        });
      }

      // 검증 통과 — 시크릿 암호화 + 백업코드 해시 저장.
      // @MX:ANCHOR: [AUTO] TOTP 시크릿 암호화 단일 경로 — encryptSecret 통해서만 저장.
      // @MX:REASON: 평문 시크릿이 DB에 들어가면 암호화 키가 무의미해진다.
      //   encryptSecret/decryptSecret 호출처를 한 곳으로 모아 평문 유출 경로를
      //   아키텍처 차원에서 차단 (REQ-2OTP-002, REQ-2OTP-044 fail-closed).
      const encryptedSecret = encryptSecret(candidate);

      const plaintextBackupCodes = generateBackupCodes();
      const hashedBackupCodes = plaintextBackupCodes.map((c) => hashBackupCode(c));

      await ctx.prisma.user.update({
        where: { id: actor.userId },
        data: {
          twoFactorSecret: encryptedSecret,
          twoFactorEnabled: true,
          twoFactorConfirmedAt: new Date(),
          twoFactorBackupCodes: hashedBackupCodes,
        } as never,
      });

      // REQ-2OTP-042/046: 검증 통과 → 서버측 one-shot marker 등록.
      // 이후 클라이언트가 reload/navigate하면 jwt callback이 marker를 소비하여
      // session.user.twoFactorVerified = true 를 채운다.
      registerTwoFactorVerifiedMarker(actor.userId);

      // REQ-2OTP-025: 백업코드는 enroll 시 1회만 평문으로 표시. 이후 재조회 불가.
      return {
        backupCodes: plaintextBackupCodes,
      };
    }),

  /**
   * REQ-2OTP-040/041/043/050/051: TOTP 또는 백업코드로 재검증.
   */
  verify: admin2FAProcedure
    .input(
      z.object({
        code: z.string().min(1).max(32),
        mode: z.enum(['totp', 'backup']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromCtx(ctx);
      const rlCtx: RateLimitCtx = {
        prisma: ctx.prisma,
        identifier: actor.identifier,
        ip: actor.ip,
      };

      await enforceTwoFactorRateLimit(rlCtx);

      const user = (await ctx.prisma.user.findUnique({
        where: { id: actor.userId },
        select: {
          twoFactorSecret: true,
          twoFactorEnabled: true,
          twoFactorBackupCodes: true,
        },
      } as never)) as {
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        twoFactorBackupCodes: unknown;
      } | null;

      // 등록되지 않았거나 데이터가 손상된 경우에도 동일한 일반 오류로 응답.
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        await recordTwoFactorFailure(rlCtx);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '인증 코드가 올바르지 않습니다.',
        });
      }

      const storedHashes = Array.isArray(user.twoFactorBackupCodes)
        ? (user.twoFactorBackupCodes as string[])
        : [];

      let verified = false;
      let nextBackupHashes: string[] | null = null;

      if (input.mode === 'totp') {
        // REQ-2OTP-051: 선언된 모드와 값 형식 불일치 시 동일 일반 오류로 거부.
        if (!/^\d{6}$/.test(input.code)) {
          await recordTwoFactorFailure(rlCtx);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '인증 코드가 올바르지 않습니다.',
          });
        }
        // @MX:ANCHOR: [AUTO] TOTP 시크릿 복호화 단일 경로 — decryptSecret 통해서만 조회.
        // @MX:REASON: 시크릿이 평문으로 메모리에 남지 않도록 복호화 호출처를 단일화.
        //   decryptSecret 실패(키 미일치/데이터 손상) 시 예외를 throw 하여 fail-closed.
        //   REQ-2OTP-044.
        let plainSecret: string;
        try {
          plainSecret = decryptSecret(user.twoFactorSecret);
        } catch {
          await recordTwoFactorFailure(rlCtx);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '인증 코드가 올바르지 않습니다.',
          });
        }
        verified = verifyTotp(plainSecret, input.code);
      } else {
        // backup mode
        const normalized = normalizeBackupCode(input.code);
        if (!BACKUP_CODE_NORMALIZED_PATTERN.test(normalized)) {
          await recordTwoFactorFailure(rlCtx);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '인증 코드가 올바르지 않습니다.',
          });
        }
        const result = verifyBackupCode(normalized, storedHashes);
        if (result.verified) {
          verified = true;
          nextBackupHashes = result.remainingHashes;
        }
      }

      if (!verified) {
        await recordTwoFactorFailure(rlCtx);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '인증 코드가 올바르지 않습니다.',
        });
      }

      // 백업코드가 소비되었으면 갱신. 단일 사용 보장(REQ-2OTP-041).
      if (nextBackupHashes !== null) {
        await ctx.prisma.user.update({
          where: { id: actor.userId },
          data: { twoFactorBackupCodes: nextBackupHashes } as never,
        });
      }

      registerTwoFactorVerifiedMarker(actor.userId);

      return { ok: true as const };
    }),
});
