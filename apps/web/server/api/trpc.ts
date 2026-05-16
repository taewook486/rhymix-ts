/**
 * tRPC 초기화 — SPEC-ADMIN-001 Slice B.
 *
 * publicProcedure: 인증 없이 호출 가능.
 * protectedAdminProcedure: isAdminSession() 통과 후에만 호출 가능.
 *
 * @MX:ANCHOR: [AUTO] 모든 admin.* 프로시저의 권한 게이트 — protectedAdminProcedure.
 * @MX:REASON: 어떤 admin.* 프로시저도 이 procedure builder 를 사용하지 않으면
 *             isAdmin 검사를 생략한 채 노출됨. fan_in 은 즉시 4+ 이며 Slice C 에서 증가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020, REQ-ADMIN-021
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * isAdmin 검증 미들웨어.
 * 실패 시 FORBIDDEN 에러 발생.
 * TODO (Slice C site-settings): requireAdmin2FAIfEnabled 추가.
 * TODO (Slice C admin-log): auditLogger 미들웨어 추가.
 */
const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!isAdminSession(ctx.session)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const protectedAdminProcedure = publicProcedure.use(requireAdmin);
