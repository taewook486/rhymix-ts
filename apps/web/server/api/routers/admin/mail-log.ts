/**
 * admin.mailLog tRPC 라우터 — SPEC-CONTENT-PARITY-001 M7
 *
 * 메일 발송 내역 조회 기능:
 * - list: 관리자용 메일 발송 내역 목록 (REQ-CPAR-016)
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-016
 */

import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import { MailLogStatus } from '@rhymix-ts/db';

export const adminMailLogRouter = router({
  /**
   * 메일 발송 내역 목록 조회
   * - REQ-CPAR-016: 수신자, 제목, 상태, 에러 메시지, 발송 시간
   * - cursor pagination (listFiles pattern 재사용)
   * - status 필터 (SENT | FAILED)
   */
  list: protectedAdminProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      status: z.enum(['SENT', 'FAILED', 'ALL']).optional(),
      sortBy: z.enum(['createdAt']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 20;
      const prisma = ctx.prisma;

      // cursor 디코딩
      let cursorId: number | undefined;
      if (input.cursor) {
        const buffer = Buffer.from(input.cursor, 'base64');
        cursorId = parseInt(buffer.toString('utf-8'), 10);
      }

      // 조회 조건
      const where: Record<string, unknown> = {};
      if (input.status && input.status !== 'ALL') {
        where.status = input.status;
      }

      // totalCount 조회 (pagination 메타데이터용)
      const totalCount = await prisma.mailLog.count({ where });

      // cursor pagination
      const items = await prisma.mailLog.findMany({
        where,
        orderBy: { createdAt: input.sortOrder === 'asc' ? 'asc' : 'desc' },
        take: limit + 1, // nextCursor 확인용 +1
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });

      // nextCursor 계산
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const nextItem = items[limit]; // 마지막 아이템
        if (nextItem) {
          items.pop(); // limit 개만 반환
          nextCursor = Buffer.from(nextItem.id.toString()).toString('base64');
        }
      }

      return { items, nextCursor, totalCount };
    }),
});
