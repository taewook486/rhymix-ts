/**
 * security-ip tRPC Router — SPEC-ADMIN-002 Slice 2G (REQ-ADMIN2-115)
 *
 * Admin-area IP access control router.
 * Exports adminSecurityIpRouter for orchestrator wiring.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-115
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  getIpControlSettings,
  updateIpControlSettings,
  type IpControlSettings,
} from '@rhymix-ts/admin';

/**
 * adminSecurityIpRouter — IP access control for admin area.
 *
 * Provides:
 * - getSettings: Query current IP allow/deny lists
 * - updateSettings: Update IP allow/deny lists
 *
 * All mutations automatically write AdminLog entries via auditLogger middleware.
 */
export const adminSecurityIpRouter = router({
  getSettings: protectedAdminProcedure.query(async ({ ctx }) => {
    return getIpControlSettings(ctx);
  }),

  updateSettings: protectedAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        allowList: z.array(z.string()).default([]),
        denyList: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings: IpControlSettings = {
        enabled: input.enabled,
        allowList: input.allowList,
        denyList: input.denyList,
      };

      return updateIpControlSettings(settings, ctx);
    }),
});
