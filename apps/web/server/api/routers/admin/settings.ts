/**
 * admin.settings tRPC 라우터 — SPEC-ADMIN-002 Slice 1D + Slice 1F
 *
 * Admin settings management:
 * - member: 가입/로그인/약관 설정 (Slice 1D)
 * - notification: Email sender + SMTP settings (Slice 1F)
 * - security: Password policy, session, login lockout (Slice 1F)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getSecuritySettings,
  updateSecuritySettings,
  SiteNotFoundError,
} from '@rhymix-ts/admin';

// ---------------------------------------------------------------------------
// Member Settings Schemas (Slice 1D)
// ---------------------------------------------------------------------------

const SignupSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
  requireAdminApproval: z.boolean().default(false),
  defaultGroupId: z.number().int().positive().optional(),
  allowDuplicateNickname: z.boolean().default(false),
});

const LoginSettingsSchema = z.object({
  allowAutoLogin: z.boolean().default(true),
  autoLoginDuration: z.number().int().positive().default(30), // days
  maxFailedAttempts: z.number().int().positive().default(5),
  redirectAfterLogin: z.enum(['homepage', 'last_page', 'dashboard']).default('last_page'),
});

const AgreementSettingsSchema = z.object({
  terms: z.string().optional(),
  privacy: z.string().optional(),
  termsRequired: z.boolean().default(true),
  privacyRequired: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Helper functions (Slice 1D)
// ---------------------------------------------------------------------------

/**
 * ctx.siteId가 없을 때(hostname→domain 재해석 실패 등) 첫 번째 Site로 대체 해석한다.
 * packages/admin/src/settings.ts의 동일 패턴과 일치시킨다.
 */
async function resolveSiteId(ctx: { prisma: any; siteId?: number }): Promise<number> {
  if (ctx.siteId !== undefined) {
    return ctx.siteId;
  }
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new SiteNotFoundError();
  }
  return site.id;
}

/**
 * SiteSetting에서 값을 가져옴. 없으면 기본값 반환.
 */
async function getSiteSetting(
  ctx: { prisma: any; siteId?: number },
  key: string,
  defaultValue: any = null,
): Promise<any> {
  const siteId = await resolveSiteId(ctx);
  const setting = await ctx.prisma.siteSetting.findUnique({
    where: {
      siteId_key: {
        siteId,
        key,
      },
    },
  });

  return setting ? setting.value : defaultValue;
}

/**
 * SiteSetting에 값을 저장. AdminLog 기록.
 *
 * `ctx.prisma`로 Prisma 트랜잭션 클라이언트(tx)를 전달하면 호출자가 여러 키를
 * 하나의 트랜잭션으로 묶어 원자적으로 적용할 수 있다 (REQ-ADMIN2-110/113/114).
 */
async function setSiteSetting(
  ctx: { prisma: any; siteId?: number; ip?: string; userAgent?: string },
  key: string,
  value: any,
  actorId: number,
): Promise<void> {
  const siteId = await resolveSiteId(ctx);
  const before = await getSiteSetting(ctx, key);

  await ctx.prisma.siteSetting.upsert({
    where: {
      siteId_key: {
        siteId,
        key,
      },
    },
    create: {
      siteId,
      key,
      value,
    },
    update: {
      value,
    },
  });

  // AdminLog 기록
  await ctx.prisma.adminLog.create({
    data: {
      actorId,
      action: 'configure',
      target: `site_setting:${key}`,
      diff: { before, after: value },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
}

export const adminSettingsRouter = router({
  // ==========================================================================
  // Member Settings (Slice 1D - REQ-ADMIN2-047~048, 050)
  // ==========================================================================

  /**
   * 가입 설정 조회 (REQ-ADMIN2-047).
   */
  getSignup: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const settings = {
        enabled: await getSiteSetting(ctx, 'member.signup.enabled', false),
        requireEmailVerification: await getSiteSetting(
          ctx,
          'member.signup.requireEmailVerification',
          true,
        ),
        requireAdminApproval: await getSiteSetting(
          ctx,
          'member.signup.requireAdminApproval',
          false,
        ),
        defaultGroupId: await getSiteSetting(
          ctx,
          'member.signup.defaultGroupId',
          null,
        ),
        allowDuplicateNickname: await getSiteSetting(
          ctx,
          'member.signup.allowDuplicateNickname',
          false,
        ),
      };

      return SignupSettingsSchema.parse(settings);
    }),

  /**
   * 가입 설정 업데이트 (REQ-ADMIN2-047).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   * 중간에 실패하면 전체가 롤백되어 부분 적용 + 감사 로그 누락을 방지한다.
   */
  updateSignup: protectedAdminProcedure
    .input(SignupSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(
          txCtx,
          'member.signup.enabled',
          input.enabled,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.signup.requireEmailVerification',
          input.requireEmailVerification,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.signup.requireAdminApproval',
          input.requireAdminApproval,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.signup.defaultGroupId',
          input.defaultGroupId ?? null,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.signup.allowDuplicateNickname',
          input.allowDuplicateNickname,
          actorId,
        );
      });

      return { success: true };
    }),

  /**
   * 로그인 설정 조회 (REQ-ADMIN2-048).
   */
  getLogin: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const settings = {
        allowAutoLogin: await getSiteSetting(
          ctx,
          'member.login.allowAutoLogin',
          true,
        ),
        autoLoginDuration: await getSiteSetting(
          ctx,
          'member.login.autoLoginDuration',
          30,
        ),
        maxFailedAttempts: await getSiteSetting(
          ctx,
          'member.login.maxFailedAttempts',
          5,
        ),
        redirectAfterLogin: await getSiteSetting(
          ctx,
          'member.login.redirectAfterLogin',
          'last_page',
        ),
      };

      return LoginSettingsSchema.parse(settings);
    }),

  /**
   * 로그인 설정 업데이트 (REQ-ADMIN2-048).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   */
  updateLogin: protectedAdminProcedure
    .input(LoginSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(
          txCtx,
          'member.login.allowAutoLogin',
          input.allowAutoLogin,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.login.autoLoginDuration',
          input.autoLoginDuration,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.login.maxFailedAttempts',
          input.maxFailedAttempts,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.login.redirectAfterLogin',
          input.redirectAfterLogin,
          actorId,
        );
      });

      return { success: true };
    }),

  /**
   * 약관 설정 조회 (REQ-ADMIN2-050).
   */
  getAgreement: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const settings = {
        terms: await getSiteSetting(ctx, 'member.agreement.terms', ''),
        privacy: await getSiteSetting(ctx, 'member.agreement.privacy', ''),
        termsRequired: await getSiteSetting(
          ctx,
          'member.agreement.termsRequired',
          true,
        ),
        privacyRequired: await getSiteSetting(
          ctx,
          'member.agreement.privacyRequired',
          true,
        ),
      };

      return AgreementSettingsSchema.parse(settings);
    }),

  /**
   * 약관 설정 업데이트 (REQ-ADMIN2-050).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   */
  updateAgreement: protectedAdminProcedure
    .input(AgreementSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(
          txCtx,
          'member.agreement.terms',
          input.terms ?? '',
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.agreement.privacy',
          input.privacy ?? '',
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.agreement.termsRequired',
          input.termsRequired,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.agreement.privacyRequired',
          input.privacyRequired,
          actorId,
        );
      });

      return { success: true };
    }),

  // ==========================================================================
  // Notification Settings (Slice 1F)
  // ==========================================================================

  /**
   * 알림 설정 조회.
   */
  getNotification: protectedAdminProcedure.query(async ({ ctx }) =>
    getNotificationSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 알림 설정 업데이트.
   */
  updateNotification: protectedAdminProcedure
    .input(
      z.object({
        senderName: z.string().min(1).max(100),
        senderEmail: z.string().email(),
        smtpHost: z.string().min(1).optional(),
        smtpPort: z.number().int().min(1).max(65535).optional(),
        smtpSecure: z.boolean().optional(),
        smtpUser: z.string().optional(),
        smtpPassword: z.string().optional(),
        smtpFrom: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      updateNotificationSettings(input, { prisma: ctx.prisma }),
    ),

  // ==========================================================================
  // Security Settings (Slice 1F)
  // ==========================================================================

  /**
   * 보안 설정 조회.
   */
  getSecurity: protectedAdminProcedure.query(async ({ ctx }) =>
    getSecuritySettings({ prisma: ctx.prisma }),
  ),

  /**
   * 보안 설정 업데이트.
   */
  updateSecurity: protectedAdminProcedure
    .input(
      z.object({
        passwordMinLength: z.number().int().min(4).max(50),
        passwordRequireComplex: z.boolean().default(false),
        sessionLifetime: z.number().int().min(60).max(31536000),
        loginMaxAttempts: z.number().int().min(1).max(10),
        loginLockoutTime: z.number().int().min(60).max(86400),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateSecuritySettings(input, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof SiteNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
        }
        throw err;
      }
    }),
});
