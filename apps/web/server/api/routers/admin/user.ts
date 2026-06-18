/**
 * admin.user tRPC 라우터 — SPEC-ADMIN-001 Slice E-5.
 *                     SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-044, REQ-ADMIN2-045).
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-152).
 *
 * 회원 관리: list / get / update / bulk / create(직접 등록) / deniedList.*.
 *
 * @MX:ANCHOR: [AUTO] admin.user.update — changeUserStatus 위임 단일 진입점.
 * @MX:REASON: 권한 검증 + status 변경 + 세션 무효화 + AuditLog 가 packages/auth 의
 *             changeUserStatus 한 곳에서 처리된다. 우회 경로 방지를 위해 반드시
 *             이 프로시저를 거쳐야 한다.
 * @MX:SPEC: SPEC-ADMIN-001 US-7, REQ-AUTH-020, SPEC-ADMIN-002 REQ-ADMIN2-152
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import { changeUserStatus, softDeleteUser } from '@rhymix-ts/auth';
import { hashPassword } from '@rhymix-ts/auth';

// UserStatus enum — Prisma schema 와 동기화
const UserStatusEnum = z.enum(['APPROVED', 'UNAUTHED', 'SUSPENDED', 'DENIED', 'DELETED']);

export const adminUserRouter = router({
  /**
   * 회원 목록 + 총 count (US-7, 페이지네이션).
   *
   * REQ-ADMIN2-152: filterAdmin 파라미터로 최고관리자 필터링 지원.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        q: z.string().optional(),
        status: UserStatusEnum.optional(),
        filterAdmin: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.filterAdmin ? { isAdmin: true } : {}),
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
   * 회원 직접 등록 (REQ-ADMIN2-044).
   * 이메일 인증 우회, 비밀번호 해싱, 그룹 배정.
   * 비밀번호는 평문으로 저장되거나 로깅되지 않음 (REQ-ADMIN2-045).
   */
  create: protectedAdminProcedure
    .input(
      z.object({
        userId: z.string().min(1).max(80),
        emailAddress: z.string().email(),
        password: z.string().min(8).max(100),
        nickName: z.string().min(1).max(40),
        groupId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 비밀번호 해싱 (REQ-ADMIN2-045: 평문 비밀번호는 로그하지 않음)
      const passwordHash = await hashPassword(input.password);

      // 그룹 지정 없으면 기본 그룹 찾기
      let targetGroupId = input.groupId;
      if (!targetGroupId) {
        const defaultGroup = await ctx.prisma.memberGroup.findFirst({
          where: { isDefault: true },
        });
        targetGroupId = defaultGroup?.id;
      }

      // 회원 생성 (status: 'APPROVED'로 이메일 인증 절차를 우회한다 — User 모델에는
      // 별도의 emailVerifiedAt 컬럼이 없다)
      const user = await ctx.prisma.user.create({
        data: {
          userId: input.userId,
          emailAddress: input.emailAddress,
          passwordHash,
          nickName: input.nickName,
          status: 'APPROVED', // 관리자 직접 등록은 즉시 승인
        },
      });

      // 그룹 배정
      if (targetGroupId) {
        await ctx.prisma.memberGroupMember.create({
          data: {
            groupId: targetGroupId,
            userId: user.id,
          },
        });
      }

      // AdminLog는 auditLogger 미들웨어(트랜스포트 trpc.ts)가 자동으로 기록하며
      // 민감 키(password 등)는 거기서 일괄 마스킹한다 (REQ-ADMIN2-045) — 여기서 중복 기록하지 않는다.

      return {
        user: {
          id: user.id,
          userId: user.userId,
          emailAddress: user.emailAddress,
          nickName: user.nickName,
          status: user.status,
        },
        groupId: targetGroupId,
      };
    }),

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
