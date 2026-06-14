/**
 * admin.import tRPC 라우터 — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * import bundle dryRun + apply.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-IMPORT-001~012
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  dryRun,
  applyImport,
  type ImportDecisions,
  type DryRunResult,
  type ApplyResult,
} from '@rhymix-ts/admin/import';
import { adminExportBundleSchema } from '@rhymix-ts/admin/export';

/**
 * importMaxBytes — 최대 import bundle 크기 (100MiB)
 */
const importMaxBytes = 100 * 1024 * 1024;

/**
 * bundleInputSchema — bundle JSON input 스키마
 */
const bundleInputSchema = z.object({
  bundle: z.unknown(), // JSON 파싱된 객체
  siteId: z.number().int().positive(),
});

/**
 * decisionsSchema — import decisions 스키마
 */
const decisionsSchema = z.record(
  z.enum(['overwrite', 'skipConflict', 'abort']),
);

export const adminImportRouter = router({
  /**
   * dryRun — bundle 검증 + import plan 생성 (REQ-IMPORT-001).
   */
  dryRun: protectedAdminProcedure
    .input(
      bundleInputSchema.extend({
        bundleSize: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 사이즈 체크
      if (input.bundleSize && input.bundleSize > importMaxBytes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Bundle size exceeds maximum of ${importMaxBytes} bytes`,
        });
      }

      // bundle 스키마 검증 + dryRun 실행
      const result = await dryRun(ctx.prisma, input.bundle, input.siteId);

      return result;
    }),

  /**
   * applyImport — import 적용 (REQ-IMPORT-007).
   */
  applyImport: protectedAdminProcedure
    .input(
      bundleInputSchema.extend({
        decisions: decisionsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 사이즈 체크
      const bundleStr = JSON.stringify(input.bundle);
      const bundleSize = Buffer.byteLength(bundleStr, 'utf8');
      if (bundleSize > importMaxBytes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Bundle size exceeds maximum of ${importMaxBytes} bytes`,
        });
      }

      // bundle 스키마 검증
      const validationResult = adminExportBundleSchema.safeParse(
        input.bundle,
      );
      if (!validationResult.success) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: `Invalid bundle format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
        });
      }

      const validatedBundle = validationResult.data;

      // apply 실행
      const result = await applyImport(
        ctx.prisma,
        validatedBundle,
        input.siteId,
        input.decisions as ImportDecisions,
      );

      if (result.success) {
        // AdminLog 기록 (action: import.apply)
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'import.apply',
            target: `site:${input.siteId}`,
            diff: {
              applied: result.applied,
              skipped: result.skipped,
              errors: result.errors,
            },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });
      } else {
        // 실패 시 AdminLog 기록 (action: import.failed)
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'import.failed',
            target: `site:${input.siteId}`,
            diff: {
              errors: result.errors,
            },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });
      }

      return result;
    }),
});
