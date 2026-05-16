/**
 * admin.user tRPC 라우터 — SPEC-ADMIN-001 Slice E-5.
 *
 * 회원 관리: list / get / update / bulk / deniedList.*.
 *
 * @MX:ANCHOR: [AUTO] admin.user.update — changeUserStatus 위임 단일 진입점.
 * @MX:REASON: 권한 검증 + status 변경 + 세션 무효화 + AuditLog 가 packages/auth 의
 *             changeUserStatus 한 곳에서 처리된다. 우회 경로 방지를 위해 반드시
 *             이 프로시저를 거쳐야 한다.
 * @MX:SPEC: SPEC-ADMIN-001 US-7, REQ-AUTH-020
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import { changeUserStatus, softDeleteUser } from '@rhymix-ts/auth';

// UserStatus enum — Prisma schema 와 동기화
const UserStatusEnum = z.enum(['APPROVED', 'UNAUTHED', 'SUSPENDED', 'DENIED', 'DELETED']);

export const adminUserRouter = router({
  /**
   * 회원 목록 + 총 count (US-7, 페이지네이션).
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        q: z.string().optional(),
        status: UserStatusEnum.optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.q
          ? {
              OR: [
                { userId: { contains: input.q } },
                { emailAddress: { contains: input.q } },
                { nickName: { contains: input.q } },
              ],
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            nickName: true,
            emailAddress: true,
            status: true,
            isAdmin: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return { users, total };
    }),

  /**
   * 단일 회원 조회 (US-7).
   */
  get: protectedAdminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.prisma.user.findUnique({ where: { id: input.userId } }),
    ),

  /**
   * 회원 상태 변경 (US-7, REQ-AUTH-020).
   * changeUserStatus 에 위임하여 세션 무효화 + AuditLog 를 원자적으로 처리한다.
   */
  update: protectedAdminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        status: UserStatusEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);
      return changeUserStatus(
        {
          targetUserId: input.userId,
          newStatus: input.status as 'APPROVED' | 'SUSPENDED' | 'DENIED' | 'UNAUTHED',
          actorId,
        },
        { prisma: ctx.prisma },
      );
    }),

  /**
   * 회원 일괄 처리 (suspend / deny / approve / delete).
   */
  bulk: protectedAdminProcedure
    .input(
      z.object({
        ids: z.array(z.number().int().positive()).min(1).max(100),
        action: z.enum(['suspend', 'deny', 'approve', 'delete']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);
      const statusMap = {
        suspend: 'SUSPENDED',
        deny: 'DENIED',
        approve: 'APPROVED',
      } as const;

      const results = [];
      for (const id of input.ids) {
        if (input.action === 'delete') {
          results.push(
            await softDeleteUser({ targetUserId: id, actorId }, { prisma: ctx.prisma }),
          );
        } else {
          results.push(
            await changeUserStatus(
              {
                targetUserId: id,
                newStatus: statusMap[input.action],
                actorId,
              },
              { prisma: ctx.prisma },
            ),
          );
        }
      }

      return { processed: results.length };
    }),

  deniedList: router({
    /**
     * DeniedIdentifier 목록 조회.
     */
    list: protectedAdminProcedure
      .input(z.object({ type: z.string().optional() }))
      .query(({ ctx, input }) =>
        ctx.prisma.deniedIdentifier.findMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: input.type ? { kind: input.type as any } : undefined,
          orderBy: { id: 'desc' },
        }),
      ),

    /**
     * DeniedIdentifier 추가 (USER_ID, NICK_NAME).
     */
    add: protectedAdminProcedure
      .input(
        z.object({
          type: z.enum(['USER_ID', 'NICK_NAME']),
          pattern: z.string().min(1),
        }),
      )
      .mutation(({ ctx, input }) =>
        ctx.prisma.deniedIdentifier.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { kind: input.type as any, pattern: input.pattern },
        }),
      ),

    /**
     * DeniedIdentifier 삭제.
     */
    remove: protectedAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.deniedIdentifier.delete({ where: { id: input.id } }),
      ),
  }),
});
