/**
 * admin-utils tRPC Router — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * Admin utilities router.
 * Exports adminUtilsRouter for orchestrator wiring.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-150, REQ-ADMIN2-151
 */
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  invalidateAdminMenuCache,
  purgeExpiredSessions,
} from '@rhymix-ts/admin';

/**
 * adminUtilsRouter — Global admin utilities.
 *
 * Provides:
 * - invalidateMenuCache: Invalidate cached admin menu (REQ-ADMIN2-150)
 * - purgeExpiredSessions: Purge expired sessions (REQ-ADMIN2-151)
 *
 * All mutations automatically write AdminLog entries via auditLogger middleware.
 *
 * REQ-ADMIN2-150: WHEN admin triggers "관리자 메뉴 초기화" from the admin layout
 * global footer, the system SHALL invalidate the cached admin menu/navigation structure.
 *
 * REQ-ADMIN2-151: WHEN admin triggers "세션 정리" from the admin layout global footer,
 * the system SHALL purge expired sessions in a bounded batch operation WITHOUT terminating
 * the current administrator's active session.
 */
export const adminUtilsRouter = router({
  invalidateMenuCache: protectedAdminProcedure.mutation(async ({ ctx }) => {
    const result = await invalidateAdminMenuCache(ctx);
    // packages/admin is a pure logic package — it returns the path to
    // revalidate, and this Next.js-aware caller invokes revalidatePath().
    revalidatePath(result.path);
    return result;
  }),

  purgeExpiredSessions: protectedAdminProcedure
    .input(
      z.object({
        batchSize: z.number().int().positive().optional().default(500),
        // currentSessionToken is extracted from ctx.session in the resolver
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Extract current session token from context to exclude it from purge
      // NextAuth stores session token in session.user or we can use a session identifier
      const currentSessionToken = ctx.session?.user?.id
        ? `user-${ctx.session.user.id}`
        : undefined;

      return purgeExpiredSessions(ctx, {
        batchSize: input.batchSize,
        currentSessionToken,
      });
    }),
});
