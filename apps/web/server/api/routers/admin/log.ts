/**
 * admin.log tRPC 라우터 — SPEC-ADMIN-001 Slice D + Slice I.
 *
 * AdminLog 조회: actor / action / target / ip / 기간 필터 + offset 페이지네이션.
 *
 * Slice I (REQ-ADMIN-072 IP): ip 필터 추가.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminLogRouter = router({
  /**
   * 감사 로그 목록 + 필터 + 페이지네이션 (REQ-ADMIN-072).
   * ip: 부분 일치 필터 추가됨 (Slice I).
   *
   * SPEC-ADMIN-EXTRAS-001 Slice B: IP filter 추가 (parseIpFilter, CIDR matching).
   *
   * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-LOG-001~003
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        actorId: z.number().int().positive().optional(),
        action: z.string().optional(), // 부분 일치 (contains)
        target: z.string().optional(), // 부분 일치 (contains)
        ip: z.string().optional(), // IP 필터 (exact, CIDR) — SPEC-ADMIN-EXTRAS-001
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // IP 필터 처리: 유효한 IP/CIDR이면 DB 쿼리 후 앱 레벨 필터링,
      // 그 외 문자열이면 DB contains 필터 사용
      let dbIpFilter: { contains: string } | undefined;
      let appIpFilter: string | undefined;

      if (input.ip) {
        const { parseIpFilter } = await import('@rhymix-ts/admin/logs');
        const parsed = parseIpFilter(input.ip);

        if ('error' in parsed) {
          // 유효한 IP/CIDR이 아니면 DB-level 부분 일치
          dbIpFilter = { contains: input.ip };
        } else {
          // 유효한 IP/CIDR → 앱 레벨 필터링 (CIDR 지원)
          appIpFilter = input.ip;
        }
      }

      const where = {
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.action ? { action: { contains: input.action } } : {}),
        ...(input.target ? { target: { contains: input.target } } : {}),
        ...(dbIpFilter ? { ip: dbIpFilter } : {}),
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

      // CIDR 기반 앱 레벨 IP 필터링
      let filteredItems = items;
      if (appIpFilter) {
        const { parseIpFilter, matchesIpFilter } = await import('@rhymix-ts/admin/logs');
        const parsed = parseIpFilter(appIpFilter);
        if (!('error' in parsed)) {
          filteredItems = items.filter((item) => item.ip && matchesIpFilter(item.ip, parsed));
        }
      }

      return {
        total: appIpFilter ? filteredItems.length : total,
        items: filteredItems,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),
});
