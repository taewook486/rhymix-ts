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
  getDesignSettings,
  updateDesignSettings,
  SiteNotFoundError,
  getEmailQueueSettings,
  updateEmailQueueSettings,
  getSeoSettings,
  updateSeoSettings,
  getAdvancedRoutingSettings,
  updateAdvancedRoutingSettings,
  getAdvancedLocalizationSettings,
  updateAdvancedLocalizationSettings,
  getAdvancedPerformanceSettings,
  updateAdvancedPerformanceSettings,
  getAsyncSettings,
  updateAsyncSettings,
  getSitelockSettings,
  resolveSitelockUpdate,
  InvalidSitelockIpError,
  getTagSettings,
  updateTagSettings,
  getCommunicationSettings,
  updateCommunicationSettings,
  getDebugSettings,
  updateDebugSettings,
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

// SPEC-MEMBER-ADMIN-001 Slice D (REQ-MADM-015~027): "기본 설정" 탭.
// 레거시 순서(기본/가입/로그인/약관/기능/디자인)에 맞춰 회원 설정의 첫 번째 탭.
const DefaultSettingsSchema = z.object({
  // REQ-MADM-016: 가입 허가 모드. 기존 member.signup.enabled(boolean) 과의 하위
  // 호환을 위해 updateDefault 는 이 값을 member.signup.enabled 에도 미러링한다
  // (ALLOW/SIGNUP_KEY → true, DENY → false).
  signupAccessMode: z.enum(['ALLOW', 'DENY', 'SIGNUP_KEY']).default('ALLOW'),
  // REQ-MADM-017: SIGNUP_KEY 모드일 때 요구되는 가입키.
  signupKey: z.string().max(200).default(''),
  // REQ-MADM-018: 인증 메일 유효기간(시간 단위). EmailAuthToken.expiresAt 계산에 실제 반영.
  emailAuthTtlHours: z.number().int().positive().max(24 * 365).default(24),
  // REQ-MADM-019: 관리자 회원 목록(/admin/members) 프로필사진 노출 여부.
  showProfilePhotoInList: z.boolean().default(true),
  // REQ-MADM-020~022: 닉네임 변경 허용 / 변경 기록 저장.
  nicknameChangeAllowed: z.boolean().default(true),
  nicknameSaveChangeLog: z.boolean().default(true),
  // REQ-MADM-023: 닉네임 특수문자/띄어쓰기 허용.
  nicknameAllowSpecialChars: z.boolean().default(false),
  nicknameAllowedSpecialChars: z.string().max(100).default(''),
  nicknameAllowSpacing: z.boolean().default(false),
  // REQ-MADM-024: 기존 member.signup.allowDuplicateNickname 키를 그대로 재사용(신규 키 금지).
  allowDuplicateNickname: z.boolean().default(false),
  // REQ-MADM-025: 비밀번호 보안수준 — PasswordPolicyLevel enum 재사용.
  passwordPolicyLevel: z.enum(['NORMAL', 'STRONG', 'VERY_STRONG']).default('NORMAL'),
  // REQ-MADM-026: Argon2id timeCost — 안전 범위(2~10, RFC 9106 권고치 대비 클램프) 강제.
  argon2TimeCost: z.number().int().min(2).max(10).default(3),
  // REQ-MADM-027: 로그인 시 구버전 해시 자동 재해싱(REQ-AUTH-014) on/off.
  autoRehashEnabled: z.boolean().default(true),
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
  termsVersion: z.string().nullable(),
  privacyVersion: z.string().nullable(),
});

const FeatureSettingsSchema = z.object({
  allowProfileImage: z.boolean().default(true),
  allowSignature: z.boolean().default(true),
  exposeInMemberSearch: z.boolean().default(true),
});

// REQ-ADMIN2-054/055: 가입 양식 커스터마이징
const RESERVED_JOIN_FORM_KEYS = ['email', 'password', 'nickname'] as const;

const JoinFormFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'select', 'checkbox']),
  required: z.boolean(),
  order: z.number().int(),
});

const JoinFormSettingsSchema = z.object({
  fields: z.array(JoinFormFieldSchema),
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

  // ==========================================================================
  // Default Settings — "기본 설정" 탭 (SPEC-MEMBER-ADMIN-001 Slice D)
  // ==========================================================================

  /**
   * "기본 설정" 탭 조회 (REQ-MADM-015~027).
   */
  getDefault: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      // REQ-MADM-016: accessMode 키가 아직 없으면(마이그레이션 전) 기존
      // member.signup.enabled 불리언에서 유도해 하위 호환을 지킨다.
      const rawAccessMode = await getSiteSetting(ctx, 'member.signup.accessMode', null);
      let signupAccessMode: 'ALLOW' | 'DENY' | 'SIGNUP_KEY';
      if (rawAccessMode === 'ALLOW' || rawAccessMode === 'DENY' || rawAccessMode === 'SIGNUP_KEY') {
        signupAccessMode = rawAccessMode;
      } else {
        const legacyEnabled = await getSiteSetting(ctx, 'member.signup.enabled', true);
        signupAccessMode = legacyEnabled ? 'ALLOW' : 'DENY';
      }

      const settings = {
        signupAccessMode,
        signupKey: await getSiteSetting(ctx, 'member.signup.key', ''),
        emailAuthTtlHours: await getSiteSetting(ctx, 'member.signup.emailAuthTtlHours', 24),
        showProfilePhotoInList: await getSiteSetting(ctx, 'member.admin.showProfilePhotoInList', true),
        nicknameChangeAllowed: await getSiteSetting(ctx, 'member.nickname.changeAllowed', true),
        nicknameSaveChangeLog: await getSiteSetting(ctx, 'member.nickname.saveChangeLog', true),
        nicknameAllowSpecialChars: await getSiteSetting(ctx, 'member.nickname.allowSpecialChars', false),
        nicknameAllowedSpecialChars: await getSiteSetting(ctx, 'member.nickname.allowedSpecialChars', ''),
        nicknameAllowSpacing: await getSiteSetting(ctx, 'member.nickname.allowSpacing', false),
        // REQ-MADM-024: 기존 "가입 설정" 탭과 동일한 키를 재사용(신규 키 아님).
        allowDuplicateNickname: await getSiteSetting(ctx, 'member.signup.allowDuplicateNickname', false),
        passwordPolicyLevel: await getSiteSetting(ctx, 'member.password.policyLevel', 'NORMAL'),
        argon2TimeCost: await getSiteSetting(ctx, 'security.password.argon2TimeCost', 3),
        autoRehashEnabled: await getSiteSetting(ctx, 'security.password.autoRehashEnabled', true),
      };

      return DefaultSettingsSchema.parse(settings);
    }),

  /**
   * "기본 설정" 탭 업데이트 (REQ-MADM-015~027).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   * REQ-MADM-016: signupAccessMode 는 member.signup.enabled 에도 미러링되어
   * 기존 "가입 설정" 탭 및 packages/auth/signup.ts 의 boolean 소비 코드와의
   * 하위 호환을 유지한다.
   */
  updateDefault: protectedAdminProcedure
    .input(DefaultSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(txCtx, 'member.signup.accessMode', input.signupAccessMode, actorId);
        // REQ-MADM-016: 하위 호환 미러 — ALLOW/SIGNUP_KEY → true, DENY → false.
        await setSiteSetting(
          txCtx,
          'member.signup.enabled',
          input.signupAccessMode !== 'DENY',
          actorId,
        );
        await setSiteSetting(txCtx, 'member.signup.key', input.signupKey, actorId);
        await setSiteSetting(
          txCtx,
          'member.signup.emailAuthTtlHours',
          input.emailAuthTtlHours,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.admin.showProfilePhotoInList',
          input.showProfilePhotoInList,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.nickname.changeAllowed',
          input.nicknameChangeAllowed,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.nickname.saveChangeLog',
          input.nicknameSaveChangeLog,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.nickname.allowSpecialChars',
          input.nicknameAllowSpecialChars,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.nickname.allowedSpecialChars',
          input.nicknameAllowedSpecialChars,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.nickname.allowSpacing',
          input.nicknameAllowSpacing,
          actorId,
        );
        // REQ-MADM-024: 기존 "가입 설정" 탭과 동일한 키에 기록(신규 키 분기 금지).
        await setSiteSetting(
          txCtx,
          'member.signup.allowDuplicateNickname',
          input.allowDuplicateNickname,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.password.policyLevel',
          input.passwordPolicyLevel,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'security.password.argon2TimeCost',
          input.argon2TimeCost,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'security.password.autoRehashEnabled',
          input.autoRehashEnabled,
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
   * 약관 설정 조회 (REQ-ADMIN2-050, REQ-ADMIN2-051).
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
        termsVersion: await getSiteSetting(ctx, 'member.agreement.termsVersion', null),
        privacyVersion: await getSiteSetting(ctx, 'member.agreement.privacyVersion', null),
      };

      return AgreementSettingsSchema.parse(settings);
    }),

  /**
   * 약관 설정 업데이트 (REQ-ADMIN2-050, REQ-ADMIN2-051).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   * REQ-ADMIN2-051: 약관 내용이 변경된 경우에만 버전 타임스탬프를 갱신한다.
   */
  updateAgreement: protectedAdminProcedure
    .input(AgreementSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      // REQ-ADMIN2-051: 현재 저장된 약관 내용을 읽어서 변경 여부를 확인
      const currentTerms = await getSiteSetting(ctx, 'member.agreement.terms', '');
      const currentPrivacy = await getSiteSetting(ctx, 'member.agreement.privacy', '');
      const currentTermsVersion = await getSiteSetting(ctx, 'member.agreement.termsVersion', null);
      const currentPrivacyVersion = await getSiteSetting(ctx, 'member.agreement.privacyVersion', null);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        // 이용약관: 내용이 변경된 경우에만 버전 갱신
        await setSiteSetting(
          txCtx,
          'member.agreement.terms',
          input.terms ?? '',
          actorId,
        );
        if (input.terms !== currentTerms) {
          await setSiteSetting(
            txCtx,
            'member.agreement.termsVersion',
            new Date().toISOString(),
            actorId,
          );
        }

        // 개인정보처리방침: 내용이 변경된 경우에만 버전 갱신
        await setSiteSetting(
          txCtx,
          'member.agreement.privacy',
          input.privacy ?? '',
          actorId,
        );
        if (input.privacy !== currentPrivacy) {
          await setSiteSetting(
            txCtx,
            'member.agreement.privacyVersion',
            new Date().toISOString(),
            actorId,
          );
        }

        // 필수 동의 여부는 항상 갱신
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
  // Feature Settings (REQ-ADMIN2-052)
  // ==========================================================================

  /**
   * 기능 설정 조회 (REQ-ADMIN2-052).
   */
  getFeature: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const settings = {
        allowProfileImage: await getSiteSetting(
          ctx,
          'member.feature.allowProfileImage',
          true,
        ),
        allowSignature: await getSiteSetting(
          ctx,
          'member.feature.allowSignature',
          true,
        ),
        exposeInMemberSearch: await getSiteSetting(
          ctx,
          'member.feature.exposeInMemberSearch',
          true,
        ),
      };

      return FeatureSettingsSchema.parse(settings);
    }),

  /**
   * 기능 설정 업데이트 (REQ-ADMIN2-052).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묵어 원자적으로 적용한다.
   */
  updateFeature: protectedAdminProcedure
    .input(FeatureSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(
          txCtx,
          'member.feature.allowProfileImage',
          input.allowProfileImage,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.feature.allowSignature',
          input.allowSignature,
          actorId,
        );
        await setSiteSetting(
          txCtx,
          'member.feature.exposeInMemberSearch',
          input.exposeInMemberSearch,
          actorId,
        );
      });

      return { success: true };
    }),

  // ==========================================================================
  // Join Form Settings (REQ-ADMIN2-054/055)
  // ==========================================================================

  /**
   * 가입 양식 설정 조회 (REQ-ADMIN2-054).
   *
   * 저장된 필드 목록이 없으면 예약된 필드(email, password, nickname) 3개를 기본값으로 반환한다.
   */
  getJoinForm: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const savedFields = await getSiteSetting(ctx, 'member.joinform.fields', null);

      let fields;
      if (!savedFields || !Array.isArray(savedFields) || savedFields.length === 0) {
        // 기본 예약 필드 반환
        fields = [
          { key: 'email', label: '이메일', type: 'text' as const, required: true, order: 0 },
          { key: 'password', label: '비밀번호', type: 'text' as const, required: true, order: 1 },
          { key: 'nickname', label: '닉네임', type: 'text' as const, required: true, order: 2 },
        ];
      } else {
        fields = savedFields;
      }

      return JoinFormSettingsSchema.parse({ fields });
    }),

  /**
   * 가입 양식 설정 업데이트 (REQ-ADMIN2-054, REQ-ADMIN2-055).
   *
   * REQ-ADMIN2-055: 예약된 필드(email, password, nickname)가 제거되거나 이름이 변경되는 것을 금지한다.
   * 중복된 키를 허용하지 않는다.
   */
  updateJoinForm: protectedAdminProcedure
    .input(JoinFormSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      // REQ-ADMIN2-055: 예약된 필드 존재 확인
      const inputKeys = new Set(input.fields.map((f) => f.key));
      for (const reservedKey of RESERVED_JOIN_FORM_KEYS) {
        if (!inputKeys.has(reservedKey)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '예약된 필드(이메일/비밀번호/닉네임)는 제거하거나 이름을 바꿀 수 없습니다.',
          });
        }
      }

      // 중복 키 확인
      const keyCounts = new Map<string, number>();
      for (const field of input.fields) {
        const count = keyCounts.get(field.key) || 0;
        keyCounts.set(field.key, count + 1);
        if (count > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '중복된 필드 키가 있습니다.',
          });
        }
      }

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'member.joinform.fields', input.fields, actorId);
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

  // ==========================================================================
  // CAPTCHA Settings (SPEC-CAPTCHA-001 REQ-CAPTCHA-005)
  // ==========================================================================

  /**
   * CAPTCHA 설정 조회.
   */
  getCaptcha: protectedAdminProcedure.query(async ({ ctx }) => {
    const settings = {
      signupEnabled: await getSiteSetting(ctx, 'security.captcha.signup.enabled', false),
      loginEnabled: await getSiteSetting(ctx, 'security.captcha.login.enabled', false),
      turnstileSiteKey: await getSiteSetting(ctx, 'security.captcha.turnstile.siteKey', ''),
      turnstileSecretKey: await getSiteSetting(ctx, 'security.captcha.turnstile.secretKey', ''),
      loginCaptchaThreshold: await getSiteSetting(ctx, 'security.login.captchaThreshold', 5),
    };

    return z
      .object({
        signupEnabled: z.boolean(),
        loginEnabled: z.boolean(),
        turnstileSiteKey: z.string(),
        turnstileSecretKey: z.string(),
        loginCaptchaThreshold: z.number().int().min(1).max(10),
      })
      .parse(settings);
  }),

  /**
   * CAPTCHA 설정 업데이트.
   */
  updateCaptcha: protectedAdminProcedure
    .input(
      z
        .object({
          signupEnabled: z.boolean().default(false),
          loginEnabled: z.boolean().default(false),
          turnstileSiteKey: z.string().optional(),
          turnstileSecretKey: z.string().optional(),
          loginCaptchaThreshold: z.number().int().min(1).max(10).default(5),
        })
        .refine(
          (data) => {
            // ISSUE #4 FIX: Cannot enable captcha without keys
            if (data.signupEnabled || data.loginEnabled) {
              const hasSiteKey = data.turnstileSiteKey !== undefined && data.turnstileSiteKey.length > 0;
              const hasSecretKey = data.turnstileSecretKey !== undefined && data.turnstileSecretKey.length > 0;
              return hasSiteKey && hasSecretKey;
            }
            return true;
          },
          {
            message: 'CAPTCHA를 활성화하려면 Turnstile Site Key와 Secret Key를 모두 입력해야 합니다.',
            path: ['turnstileSiteKey', 'turnstileSecretKey'],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(txCtx, 'security.captcha.signup.enabled', input.signupEnabled, actorId);
        await setSiteSetting(txCtx, 'security.captcha.login.enabled', input.loginEnabled, actorId);

        // ISSUE #3 FIX: Only update keys if explicitly provided (undefined means keep existing)
        if (input.turnstileSiteKey !== undefined) {
          await setSiteSetting(
            txCtx,
            'security.captcha.turnstile.siteKey',
            input.turnstileSiteKey,
            actorId,
          );
        }
        if (input.turnstileSecretKey !== undefined) {
          await setSiteSetting(
            txCtx,
            'security.captcha.turnstile.secretKey',
            input.turnstileSecretKey,
            actorId,
          );
        }
        await setSiteSetting(
          txCtx,
          'security.login.captchaThreshold',
          input.loginCaptchaThreshold,
          actorId,
        );
      });

      return { success: true };
    }),

  // ==========================================================================
  // Design Settings (REQ-ADMIN2-053)
  // ==========================================================================

  /**
   * 디자인 설정 조회.
   */
  getDesign: protectedAdminProcedure.query(async ({ ctx }) =>
    getDesignSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 디자인 설정 업데이트.
   */
  updateDesign: protectedAdminProcedure
    .input(
      z.object({
        memberSkinId: z.string().optional(),
        memberTemplateId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      updateDesignSettings(input, { prisma: ctx.prisma }),
    ),

  // ==========================================================================
  // Email Queue Settings (REQ-ADMIN2-112)
  // ==========================================================================

  /**
   * 이메일 큐 설정 조회.
   */
  getEmailQueue: protectedAdminProcedure.query(async ({ ctx }) =>
    getEmailQueueSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 이메일 큐 설정 업데이트.
   */
  updateEmailQueue: protectedAdminProcedure
    .input(
      z.object({
        queueMode: z.enum(['immediate', 'queued']),
        batchSize: z.number().int().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'emailQueue', input, actorId);
      });

      return { success: true };
    }),

  // ==========================================================================
  // SEO Settings (REQ-ADMIN2-118/119)
  // ==========================================================================

  /**
   * SEO 설정 조회.
   */
  getSeo: protectedAdminProcedure.query(async ({ ctx }) =>
    getSeoSettings({ prisma: ctx.prisma }),
  ),

  /**
   * SEO 설정 업데이트.
   */
  updateSeo: protectedAdminProcedure
    .input(
      z.object({
        defaultMetaTitle: z.string().max(200).optional(),
        defaultMetaDescription: z.string().max(500).optional(),
        ogTitle: z.string().max(200).optional(),
        ogDescription: z.string().max(500).optional(),
        ogImageUrl: z.string().url().optional().or(z.literal('')),
        canonicalUrlPolicy: z.enum(['none', 'default', 'custom']),
        sitemapEnabled: z.boolean(),
        // REQ-SEO-006: Additional SEO fields
        googleAnalyticsId: z.string().max(50).optional(),
        naverSiteVerificationCode: z.string().max(200).optional(),
        robotsTxtCustomContent: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'seo', input, actorId);
      });

      return { success: true };
    }),

  // ==========================================================================
  // Advanced Settings (REQ-ADMIN2-116/157/158)
  // ==========================================================================

  /**
   * 고급 설정(라우팅) 조회.
   */
  getAdvancedRouting: protectedAdminProcedure.query(async ({ ctx }) =>
    getAdvancedRoutingSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 고급 설정(라우팅) 업데이트.
   */
  updateAdvancedRouting: protectedAdminProcedure
    .input(
      z.object({
        siteTimezone: z.string(),
        defaultLanguage: z.string(),
        cacheDriver: z.enum(['file', 'redis', 'memcached']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'advanced.routing', input, actorId);
      });

      return { success: true };
    }),

  /**
   * 고급 설정(지역화) 조회.
   */
  getAdvancedLocalization: protectedAdminProcedure.query(async ({ ctx }) =>
    getAdvancedLocalizationSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 고급 설정(지역화) 업데이트.
   */
  updateAdvancedLocalization: protectedAdminProcedure
    .input(
      z.object({
        shortUrlPolicy: z.enum(['disabled', 'xe_compat', 'all']),
        mobileViewEnabled: z.boolean(),
        tabletAsMobile: z.boolean(),
        autoLanguageSelection: z.boolean(),
        supportedLanguages: z.array(z.string()),
        defaultLanguage: z.string(),
        mobileViewport: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'advanced.localization', input, actorId);
      });

      return { success: true };
    }),

  /**
   * 고급 설정(성능/캐시) 조회.
   */
  getAdvancedPerformance: protectedAdminProcedure.query(async ({ ctx }) =>
    getAdvancedPerformanceSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 고급 설정(성능/캐시) 업데이트.
   */
  updateAdvancedPerformance: protectedAdminProcedure
    .input(
      z.object({
        sessionDbUse: z.boolean(),
        sessionDelayStart: z.boolean(),
        templateCacheDelay: z.boolean(),
        thumbnailTarget: z.enum(['attached', 'all', 'none']),
        thumbnailMethod: z.enum(['gd', 'imagick', 'none']),
        cacheEnabled: z.boolean(),
        cacheDefaultTtl: z.number().int().min(0).max(86400),
        cacheDeleteMethod: z.enum(['folder', 'content']),
        cacheControlOptions: z.array(z.enum(['no-cache', 'no-store', 'must-revalidate'])),
        adminLayout: z.enum(['module', 'admin']),
        jsCompressionPolicy: z.enum(['none', 'common', 'all']),
        jsMergePolicy: z.enum(['none', 'css', 'js', 'both']),
        cssCompressionPolicy: z.enum(['none', 'common', 'all']),
        cssMergePolicy: z.enum(['none', 'css', 'js', 'both']),
        jqueryVersion: z.enum(['2.2.4', '3.7.1']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'advanced.performance', input, actorId);
      });

      return { success: true };
    }),

  // ==========================================================================
  // Async Task Settings (REQ-ADMIN2-154)
  // ==========================================================================

  /**
   * 비동기 작업 설정 조회.
   */
  getAsync: protectedAdminProcedure.query(async ({ ctx }) =>
    getAsyncSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 비동기 작업 설정 업데이트.
   */
  updateAsync: protectedAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        driver: z.enum(['none', 'db']),
        webcronKey: z.string().length(32).optional(),
        webcronShowError: z.boolean(),
        intervalMinutes: z.number().int().min(1).max(1440),
        processCount: z.number().int().min(1).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'async', input, actorId);
      });

      return { success: true };
    }),

  // ==========================================================================
  // Site Lock Settings (REQ-ADMIN2-155)
  // ==========================================================================

  /**
   * 사이트 잠금 설정 조회.
   */
  getSitelock: protectedAdminProcedure.query(async ({ ctx }) =>
    getSitelockSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 사이트 잠금 설정 업데이트.
   */
  updateSitelock: protectedAdminProcedure
    .input(
      z.object({
        locked: z.boolean(),
        message: z.string().max(1000).optional(),
        allowedIpList: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      // REQ-ADMIN2-155: 자가 잠금 방지 — 검증 + 현재 관리자 IP 자동 포함.
      // resolveSitelockUpdate 가 allowedIpList 형식 검증과 self-IP 주입을 수행하며,
      // 잘못된 IP 가 있으면 InvalidSitelockIpError 를 던진다 (BAD_REQUEST 로 매핑).
      let processed;
      try {
        processed = resolveSitelockUpdate(input, ctx.ip);
      } catch (err) {
        if (err instanceof InvalidSitelockIpError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
        }
        throw err;
      }

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(
          txCtx,
          'sitelock',
          processed,
          actorId,
        );
      });

      return { success: true };
    }),

  // ==========================================================================
  // IP Control Settings (REQ-ADMIN2-115)
  // ==========================================================================

  /**
   * IP 접근 제어 설정 조회.
   */
  getIpControl: protectedAdminProcedure.query(async ({ ctx }) => {
    const { getIpControlSettings } = await import('@rhymix-ts/admin');
    return getIpControlSettings({ prisma: ctx.prisma });
  }),

  /**
   * IP 접근 제어 설정 업데이트.
   */
  updateIpControl: protectedAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        allowList: z.array(z.string()),
        denyList: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { updateIpControlSettings } = await import('@rhymix-ts/admin');
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(
          txCtx,
          'ipControl',
          input,
          actorId,
        );
      });

      return input;
    }),

  // ==========================================================================
  // Tag Settings (REQ-ADMIN2-087/156)
  // ==========================================================================

  /**
   * 태그 설정 조회 (클라우드 노출 개수/정렬 기준/구분 방법).
   */
  getTags: protectedAdminProcedure.query(async ({ ctx }) =>
    getTagSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 태그 설정 업데이트.
   *
   * REQ-ADMIN2-156: delimiters 는 1개 이상 선택해야 한다 (Zod 스키마에서 강제).
   */
  updateTags: protectedAdminProcedure
    .input(
      z.object({
        cloudDisplayCount: z.number().int().min(1).max(500),
        sortBy: z.enum(['frequency', 'name', 'recent']),
        delimiters: z.array(z.enum(['comma', 'hash', 'space'])).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateTagSettings(input, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof SiteNotFoundError) {
          throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
        }
        throw err;
      }
    }),

  // ==========================================================================
  // Communication Settings (REQ-ADMIN2-143)
  // ==========================================================================

  /**
   * 쪽지 설정 조회 (REQ-ADMIN2-143).
   */
  getCommunication: protectedAdminProcedure.query(async ({ ctx }) =>
    getCommunicationSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 쪽지 설정 업데이트 (REQ-ADMIN2-143).
   */
  updateCommunication: protectedAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        inboxLimit: z.number().int().min(1).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'communication', input, actorId);
      });

      return { success: true };
    }),

  // ==========================================================================
  // Debug Settings (REQ-ADMIN2-117/159/160)
  // ==========================================================================

  /**
   * 디버그 설정 조회 (REQ-ADMIN2-117/159/160).
   *
   * REQ-ADMIN2-117: 디버그 표시 대상.
   * REQ-ADMIN2-159: 느린 작업 임계값, 표시 방법/내용, 로그 파일 경로, 허용 IP.
   * REQ-ADMIN2-160: 쿼리 진단 옵션, 에러 로그 수준.
   */
  getDebug: protectedAdminProcedure.query(async ({ ctx }) =>
    getDebugSettings({ prisma: ctx.prisma }),
  ),

  /**
   * 디버그 설정 업데이트 (REQ-ADMIN2-117/159/160).
   */
  updateDebug: protectedAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        slowQueryThreshold: z.number().nonnegative(),
        slowTriggerThreshold: z.number().nonnegative(),
        slowWidgetThreshold: z.number().nonnegative(),
        slowExternalThreshold: z.number().nonnegative(),
        displayMethods: z.array(z.enum(['html_comment', 'screen_panel', 'file_log'])).min(1),
        contentTypes: z.array(
          z.enum([
            'request_response',
            'debug_message',
            'error',
            'query',
            'slow_query',
            'slow_trigger',
            'slow_widget',
            'slow_external',
          ]),
        ),
        logFilePath: z.string().optional(),
        displayTarget: z.enum(['admin_only', 'allowed_ips', 'all']),
        allowedIps: z.array(z.string()),
        addQueryComment: z.boolean(),
        showFullCallStack: z.boolean(),
        deduplicateErrors: z.boolean(),
        errorLogLevel: z.enum(['all_errors_warnings', 'critical_only']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };
        await setSiteSetting(txCtx, 'debug', input, actorId);
      });

      return { success: true };
    }),

  // ==========================================================================
  // Social Login Settings (REQ-SOCIAL-005)
  // ==========================================================================

  /**
   * 소셜 로그인 설정 조회 (REQ-SOCIAL-005).
   */
  getSocial: protectedAdminProcedure.query(async ({ ctx }) => {
    const settings = {
      kakao: {
        enabled: await getSiteSetting(ctx, 'social.kakao.enabled', false),
        clientId: await getSiteSetting(ctx, 'social.kakao.clientId', ''),
        clientSecret: await getSiteSetting(ctx, 'social.kakao.clientSecret', ''),
      },
      google: {
        enabled: await getSiteSetting(ctx, 'social.google.enabled', false),
        clientId: await getSiteSetting(ctx, 'social.google.clientId', ''),
        clientSecret: await getSiteSetting(ctx, 'social.google.clientSecret', ''),
      },
    };

    return settings;
  }),

  /**
   * 소셜 로그인 설정 업데이트 (REQ-SOCIAL-005).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   */
  updateSocial: protectedAdminProcedure
    .input(
      z.object({
        kakao: z.object({
          enabled: z.boolean(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
        }),
        google: z.object({
          enabled: z.boolean(),
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        // Kakao settings
        await setSiteSetting(txCtx, 'social.kakao.enabled', input.kakao.enabled, actorId);
        if (input.kakao.clientId !== undefined) {
          await setSiteSetting(txCtx, 'social.kakao.clientId', input.kakao.clientId, actorId);
        }
        if (input.kakao.clientSecret !== undefined) {
          await setSiteSetting(txCtx, 'social.kakao.clientSecret', input.kakao.clientSecret, actorId);
        }

        // Google settings
        await setSiteSetting(txCtx, 'social.google.enabled', input.google.enabled, actorId);
        if (input.google.clientId !== undefined) {
          await setSiteSetting(txCtx, 'social.google.clientId', input.google.clientId, actorId);
        }
        if (input.google.clientSecret !== undefined) {
          await setSiteSetting(txCtx, 'social.google.clientSecret', input.google.clientSecret, actorId);
        }
      });

      return { success: true };
    }),
});
