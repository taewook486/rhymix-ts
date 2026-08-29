/**
 * admin.user tRPC 라우터 — SPEC-ADMIN-001 Slice E-5.
 *                     SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-044, REQ-ADMIN2-045).
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-152).
 *                     SPEC-ADMIN-002 Slice 3B (REQ-ADMIN2-056, REQ-ADMIN2-057).
 *
 * 회원 관리: list / get / update / bulk / create(직접 등록) / updateNickname /
 *           nicknameLog.list / deniedList.*.
 *
 * @MX:ANCHOR: [AUTO] admin.user.update — changeUserStatus 위임 단일 진입점.
 * @MX:REASON: 권한 검증 + status 변경 + 세션 무효화 + AuditLog 가 packages/auth 의
 *             changeUserStatus 한 곳에서 처리된다. 우회 경로 방지를 위해 반드시
 *             이 프로시저를 거쳐야 한다.
 * @MX:SPEC: SPEC-ADMIN-001 US-7, REQ-AUTH-020, SPEC-ADMIN-002 REQ-ADMIN2-152,
 *           REQ-ADMIN2-056, REQ-ADMIN2-057
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { router, protectedAdminProcedure } from '../../trpc';
import { changeUserStatus, softDeleteUser, validateNickname } from '@rhymix-ts/auth';
import { hashPassword } from '@rhymix-ts/auth';

// UserStatus enum — Prisma schema 와 동기화
const UserStatusEnum = z.enum(['APPROVED', 'UNAUTHED', 'SUSPENDED', 'DENIED', 'DELETED']);

/**
 * SPEC-MEMBER-PARITY-001: lastLoginAt 검색어를 UTC 하루 범위(gte/lt)로 변환한다.
 *
 * lastLoginAt은 DateTime? 컬럼이라 Prisma DateTime 필터가 contains를 지원하지
 * 않는다(PrismaClientValidationError → admin.user.list 500 크래시). 날짜로
 * 파싱할 수 없는 입력이면 null을 반환한다.
 */
function parseSearchDayRange(searchQuery: string): { gte: Date; lt: Date } | null {
  const parsed = new Date(searchQuery.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  const gte = new Date(parsed);
  gte.setUTCHours(0, 0, 0, 0);
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

/**
 * SPEC-MEMBER-ADMIN-001 REQ-MADM-020~023: "기본 설정" 탭에서 저장한 닉네임 변경
 * 정책을 조회한다. `admin.settings.ts`의 getSiteSetting과 동일한 패턴이지만
 * 라우터 내부 헬퍼가 export되어 있지 않아 이 파일에서 최소한으로 재구현한다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getNicknameChangeSettings(ctx: { prisma: Prisma.TransactionClient }) {
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  const siteId = site?.id ?? 1;

  const readValue = async (key: string) => {
    const setting = await ctx.prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId, key } },
    });
    return setting ? setting.value : undefined;
  };

  const [changeAllowed, saveChangeLog, allowSpecialChars, allowedSpecialChars, allowSpacing] =
    await Promise.all([
      readValue('member.nickname.changeAllowed'),
      readValue('member.nickname.saveChangeLog'),
      readValue('member.nickname.allowSpecialChars'),
      readValue('member.nickname.allowedSpecialChars'),
      readValue('member.nickname.allowSpacing'),
    ]);

  return {
    changeAllowed: (changeAllowed as boolean | undefined) ?? true,
    saveChangeLog: (saveChangeLog as boolean | undefined) ?? true,
    nicknamePolicy: {
      allowSpecialChars: (allowSpecialChars as boolean | undefined) ?? false,
      allowedSpecialChars: (allowedSpecialChars as string | undefined) ?? '',
      allowSpacing: (allowSpacing as boolean | undefined) ?? false,
    },
  };
}

export const adminUserRouter = router({
  /**
   * 회원 목록 + 총 count (US-7, 페이지네이션).
   *
   * REQ-ADMIN2-152: filterAdmin 파라미터로 최고관리자 필터링 지원.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        searchTarget: z.enum(['userId', 'emailAddress', 'nickName', 'phoneNumber', 'lastLoginAt', 'description']).optional(),
        searchQuery: z.string().optional(),
        status: UserStatusEnum.optional(),
        filterAdmin: z.boolean().optional(),
        sortBy: z.enum(['userId', 'emailAddress', 'nickName', 'createdAt', 'lastLoginAt']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        groupId: z.number().int().positive().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // SPEC-MEMBER-PARITY-001: lastLoginAt(DateTime?)은 문자열 contains 필터를
      // 지원하지 않으므로 날짜 파싱 후 하루 범위(gte/lt) 필터로 분기한다.
      // 나머지 5개 문자열 필드는 기존 contains 로직을 유지한다.
      let searchWhere: Record<string, unknown> = {};
      if (input.searchQuery && input.searchTarget) {
        if (input.searchTarget === 'lastLoginAt') {
          const range = parseSearchDayRange(input.searchQuery);
          if (!range) {
            // 날짜로 파싱할 수 없는 검색어는 어떤 lastLoginAt과도 매칭될 수
            // 없다 — 크래시 대신 빈 결과를 반환한다(쿼리 생략).
            return { users: [], total: 0 };
          }
          searchWhere = { lastLoginAt: { gte: range.gte, lt: range.lt } };
        } else {
          searchWhere = {
            [input.searchTarget]: { contains: input.searchQuery, mode: 'insensitive' },
          };
        }
      }

      const where = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.filterAdmin ? { isAdmin: true } : {}),
        ...(input.groupId ? { memberGroups: { some: { groupId: input.groupId } } } : {}),
        ...searchWhere,
      };

      // 정렬: sortBy가 없으면 createdAt 내림차순(기존 동작 유지)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderBy: any = input.sortBy
        ? { [input.sortBy]: input.sortOrder || 'asc' }
        : { createdAt: 'desc' };

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy,
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

  /**
   * 닉네임 변경 (REQ-ADMIN2-057, SPEC-MEMBER-ADMIN-001 REQ-MADM-020~023).
   *
   * User.nickName 변경과 NicknameChangeLog 기록을 하나의 트랜잭션으로 처리한다.
   * AdminLog는 auditLogger 미들웨어(트랜스포트 trpc.ts)가 모든 admin mutation 에 대해
   * 자동으로 기록하므로 여기서 중복 기록하지 않는다 (admin.user.create 와 동일 패턴).
   *
   * REQ-MADM-021: 닉네임 변경 허용이 꺼져 있으면(관리자 편집 경로 포함) 거부한다.
   * REQ-MADM-022: 기록 저장이 꺼져 있으면 NicknameChangeLog 행을 생성하지 않는다.
   * REQ-MADM-023: 특수문자/띄어쓰기 정책을 signup()과 동일한 validateNickname()으로 검증한다.
   *
   * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-056, REQ-ADMIN2-057,
   *           SPEC-MEMBER-ADMIN-001 REQ-MADM-020, REQ-MADM-021, REQ-MADM-022, REQ-MADM-023
   */
  updateNickname: protectedAdminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        newNickName: z.string().min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);
      const settings = await getNicknameChangeSettings(ctx);

      // REQ-MADM-021: 닉네임 변경 허용 여부가 거짓이면(관리자 편집 경로 포함) 거부한다.
      if (!settings.changeAllowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '현재 닉네임 변경이 허용되지 않습니다.',
        });
      }

      const existing = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, nickName: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '회원을 찾을 수 없습니다.' });
      }

      if (existing.nickName === input.newNickName) {
        // 변경 사항이 없으면 이력을 남기지 않고 현재 값을 그대로 반환한다.
        return { id: existing.id, nickName: existing.nickName };
      }

      // REQ-MADM-023: 닉네임 특수문자/띄어쓰기 검증(가입 경로와 동일한 정책/함수 재사용).
      if (!validateNickname(input.newNickName, settings.nicknamePolicy)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '허용되지 않는 문자가 포함된 닉네임입니다.',
        });
      }

      try {
        const result = await ctx.prisma.$transaction(async (tx) => {
          const updated = await tx.user.update({
            where: { id: input.userId },
            data: { nickName: input.newNickName },
            select: { id: true, nickName: true },
          });

          // REQ-MADM-022: 기록 저장이 꺼져 있으면 NicknameChangeLog 행을 생성하지 않는다.
          if (settings.saveChangeLog) {
            await tx.nicknameChangeLog.create({
              data: {
                userId: input.userId,
                oldNickName: existing.nickName,
                newNickName: input.newNickName,
                changedByAdminId: actorId,
              },
            });
          }

          return updated;
        });

        return result;
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.code === 'P2002') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '이미 사용 중인 닉네임입니다.',
          });
        }
        throw err;
      }
    }),

  /**
   * 닉네임 변경 이력 조회 (REQ-ADMIN2-056).
   *
   * admin.log.list 와 동일한 { total, items, page, pageSize } 페이지네이션 형태를 따른다.
   */
  nicknameLog: router({
    list: protectedAdminProcedure
      .input(
        z.object({
          userId: z.number().int().positive().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(200).default(50),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where = input.userId ? { userId: input.userId } : {};

        const [total, items] = await Promise.all([
          ctx.prisma.nicknameChangeLog.count({ where }),
          ctx.prisma.nicknameChangeLog.findMany({
            where,
            orderBy: { changedAt: 'desc' },
            take: input.pageSize,
            skip: (input.page - 1) * input.pageSize,
            include: {
              user: { select: { id: true, userId: true, nickName: true } },
            },
          }),
        ]);

        return { total, items, page: input.page, pageSize: input.pageSize };
      }),
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
     *
     * REQ-MADM-006: 이미 존재하는 (kind, pattern) 조합을 다시 등록하려는 요청은
     * 위반된 필드(kind, pattern)와 기존 등록된 값을 오류 메시지에 명시하여 거부한다.
     * 어떤 행도 부분 반영되지 않는다(Prisma unique 제약이 원자적으로 보장).
     */
    add: protectedAdminProcedure
      .input(
        z.object({
          type: z.enum(['USER_ID', 'NICK_NAME']),
          pattern: z.string().min(1, '패턴을 입력하세요.'),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await ctx.prisma.deniedIdentifier.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { kind: input.type as any, pattern: input.pattern },
          });
        } catch (err) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((err as any)?.code === 'P2002') {
            const existing = await ctx.prisma.deniedIdentifier.findFirst({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              where: { kind: input.type as any, pattern: input.pattern },
            });
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `이미 등록된 조합입니다. kind=${input.type}, pattern=${input.pattern}${
                existing ? ` (기존 등록값: kind=${existing.kind}, pattern=${existing.pattern})` : ''
              }`,
            });
          }
          throw err;
        }
      }),

    /**
     * DeniedIdentifier 삭제.
     */
    remove: protectedAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.deniedIdentifier.delete({ where: { id: input.id } }),
      ),
  }),

  /**
   * SPEC-MEMBER-ADMIN-001 Slice E: 이메일 호스트 관리 (REQ-MADM-028~035).
   */
  emailHost: router({
    /**
     * ManagedEmailHost 목록 조회 (REQ-MADM-029).
     */
    list: protectedAdminProcedure
      .input(z.object({ policy: z.enum(['ALLOW', 'DENY']).optional() }))
      .query(({ ctx, input }) =>
        ctx.prisma.managedEmailHost.findMany({
          where: input.policy ? { policy: input.policy } : undefined,
          orderBy: { id: 'desc' },
        }),
      ),

    /**
     * ManagedEmailHost 추가 (REQ-MADM-030).
     *
     * REQ-MADM-031: 이미 존재하는 (siteId, host, policy) 조합을 다시 등록하려는 요청은
     * 위반된 필드(host, policy)와 기존 등록된 값을 오류 메시지에 명시하여 거부한다.
     * 어떤 행도 부분 반영되지 않는다(Prisma unique 제약이 원자적으로 보장).
     */
    add: protectedAdminProcedure
      .input(
        z.object({
          host: z.string().min(1, '호스트를 입력하세요.').max(254, '호스트는 254자 이하여야 합니다.'),
          policy: z.enum(['ALLOW', 'DENY']),
          reason: z.string().max(500, '사유는 500자 이하여야 합니다.').optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await ctx.prisma.managedEmailHost.create({
            data: {
              host: input.host,
              policy: input.policy,
              reason: input.reason,
            },
          });
        } catch (err) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((err as any)?.code === 'P2002') {
            const existing = await ctx.prisma.managedEmailHost.findFirst({
              where: { host: input.host, policy: input.policy },
            });
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `이미 등록된 조합입니다. host=${input.host}, policy=${input.policy}${
                existing ? ` (기존 등록값: host=${existing.host}, policy=${existing.policy})` : ''
              }`,
            });
          }
          throw err;
        }
      }),

    /**
     * ManagedEmailHost 삭제 (REQ-MADM-031).
     */
    remove: protectedAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.managedEmailHost.delete({ where: { id: input.id } }),
      ),
  }),
});
