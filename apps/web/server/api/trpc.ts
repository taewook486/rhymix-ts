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
import { isAdminTwoFactorRequired, isSessionTwoFactorVerified } from '@/lib/auth/two-factor';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * isAdmin 검증 미들웨어.
 * 실패 시 FORBIDDEN 에러 발생.
 */
const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!isAdminSession(ctx.session)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * 2FA 강제 미들웨어 — SPEC-ADMIN-001 Slice I (REQ-ADMIN-023) + SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * SiteSetting.requireAdminTwoFactor=true 이고 세션에 twoFactorVerified 플래그가
 * 없는 경우 FORBIDDEN 을 발생시킨다.
 * requireAdmin 이후에 체인되므로 ctx.session 은 보장됨.
 *
 * SPEC-ADMIN-EXTRAS-001: checkAdmin2FA() 사용하여 "need-enroll" vs "need-verify" 구분.
 * 에러 코드로 UNAUTHORIZED 사용하여 리다이렉트 가능하도록 함.
 *
 * NOTE: 실제 OTP 검증 UI(/login/two-factor)는 SPEC-AUTH-001 후속 슬라이스에서 구현.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-001~005
 */
const requireAdmin2FAIfEnabled = t.middleware(async ({ ctx, next }) => {
  const required = await isAdminTwoFactorRequired(ctx.prisma);
  if (required) {
    // siteId는 어떻게 가져올까? 현재 context에 siteId가 없음
    // 임시: 첫 요청에서 siteId를 가져오지 못하면 skip (실제 구현에서는 context에 siteId 추가 필요)
    const { checkAdmin2FA } = await import('@rhymix-ts/admin/security');
    const result = await checkAdmin2FA(ctx.session, ctx.prisma, 0); // siteId는 context에서 가져와야 함

    if (result === 'need-enroll') {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '2FA 등록이 필요합니다.',
        // 추가 metadata로 redirect URL 제공 가능
        // TODO: /admin/two-factor/enroll 로 리다이렉트
      });
    }

    if (result === 'need-verify') {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '2FA 인증이 필요합니다.',
        // TODO: /admin/two-factor/verify 로 리다이렉트
      });
    }
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
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-070, REQ-ADMIN-071
 * @MX:TODO: diff.input 의 민감 키(secret/key/token/password 패턴) 마스킹 — Slice E.
 */
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
            diff: { input: input ?? null, output: (result as any).data ?? null },
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
  const userId = ctx.session?.user?.id;
  if (typeof userId !== 'number' || !Number.isFinite(userId)) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
  }
  // ctx.session 을 non-nullable 로 narrowing
  return next({ ctx: { ...ctx, session: ctx.session! } });
});

/**
 * 일반 인증 프로시저.
 * content.document.create / update / delete / content.comment.create / delete 등에서 사용.
 */
export const protectedProcedure = publicProcedure.use(requireAuth);
