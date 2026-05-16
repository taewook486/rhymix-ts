/**
 * admin.log tRPC 라우터 — SPEC-ADMIN-001 Slice D.
 *
 * AdminLog 조회: actor / action / target / 기간 필터 + offset 페이지네이션.
 *
 * @MX:TODO: [AUTO] CSV 내보내기 — Slice E. /api/admin/logs/export.csv Route Handler.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 * @MX:PRIORITY: P2
 *
 * @MX:TODO: [AUTO] IP 필터 — Slice E.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 * @MX:PRIORITY: P2
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminLogRouter = router({
  /**
   * 감사 로그 목록 + 필터 + 페이지네이션 (REQ-ADMIN-072 부분).
   * CSV 내보내기 / IP 필터는 Slice E 이월.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        actorId: z.number().int().positive().optional(),
        action: z.string().optional(),   // 부분 일치 (contains)
        target: z.string().optional(),   // 부분 일치 (contains)
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.action ? { action: { contains: input.action } } : {}),
        ...(input.target ? { target: { contains: input.target } } : {}),
        ...(input.from || input.to
          ? {
              createdAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      };
      const [total, items] = await Promise.all([
        ctx.prisma.adminLog.count({ where }),
        ctx.prisma.adminLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
        }),
      ]);
      return { total, items, page: input.page, pageSize: input.pageSize };
    }),
});
