/**
 * tRPC 초기화 — SPEC-ADMIN-001 Slice B + Slice D (auditLogger).
 *
 * publicProcedure: 인증 없이 호출 가능.
 * protectedAdminProcedure: isAdminSession() 통과 후에만 호출 가능.
 *                          auditLogger 미들웨어가 모든 admin mutation 을 AdminLog 에 기록.
 *
 * @MX:ANCHOR: [AUTO] 모든 admin.* 프로시저의 권한 게이트 + 감사 로그 단일 진입점.
 * @MX:REASON: 어떤 admin.* 프로시저도 이 procedure builder 를 사용하지 않으면
 *             isAdmin 검사 + AdminLog 기록이 모두 생략됨.
 *             fan_in 은 즉시 4+ 이며 Slice D/E 에서 계속 증가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020, REQ-ADMIN-021, REQ-ADMIN-070
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { checkIpAccess } from '@rhymix-ts/admin';
import type { PrismaClient } from '@prisma/client';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

// ---------------------------------------------------------------------------
// Admin IP/Sitelock enforcement cache — SPEC-ADMIN-002 REQ-ADMIN2-115/155
// ---------------------------------------------------------------------------

interface AdminSecuritySnapshot {
  ipControlEnabled: boolean;
  sitelockLocked: boolean;
  sitelockAllowedIpList: string[];
}

/**
 * 짧은 TTL 캐시. requireAdmin 미들웨어가 모든 admin tRPC 호출마다 ipControl/sitelock 설정을
 * DB 에서 읽지 않도록 siteId 별로 캐싱한다.
 *
 * @MX:WARN: [AUTO] 모듈 레벨 가변 캐시 — 설정 변경 반영이 최대 TTL 만큼 지연됨.
 * @MX:REASON: 모든 admin 요청마다 ipControl/sitelock 설정을 DB 에서 추가 조회하면 핫패스
 *             비용이 큼. 5초 TTL 로 정확성과 비용을 절충한다.
 */
const SECURITY_SETTINGS_TTL_MS = 5000;
const securitySnapshotCache = new Map<
  number,
  { value: AdminSecuritySnapshot; expiresAt: number }
>();

/**
 * ipControl / sitelock SiteSetting 을 가벼운 findFirst 단일 조회로 읽는다.
 * getOrCreateSiteSetting(findUnique + create) 핫패스를 피해 row 를 생성하지 않으며,
 * 키가 없으면 기본값(비활성/잠금 해제)으로 처리한다.
 *
 * siteId 가 미해석(undefined)이면 추가 site.findFirst 없이 key 만으로 조회한다
 * (isAdminTwoFactorRequired 와 동일 패턴). 캐시 키는 siteId ?? 0 을 사용한다.
 */
async function loadAdminSecuritySnapshot(
  prisma: PrismaClient,
  siteId: number | undefined,
): Promise<AdminSecuritySnapshot> {
  const cacheKey = siteId ?? 0;
  const now = Date.now();
  const cached = securitySnapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const ipControlWhere =
    siteId !== undefined ? { siteId, key: 'ipControl' } : { key: 'ipControl' };
  const sitelockWhere =
    siteId !== undefined ? { siteId, key: 'sitelock' } : { key: 'sitelock' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const siteSetting = (prisma as any).siteSetting;
  const [ipControlRow, sitelockRow] = await Promise.all([
    siteSetting.findFirst({ where: ipControlWhere }),
    siteSetting.findFirst({ where: sitelockWhere }),
  ]);

  const ipControlValue = (ipControlRow?.value ?? {}) as Record<string, unknown>;
  const sitelockValue = (sitelockRow?.value ?? {}) as Record<string, unknown>;

  const value: AdminSecuritySnapshot = {
    ipControlEnabled: ipControlValue.enabled === true,
    sitelockLocked: sitelockValue.locked === true,
    sitelockAllowedIpList: Array.isArray(sitelockValue.allowedIpList)
      ? (sitelockValue.allowedIpList as string[])
      : [],
  };

  securitySnapshotCache.set(cacheKey, {
    value,
    expiresAt: now + SECURITY_SETTINGS_TTL_MS,
  });
  return value;
}

/** 테스트/잠금 해제 후 캐시를 강제로 비운다. */
export function clearAdminSecurityCache(): void {
  securitySnapshotCache.clear();
}

/**
 * IP 접근 제어 + 사이트 잠금을 강제한다 (REQ-ADMIN2-115, REQ-ADMIN2-155).
 *
 * - IP 제어가 활성화되어 있고 현재 IP 가 거부되면 FORBIDDEN.
 * - 사이트가 잠겨 있고 현재 IP 가 allowedIpList 에 없으면 FORBIDDEN (관리자도 차단).
 *
 * 비활성/잠금 해제(기본값) 상태에서는 무거운 checkIpAccess 조회를 아예 수행하지 않아
 * 기존 admin 흐름과 동작/쿼리 시퀀스에 영향을 주지 않는다.
 * 설정 조회 자체가 실패하면(예: DB 미가용) fail-open 한다.
 */
async function enforceAdminAccessControl(ctx: Context): Promise<void> {
  let snapshot: AdminSecuritySnapshot;
  try {
    // siteId 가 미해석이어도 key 기반 조회로 처리 (추가 site.findFirst 없음).
    snapshot = await loadAdminSecuritySnapshot(ctx.prisma, ctx.siteId);
  } catch {
    return; // 설정 조회 실패 → fail-open
  }

  // 둘 다 기본값(비활성/잠금 해제)이면 추가 비용 없이 통과.
  if (!snapshot.ipControlEnabled && !snapshot.sitelockLocked) {
    return;
  }

  const ip = ctx.ip;

  // 1. IP 접근 제어 (활성화된 경우에만 정밀 평가).
  if (snapshot.ipControlEnabled && ip) {
    let ipDenied = false;
    try {
      const access = await checkIpAccess(ip, { prisma: ctx.prisma });
      ipDenied =
        !access.allowed &&
        (access.reason === 'IN_DENY_LIST' || access.reason === 'NOT_IN_ALLOW_LIST');
    } catch {
      ipDenied = false; // 조회 실패 → fail-open
    }
    if (ipDenied) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '허용되지 않은 IP입니다.' });
    }
  }

  // 2. 사이트 잠금: allowedIpList 에 포함된 IP 만 통과 (관리자도 예외 없음).
  // 현재 관리자 IP 는 Fix 1 의 자가 잠금 방지로 목록에 포함되어 있어야 한다.
  if (snapshot.sitelockLocked) {
    const sitelockDenied = !ip || !snapshot.sitelockAllowedIpList.includes(ip);
    if (sitelockDenied) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '허용되지 않은 IP입니다.' });
    }
  }
}

/**
 * isAdmin 검증 미들웨어.
 * 실패 시 FORBIDDEN 에러 발생.
 *
 * isAdmin 통과 후 IP 접근 제어 + 사이트 잠금을 추가로 강제한다 (REQ-ADMIN2-115/155).
 */
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  if (!isAdminSession(ctx.session)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
  }

  // IP/Sitelock 강제 (기본 비활성 상태에서는 no-op, 조회 실패 시 fail-open).
  await enforceAdminAccessControl(ctx);

  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * 2FA 강제 미들웨어 — SPEC-ADMIN-001 Slice I (REQ-ADMIN-023) + SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * checkAdmin2FA() 가 내부에서 사이트별 2FA 정책 확인 + 세션 검증을 모두 수행한다.
 * 정책이 비활성이면 'pass', 활성인데 미인증이면 'need-enroll'/'need-verify' 를 반환하며,
 * 이 두 경우 FORBIDDEN 을 발생시킨다 (REQ-ADMIN-023, requireAdmin/IP 차단과 동일 코드).
 *
 * requireAdmin 이후에 체인되므로 ctx.session 은 보장됨.
 * siteId 는 ctx.siteId(hostname→domain 해석)를 사용하며, 미해석(undefined)인 엣지
 * 케이스에서는 단일사이트 기본값 1 로 폴백한다 (정책이 siteId=1 에 저장됨).
 *
 * NOTE: 실제 OTP 검증 UI(/login/two-factor)는 SPEC-AUTH-001 후속 슬라이스에서 구현.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-001~005
 */
const requireAdmin2FAIfEnabled = t.middleware(async ({ ctx, next }) => {
  const { checkAdmin2FA } = await import('@rhymix-ts/admin/security');
  const result = await checkAdmin2FA(ctx.session, ctx.prisma, ctx.siteId ?? 1);

  if (result === 'need-enroll') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '2FA 등록이 필요합니다.',
    });
  }

  if (result === 'need-verify') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '2FA 인증이 필요합니다.',
    });
  }

  return next();
});

/**
 * 감사 로그 미들웨어 — SPEC-ADMIN-001 Slice D.
 *
 * type === 'mutation' 이고 성공한 경우에만 AdminLog 를 생성한다.
 * AdminLog.create 자체가 실패해도 원래 mutation 결과는 그대로 반환한다 (best-effort).
 *
 * @MX:WARN: [AUTO] AdminLog.create 실패 시 silent console.error 처리 — 감사 로그 손실 가능.
 * @MX:REASON: AdminLog 기록 실패를 mutation 실패로 전파하면 사용자 경험이 무관한 사유로 깨짐.
 *             Slice E 에서 (a) error sink (Sentry 등), (b) 실패율 메트릭 도입 필요.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-070, REQ-ADMIN-071, SPEC-ADMIN-002 REQ-ADMIN2-045
 */
const SENSITIVE_KEY_PATTERN = /password|secret|token|key/i;

/**
 * diff.input 에서 비밀번호 등 민감 키를 재귀적으로 마스킹한다 (REQ-ADMIN2-045).
 * AdminLog는 누가 무엇을 바꿨는지 추적하는 용도이며 평문 자격증명을 보관해서는 안 된다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function redactSensitive(value: any): any {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? '[REDACTED]' : redactSensitive(v);
    }
    return out;
  }
  return value;
}

const auditLogger = t.middleware(async ({ ctx, type, path, input, next }) => {
  const result = await next();
  // type === 'mutation' 이고 성공한 경우에만 기록 (REQ-ADMIN-070)
  if (type === 'mutation' && result.ok) {
    const session = ctx.session;
    if (session?.user?.id) {
      try {
        await ctx.prisma.adminLog.create({
          data: {
            actorId: session.user.id,
            action: path,             // "admin.module.create", "admin.menu.delete" 등
            target: '',               // Slice E 에서 result 로부터 추출 (REQ-ADMIN-071 정련)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            diff: { input: redactSensitive(input ?? null), output: redactSensitive((result as any).data ?? null) },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });
      } catch (err) {
        // AdminLog 기록 실패는 mutation 결과를 되돌리지 않는다 (REQ-ADMIN-070 best-effort).
        // eslint-disable-next-line no-console
        console.error('[auditLogger] AdminLog.create failed:', err);
      }
    }
  }
  return result;
});

/**
 * requireAdmin → requireAdmin2FAIfEnabled → auditLogger 체인.
 * - requireAdmin: isAdmin 세션 확인
 * - requireAdmin2FAIfEnabled: 2FA 설정 시 twoFactorVerified 플래그 확인 (REQ-ADMIN-023)
 * - auditLogger: mutation 감사 로그 기록 (actorId 는 requireAdmin 통과 후 보장됨)
 */
export const protectedAdminProcedure = publicProcedure
  .use(requireAdmin)
  .use(requireAdmin2FAIfEnabled)
  .use(auditLogger);

// ---------------------------------------------------------------------------
// SPEC-CONTENT-001 Slice B — protectedProcedure
// ---------------------------------------------------------------------------

/**
 * 일반 인증 미들웨어 — content.* 라우터에서 사용.
 *
 * session.user.id 가 없으면 UNAUTHORIZED.
 * isAdmin 검사는 하지 않는다 (admin 게이팅이 필요하면 protectedAdminProcedure 사용).
 *
 * @MX:NOTE [AUTO]: 일반 인증 프로시저. content.* 라우터에서 사용.
 */
const requireAuth = t.middleware(({ ctx, next }) => {
  // NextAuth JWT 세션의 user.id 는 token.sub 에서 그대로 옮겨지므로 항상 string이다
  // (AdminSessionUser.id: number 타입 선언과 실제 런타임 값이 불일치 — auth()의
  // unsafe cast로 인해 타입 검사로는 잡히지 않았던 버그). 여기서 number로 정규화한다.
  const rawUserId = ctx.session?.user?.id as unknown;
  const userId = typeof rawUserId === 'string' ? Number.parseInt(rawUserId, 10) : rawUserId;
  if (typeof userId !== 'number' || !Number.isFinite(userId)) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
  }
  // ctx.session 을 non-nullable 로 narrowing + user.id를 number로 정규화
  return next({
    ctx: { ...ctx, session: { ...ctx.session!, user: { ...ctx.session!.user, id: userId } } },
  });
});

/**
 * 일반 인증 프로시저.
 * content.document.create / update / delete / content.comment.create / delete 등에서 사용.
 */
export const protectedProcedure = publicProcedure.use(requireAuth);
