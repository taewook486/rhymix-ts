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
import { assertAdminSession, enforceAdminAccessControl, enforceAdmin2FA } from './admin-guard';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

// 관리자 IP/사이트 잠금/2FA 판정은 Server Action 과 공유하므로 ./admin-guard 에 있다.
export { clearAdminSecurityCache } from './admin-guard';

/**
 * isAdmin 검증 미들웨어.
 * 실패 시 FORBIDDEN 에러 발생.
 *
 * isAdmin 통과 후 IP 접근 제어 + 사이트 잠금을 추가로 강제한다 (REQ-ADMIN2-115/155).
 */
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  assertAdminSession(ctx);

  // IP/Sitelock 강제 (기본 비활성 상태에서는 no-op, 조회 실패 시 fail-open).
  await enforceAdminAccessControl(ctx);

  // assertAdminSession 이 통과했으므로 ctx.session 은 관리자 세션이다.
  return next({ ctx: { ...ctx, session: ctx.session as NonNullable<typeof ctx.session> } });
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
  await enforceAdmin2FA(ctx);
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

/**
 * admin2FAProcedure — SPEC-ADMIN-2FA-OTP-001 M3 (REQ-2OTP-045).
 *
 * `requireAdmin`만 통과한 절차. `requireAdmin2FAIfEnabled`는 의도적으로 생략한다.
 * 이유: enroll/verify mutation 자체가 2FA 게이트에 막히면 닭-달걀 문제가 발생한다
 * (미인증 관리자가 2FA를 통과할 방법이 없음). auditLogger도 생략 — 이 mutation들은
 * 보안 민감 행위이므로 별도 감사 필요시 추가한다 (REQ-2OTP-045 범위 밖).
 *
 * 비관리자 세션은 `requireAdmin`에서 FORBIDDEN으로 차단된다.
 *
 * @MX:NOTE [AUTO] 2FA 게이트 미적용 — 닭-달걀 회피. REQ-2OTP-045 참고.
 * @MX:SPEC: SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-045
 */
export const admin2FAProcedure = publicProcedure.use(requireAdmin);

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
