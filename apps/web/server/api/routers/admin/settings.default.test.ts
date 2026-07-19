/**
 * admin.settings.getDefault / updateDefault — SPEC-MEMBER-ADMIN-001 Slice D.
 *
 * "기본 설정" 탭 (REQ-MADM-015~027). SPEC-ADMIN-002 settings.test.ts 와 동일한
 * mock 패턴을 재사용하되, 이 SPEC 소유 프로시저만 별도 파일로 분리한다
 * (settings.test.ts 는 다른 SPEC 소유이므로 건드리지 않는다 — PRESERVE).
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-015~027
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));
vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

const mockSiteFindFirst = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockSiteSettingFindUnique = vi.fn();
const mockSiteSettingUpsert = vi.fn();
const mockSiteSettingCreate = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockTransaction = vi.fn((callback: (tx: any) => Promise<any>) => {
  const tx = {
    site: { findFirst: mockSiteFindFirst },
    siteSetting: {
      findFirst: mockSiteSettingFindFirst,
      findUnique: mockSiteSettingFindUnique,
      upsert: mockSiteSettingUpsert,
      create: mockSiteSettingCreate,
    },
    adminLog: { create: mockAdminLogCreate },
  };
  return callback(tx);
});

const mockPrisma = {
  site: { findFirst: (...args: unknown[]) => mockSiteFindFirst(...args) },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
    create: (...args: unknown[]) => mockSiteSettingCreate(...args),
  },
  adminLog: { create: (...args: unknown[]) => mockAdminLogCreate(...args) },
  $transaction: mockTransaction,
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.settings.getDefault / updateDefault — SPEC-MEMBER-ADMIN-001 Slice D', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
    mockSiteSettingFindFirst.mockResolvedValue(null);
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingCreate.mockResolvedValue({ id: 1, siteId: 1, key: 'test', value: {} });
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('DEFAULT-001: getDefault → returns safe defaults when no SiteSetting rows exist', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    const result = await caller.getDefault();

    expect(result).toEqual({
      signupAccessMode: 'ALLOW',
      signupKey: '',
      emailAuthTtlHours: 24,
      showProfilePhotoInList: true,
      nicknameChangeAllowed: true,
      nicknameSaveChangeLog: true,
      nicknameAllowSpecialChars: false,
      nicknameAllowedSpecialChars: '',
      nicknameAllowSpacing: false,
      allowDuplicateNickname: false,
      passwordPolicyLevel: 'NORMAL',
      argon2TimeCost: 3,
      autoRehashEnabled: true,
    });
  });

  it('DEFAULT-002 (REQ-MADM-016 backward compat): legacy member.signup.enabled=false maps to DENY when accessMode unset', async () => {
    mockSiteSettingFindUnique.mockImplementation(async ({ where }: any) => {
      if (where.siteId_key.key === 'member.signup.accessMode') return null; // not yet migrated
      if (where.siteId_key.key === 'member.signup.enabled') return { value: false };
      return null;
    });

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    const result = await caller.getDefault();

    expect(result.signupAccessMode).toBe('DENY');
  });

  it('DEFAULT-003: updateDefault → persists all keys in a single $transaction + mirrors legacy member.signup.enabled', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    await caller.updateDefault({
      signupAccessMode: 'SIGNUP_KEY',
      signupKey: 'my-secret-key',
      emailAuthTtlHours: 48,
      showProfilePhotoInList: false,
      nicknameChangeAllowed: false,
      nicknameSaveChangeLog: false,
      nicknameAllowSpecialChars: true,
      nicknameAllowedSpecialChars: '-_.',
      nicknameAllowSpacing: true,
      allowDuplicateNickname: true,
      passwordPolicyLevel: 'VERY_STRONG',
      argon2TimeCost: 4,
      autoRehashEnabled: false,
    });

    expect(mockTransaction).toHaveBeenCalledOnce();

    const keys = mockSiteSettingUpsert.mock.calls.map((c: any[]) => c[0].where.siteId_key.key);
    expect(keys).toContain('member.signup.accessMode');
    expect(keys).toContain('member.signup.enabled'); // backward-compat mirror
    expect(keys).toContain('member.signup.key');
    expect(keys).toContain('member.signup.emailAuthTtlHours');
    expect(keys).toContain('member.admin.showProfilePhotoInList');
    expect(keys).toContain('member.nickname.changeAllowed');
    expect(keys).toContain('member.nickname.saveChangeLog');
    expect(keys).toContain('member.nickname.allowSpecialChars');
    expect(keys).toContain('member.nickname.allowedSpecialChars');
    expect(keys).toContain('member.nickname.allowSpacing');
    expect(keys).toContain('member.signup.allowDuplicateNickname'); // REQ-MADM-024: SAME key as signup tab
    expect(keys).toContain('member.password.policyLevel');
    expect(keys).toContain('security.password.argon2TimeCost');
    expect(keys).toContain('security.password.autoRehashEnabled');

    // member.signup.enabled mirrors accessMode !== 'DENY'
    const enabledCall = mockSiteSettingUpsert.mock.calls.find(
      (c: any[]) => c[0].where.siteId_key.key === 'member.signup.enabled',
    );
    expect(enabledCall![0].create.value).toBe(true);
  });

  it('DEFAULT-004 (REQ-MADM-016 backward compat): accessMode=DENY mirrors member.signup.enabled=false', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    await caller.updateDefault({
      signupAccessMode: 'DENY',
      emailAuthTtlHours: 24,
      showProfilePhotoInList: true,
      nicknameChangeAllowed: true,
      nicknameSaveChangeLog: true,
      nicknameAllowSpecialChars: false,
      nicknameAllowedSpecialChars: '',
      nicknameAllowSpacing: false,
      allowDuplicateNickname: false,
      passwordPolicyLevel: 'NORMAL',
      argon2TimeCost: 3,
      autoRehashEnabled: true,
    });

    const enabledCall = mockSiteSettingUpsert.mock.calls.find(
      (c: any[]) => c[0].where.siteId_key.key === 'member.signup.enabled',
    );
    expect(enabledCall![0].create.value).toBe(false);
  });

  it('DEFAULT-005 (REQ-MADM-026 clamp): argon2TimeCost out of safe range (0) is rejected by Zod', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    await expect(
      caller.updateDefault({
        signupAccessMode: 'ALLOW',
        emailAuthTtlHours: 24,
        showProfilePhotoInList: true,
        nicknameChangeAllowed: true,
        nicknameSaveChangeLog: true,
        nicknameAllowSpecialChars: false,
        nicknameAllowedSpecialChars: '',
        nicknameAllowSpacing: false,
        allowDuplicateNickname: false,
        passwordPolicyLevel: 'NORMAL',
        argon2TimeCost: 0,
        autoRehashEnabled: true,
      }),
    ).rejects.toThrow();
  });

  it('DEFAULT-006 (REQ-MADM-026 clamp): argon2TimeCost out of safe range (100) is rejected by Zod', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    await expect(
      caller.updateDefault({
        signupAccessMode: 'ALLOW',
        emailAuthTtlHours: 24,
        showProfilePhotoInList: true,
        nicknameChangeAllowed: true,
        nicknameSaveChangeLog: true,
        nicknameAllowSpecialChars: false,
        nicknameAllowedSpecialChars: '',
        nicknameAllowSpacing: false,
        allowDuplicateNickname: false,
        passwordPolicyLevel: 'NORMAL',
        argon2TimeCost: 100,
        autoRehashEnabled: true,
      }),
    ).rejects.toThrow();
  });

  it('DEFAULT-007 (REQ-MADM-024 key consistency): getDefault reads the SAME key as getSignup for allowDuplicateNickname', async () => {
    mockSiteSettingFindUnique.mockImplementation(async ({ where }: any) => {
      if (where.siteId_key.key === 'member.signup.allowDuplicateNickname') return { value: true };
      // NOTE: member.signup.defaultGroupId must resolve to a non-null value here —
      // getSignup() (SPEC-ADMIN-002-owned, out of this SPEC's scope) currently
      // Zod-parses that field as `z.number().optional()`, which rejects the
      // literal `null` getSiteSetting() returns when the row is absent. Returning
      // a concrete value sidesteps that pre-existing, out-of-scope bug so this
      // test can focus on REQ-MADM-024 key consistency.
      if (where.siteId_key.key === 'member.signup.defaultGroupId') return { value: 1 };
      return null;
    });

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminSettingsRouter)(adminCtx as never);

    const [defaultResult, signupResult] = await Promise.all([caller.getDefault(), caller.getSignup()]);

    expect(defaultResult.allowDuplicateNickname).toBe(true);
    expect(signupResult.allowDuplicateNickname).toBe(true);
  });
});
