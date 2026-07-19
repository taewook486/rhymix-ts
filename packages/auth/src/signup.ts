/**
 * Signup pipeline — SPEC-AUTH-001 Slice B.
 *
 * 순수 비즈니스 로직: Server Action / tRPC 래퍼는 Slice C 이후에 추가.
 *
 * 책임:
 *   1. Zod 검증 (REQ-AUTH-006)
 *   2. 비밀번호 정책 (REQ-AUTH-041 normal-tier만 — 강력/매우-강력은 후속)
 *   3. DeniedIdentifier 차단 (REQ-AUTH-052)
 *   4. user_id / email / phone 사전 중복 체크 (REQ-AUTH-010)
 *   5. Argon2id 해싱 (REQ-AUTH-001 — Slice A의 hashPassword 재사용)
 *   6. 트랜잭션: User 생성 → (조건부) EmailAuthToken 발급 → AuditLog 기록
 *   7. 트랜잭션 커밋 후 메일 디스패치 (실패해도 회원가입 자체는 ok)
 *
 * 보안 불변식 (REQ-AUTH-005, REQ-AUTH-051, REQ-AUTH-055):
 *   - 평문 비밀번호와 토큰은 절대 로깅하지 않는다 (이 모듈은 logger 미사용).
 *   - 실패 응답에는 어느 필드가 충돌했는지 노출하지 않는다 (failure tuple은 ok+code뿐).
 *   - Prisma P2002 race-condition은 IDENTIFIER_TAKEN으로 일관 변환.
 *
 * @MX:ANCHOR: 회원가입 단일 진입점 — Server Action / tRPC 모두 본 함수를 통과한다.
 * @MX:REASON: 검증/해싱/감사 로그가 한 곳에 모여야 한 번의 우회로 보안이 무너지지 않는다.
 * @MX:SPEC: SPEC-AUTH-001 REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-010, REQ-AUTH-011, REQ-AUTH-051, REQ-AUTH-052
 */

import type { PrismaClient } from '@rhymix-ts/db';
import { z } from 'zod';

import { hashPassword } from './password';
import type { MailDispatcher } from './mail';
import { generateToken } from './tokens';
// SPEC-POINT-001 REQ-POINT-070: 회원가입 보너스 포인트 지급
import { pointHooks } from '@rhymix-ts/point';
// SPEC-CAPTCHA-001 REQ-CAPTCHA-003: Turnstile verification
import { verifyTurnstileToken } from './captcha';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const SignupInput = z.object({
  userId: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[A-Za-z0-9_.-]+$/),
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
  nickName: z.string().min(1).max(80),
  userName: z.string().max(120).optional(),
  phoneNumber: z.string().max(32).optional(),
  phoneCountry: z.string().length(2).optional(),
  agreements: z
    .array(z.object({ key: z.string(), version: z.string() }))
    .default([]),
  captchaToken: z.string().optional(), // SPEC-CAPTCHA-001 REQ-CAPTCHA-003
  extraVars: z.record(z.unknown()).default({}),
  ip: z.string().max(64),
  userAgent: z.string().max(512).default(''),
  // SPEC-MEMBER-ADMIN-001 REQ-MADM-017: 가입키(accessMode='SIGNUP_KEY'일 때만 검사됨).
  signupKey: z.string().max(200).optional(),
});
export type SignupInput = z.infer<typeof SignupInput>;

// ---------------------------------------------------------------------------
// SPEC-MEMBER-ADMIN-001 REQ-MADM-023: 닉네임 특수문자/띄어쓰기 검증
// ---------------------------------------------------------------------------

export interface NicknamePolicy {
  allowSpecialChars: boolean;
  allowedSpecialChars: string;
  allowSpacing: boolean;
}

const DEFAULT_NICKNAME_POLICY: NicknamePolicy = {
  allowSpecialChars: false,
  allowedSpecialChars: '',
  allowSpacing: false,
};

/**
 * REQ-MADM-023: 닉네임 특수문자 허용 여부(허용 시 허용 문자 지정 가능) 및 띄어쓰기
 * 허용 여부를 검증한다. 문자·숫자(유니코드, 한글 포함)는 항상 허용되고, 그 외는
 * 정책이 명시적으로 허용한 문자(및 공백)만 통과한다.
 *
 * 가입·관리자 편집 경로 전체(REQ-MADM-023)가 이 함수를 공유한다.
 */
export function validateNickname(
  nickName: string,
  policy: NicknamePolicy = DEFAULT_NICKNAME_POLICY,
): boolean {
  const escapedSpecial = policy.allowSpecialChars
    ? policy.allowedSpecialChars.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
    : '';
  const space = policy.allowSpacing ? ' ' : '';
  const pattern = new RegExp(`^[\\p{L}\\p{N}${escapedSpecial}${space}]+$`, 'u');
  return pattern.test(nickName);
}

// ---------------------------------------------------------------------------
// SPEC-MEMBER-ADMIN-001 REQ-MADM-025: 비밀번호 보안수준별 문자 구성 요건
// ---------------------------------------------------------------------------

/**
 * REQ-MADM-025: 낮음(normal)=길이만(Zod min(10)이 이미 처리), 보통(strong)=길이+숫자,
 * 높음(very_strong)=길이+숫자+특수문자.
 */
export function validatePasswordPolicy(
  password: string,
  policy: 'normal' | 'strong' | 'very_strong',
): boolean {
  if (policy === 'normal') return true;
  const hasDigit = /[0-9]/.test(password);
  if (policy === 'strong') return hasDigit;
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasDigit && hasSpecial;
}

// ---------------------------------------------------------------------------
// SPEC-MEMBER-ADMIN-001 REQ-MADM-026: Argon2id timeCost 안전 범위 클램프
// ---------------------------------------------------------------------------

const ARGON2_TIME_COST_MIN = 2;
const ARGON2_TIME_COST_MAX = 10;

/**
 * REQ-MADM-026: 관리자가 조정한 timeCost 값을 안전 범위(2~10) 내로 강제한다 —
 * 클라이언트/설정 레이어 검증을 신뢰하지 않고 여기서도 방어적으로 클램프한다.
 *
 * @MX:WARN: [AUTO] 범위를 벗어난 값을 서버가 조용히 클램프한다(거부하지 않음).
 * @MX:REASON: 이 함수를 호출하는 시점에는 이미 회원가입 트랜잭션이 진행 중이므로
 *             거부보다 안전한 값으로 클램프하는 편이 사용자 경험/가용성에 유리하다.
 *             1차 방어는 admin.settings.updateDefault 의 Zod min(2)/max(10)이다.
 */
export function clampArgon2TimeCost(timeCost: number | undefined): number | undefined {
  if (timeCost === undefined) return undefined;
  return Math.min(ARGON2_TIME_COST_MAX, Math.max(ARGON2_TIME_COST_MIN, Math.trunc(timeCost)));
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SignupConfig {
  /** REQ-AUTH-011: when true, new accounts start UNAUTHED + verification mail. */
  enableConfirm: boolean;
  /** EmailAuthToken expiry window when enableConfirm. */
  signupTokenTtlHours: number;
  /** REQ-AUTH-041: only 'normal' is enforced in Slice B. */
  passwordPolicy: 'normal' | 'strong' | 'very_strong';
  /** SPEC-POINT-001 REQ-POINT-070: 회원가입 보너스 포인트 (0 = 비활성화) */
  signupBonus?: number;
  /** SPEC-CAPTCHA-001 REQ-CAPTCHA-003: CAPTCHA 설정 */
  captchaEnabled?: boolean;
  captchaSecretKey?: string;
  /** SPEC-CAPTCHA-001 REQ-CAPTCHA-002: 필수 약관 ID 목록 (empty = no terms required) */
  requiredTermsIds?: number[];
  /** SPEC-MEMBER-ADMIN-001 REQ-MADM-016/017: 가입 허가 모드(미지정 시 'ALLOW'). */
  accessMode?: 'ALLOW' | 'DENY' | 'SIGNUP_KEY';
  /** REQ-MADM-017: accessMode='SIGNUP_KEY'일 때 비교 대상이 되는 관리자 설정 키. */
  signupKeyValue?: string;
  /** REQ-MADM-023: 닉네임 특수문자/띄어쓰기 정책(미지정 시 둘 다 불허). */
  nicknamePolicy?: NicknamePolicy;
  /** REQ-MADM-026: Argon2id timeCost 오버라이드(미지정 시 ARGON2ID_PARAMS.timeCost 사용). */
  argon2TimeCost?: number;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SignupErrorCode =
  | 'VALIDATION_FAILED'
  | 'IDENTIFIER_TAKEN'
  | 'IDENTIFIER_DENIED'
  | 'WEAK_PASSWORD'
  | 'CAPTCHA_FAILED'
  | 'TERMS_REQUIRED' // SPEC-CAPTCHA-001 REQ-CAPTCHA-002
  | 'SIGNUP_CLOSED'; // SPEC-MEMBER-ADMIN-001 REQ-MADM-016/017: 가입 거부/가입키 불일치

export interface SignupResult {
  ok: true;
  userId: number;
  status: 'APPROVED' | 'UNAUTHED';
  requiresEmailVerification: boolean;
}

export interface SignupFailure {
  ok: false;
  code: SignupErrorCode;
  // 의도적으로 추가 필드 없음 — REQ-AUTH-051: 실패 응답에 어느 필드가 문제인지 누설 금지.
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Common-password micro-blocklist used by the NORMAL policy tier.
 *
 * Slice B는 Zod min(10) + 본 목록만 검사한다. STRONG / VERY_STRONG의 문자 클래스
 * 요건은 SPEC-MEMBER-ADMIN-001 REQ-MADM-025(validatePasswordPolicy)가 구현한다.
 * RockYou 등 대규모 사전 기반 검사는 여전히 범위 밖(후속 SPEC).
 */
const COMMON_PASSWORDS = new Set<string>([
  'password',
  '1234567890',
  'qwertyuiop',
]);

interface SignupCtx {
  prisma: PrismaClient;
  mail: MailDispatcher;
  config: SignupConfig;
}

export async function signup(
  rawInput: unknown,
  ctx: SignupCtx,
): Promise<SignupResult | SignupFailure> {
  // 1) Zod validation (REQ-AUTH-006).
  const parsed = SignupInput.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_FAILED' };
  }
  const input = parsed.data;

  // 1.5) REQ-MADM-016/017: 가입 허가 모드 게이트. accessMode 미지정 시 기존
  //      동작(가입 허용) 유지 — 하위 호환.
  const accessMode = ctx.config.accessMode ?? 'ALLOW';
  if (accessMode === 'DENY') {
    return { ok: false, code: 'SIGNUP_CLOSED' };
  }
  if (accessMode === 'SIGNUP_KEY') {
    if (!ctx.config.signupKeyValue || input.signupKey !== ctx.config.signupKeyValue) {
      return { ok: false, code: 'SIGNUP_CLOSED' };
    }
  }

  // 1.75) REQ-MADM-023: 닉네임 특수문자/띄어쓰기 검증.
  if (!validateNickname(input.nickName, ctx.config.nicknamePolicy)) {
    return { ok: false, code: 'VALIDATION_FAILED' };
  }

  // 2) Password policy (REQ-AUTH-041 NORMAL + REQ-MADM-025 STRONG/VERY_STRONG).
  if (COMMON_PASSWORDS.has(input.password.toLowerCase())) {
    return { ok: false, code: 'WEAK_PASSWORD' };
  }
  if (!validatePasswordPolicy(input.password, ctx.config.passwordPolicy)) {
    return { ok: false, code: 'WEAK_PASSWORD' };
  }

  // citext가 DB 레벨에서 케이스 무시 비교를 처리하므로 여기서는 raw 값을 그대로 전달.

  // 3) DeniedIdentifier (REQ-AUTH-052).
  const denied = await ctx.prisma.deniedIdentifier.findFirst({
    where: {
      OR: [
        { kind: 'USER_ID', pattern: input.userId },
        { kind: 'NICK_NAME', pattern: input.nickName },
      ],
    },
  });
  if (denied) {
    return { ok: false, code: 'IDENTIFIER_DENIED' };
  }

  // 4) Best-effort uniqueness pre-check (REQ-AUTH-010). DB unique 제약이 source of truth.
  const dupOr: Array<{ userId?: string; emailAddress?: string; phoneNumber?: string }> = [
    { userId: input.userId },
    { emailAddress: input.email },
  ];
  if (input.phoneNumber) dupOr.push({ phoneNumber: input.phoneNumber });
  const duplicate = await ctx.prisma.user.findFirst({ where: { OR: dupOr } });
  if (duplicate) {
    return { ok: false, code: 'IDENTIFIER_TAKEN' };
  }

  // 4.5) SPEC-CAPTCHA-001 REQ-CAPTCHA-003: CAPTCHA verification (when enabled).
  if (ctx.config.captchaEnabled && ctx.config.captchaSecretKey) {
    if (!input.captchaToken) {
      return { ok: false, code: 'CAPTCHA_FAILED' };
    }
    try {
      const result = await verifyTurnstileToken({
        token: input.captchaToken,
        secretKey: ctx.config.captchaSecretKey,
        remoteIp: input.ip,
      });
      if (!result.success) {
        return { ok: false, code: 'CAPTCHA_FAILED' };
      }
    } catch {
      // Network error or Turnstile API failure → fail closed
      return { ok: false, code: 'CAPTCHA_FAILED' };
    }
  }

  // 4.75) SPEC-CAPTCHA-001 REQ-CAPTCHA-002: 필수 약관 동의 검증.
  if (ctx.config.requiredTermsIds && ctx.config.requiredTermsIds.length > 0) {
    const agreementKeys = input.agreements.map((a) => a.key);
    const missingRequired = ctx.config.requiredTermsIds.filter(
      (termsId) => !agreementKeys.includes(`terms:${termsId}`),
    );
    if (missingRequired.length > 0) {
      return { ok: false, code: 'TERMS_REQUIRED' };
    }
  }

  // 5) Argon2id hash (REQ-AUTH-001, REQ-MADM-026 timeCost override + safety clamp).
  const clampedTimeCost = clampArgon2TimeCost(ctx.config.argon2TimeCost);
  const passwordHash = await hashPassword(
    input.password,
    clampedTimeCost !== undefined ? { iterations: clampedTimeCost } : undefined,
  );

  // 6) Transaction: user + (optional) token + audit-log.
  const status = ctx.config.enableConfirm ? 'UNAUTHED' : 'APPROVED';
  let createdUserId: number;
  let issuedTokenKey: string | null = null;

  try {
    const txResult = await ctx.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId: input.userId,
          emailAddress: input.email,
          passwordHash,
          nickName: input.nickName,
          userName: input.userName,
          phoneNumber: input.phoneNumber ?? null,
          phoneCountry: input.phoneCountry ?? null,
          status,
          extraVars: input.extraVars as object,
        } as never,
      });

      let tokenKey: string | null = null;
      if (ctx.config.enableConfirm) {
        tokenKey = generateToken();
        const expiresAt = new Date(
          Date.now() + ctx.config.signupTokenTtlHours * 3600 * 1000,
        );
        await tx.emailAuthToken.create({
          data: {
            userId: user.id,
            authKey: tokenKey,
            authType: 'SIGNUP',
            expiresAt,
          } as never,
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: null,
          targetId: user.id,
          action: 'SIGNUP',
          ip: input.ip,
          userAgent: input.userAgent,
        } as never,
      });

      // SPEC-CAPTCHA-001 REQ-CAPTCHA-002: 약관 동의 기록 (MemberAgreement 재사용).
      for (const agreement of input.agreements) {
        await tx.memberAgreement.create({
          data: {
            userId: user.id,
            agreementKey: agreement.key,
            version: agreement.version,
            ip: input.ip,
          } as never,
        });
      }

      return { id: user.id, tokenKey };
    });
    createdUserId = txResult.id;
    issuedTokenKey = txResult.tokenKey;
  } catch (err) {
    // Prisma unique-constraint race → uniform IDENTIFIER_TAKEN response.
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, code: 'IDENTIFIER_TAKEN' };
    }
    throw err;
  }

  // 7) Post-commit mail dispatch — fire-and-forget. 실패해도 가입 자체는 성공.
  if (issuedTokenKey) {
    try {
      await ctx.mail.dispatch({
        to: input.email,
        subject: 'Verify your email',
        template: 'signup-verify',
        vars: {
          // verifyUrl 조립은 Server Action 레이어가 origin을 알기에 거기서 처리.
          // Slice B 단계에서는 placeholder 만 전달.
          verifyUrl: `PLACEHOLDER:${issuedTokenKey}`,
          userName: input.nickName,
        },
      });
    } catch {
      // REQ-AUTH-055: 실패 사유 로깅 금지 (logger 미사용).
    }
  }

  // 7.5) Signup bonus (REQ-POINT-070) — post-commit, fire-and-forget
  if (ctx.config.signupBonus && ctx.config.signupBonus > 0) {
    try {
      await pointHooks.onMemberSignedUp(ctx.prisma, {
        memberId: createdUserId,
        signupBonus: ctx.config.signupBonus,
      });
    } catch {
      // 실패해도 가입 성공 유지 (idempotent on retry via unique constraint)
    }
  }

  return {
    ok: true,
    userId: createdUserId,
    status,
    requiresEmailVerification: ctx.config.enableConfirm,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isPrismaUniqueViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === 'P2002';
}
