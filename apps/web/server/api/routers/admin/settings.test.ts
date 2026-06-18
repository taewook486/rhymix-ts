/**
 * Specification tests for admin.settings tRPC router — SPEC-ADMIN-002 Slice 2C.
 *
 * SETTINGS-FEATURE-001: getFeature → defaults when no SiteSetting rows exist.
 * SETTINGS-FEATURE-002: getFeature → returns stored values when rows exist.
 * SETTINGS-FEATURE-003: updateFeature → persists all 3 keys via siteSetting.upsert inside transaction.
 * SETTINGS-FEATURE-004: updateFeature → writes 3 AdminLog entries.
 *
 * SETTINGS-AGREEMENT-001: getAgreement → includes termsVersion/privacyVersion as null when unset.
 * SETTINGS-AGREEMENT-002: getAgreement → returns stored version strings when set.
 * SETTINGS-AGREEMENT-003: updateAgreement → new termsVersion written only when terms differs.
 * SETTINGS-AGREEMENT-004: updateAgreement → new privacyVersion written only when privacy differs.
 *
 * SETTINGS-JOINFORM-001: getJoinForm → returns 3 reserved default fields when unset.
 * SETTINGS-JOINFORM-002: getJoinForm → returns stored fields when set.
 * SETTINGS-JOINFORM-003: updateJoinForm → succeeds when all 3 reserved keys present.
 * SETTINGS-JOINFORM-004: updateJoinForm → throws BAD_REQUEST when reserved key missing.
 * SETTINGS-JOINFORM-005: updateJoinForm → throws BAD_REQUEST when duplicate keys exist.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// NextAuth + DB mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// Prisma mock
const mockSiteFindFirst = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockSiteSettingFindUnique = vi.fn();
const mockSiteSettingUpsert = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (callback: (tx: any) => Promise<any>) => {
    const tx = {
      site: {
        findFirst: mockSiteFindFirst,
      },
      siteSetting: {
        findFirst: mockSiteSettingFindFirst,
        findUnique: mockSiteSettingFindUnique,
        upsert: mockSiteSettingUpsert,
      },
      adminLog: {
        create: mockAdminLogCreate,
      },
    };
    return callback(tx);
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.settings tRPC router (Slice 2C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA disabled
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  // ==========================================================================
  // Feature Settings (REQ-ADMIN2-052)
  // ==========================================================================

  it('SETTINGS-FEATURE-001: getFeature → defaults when no SiteSetting rows exist', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getFeature();

    expect(result).toEqual({
      allowProfileImage: true,
      allowSignature: true,
      exposeInMemberSearch: true,
    });
  });

  it('SETTINGS-FEATURE-002: getFeature → returns stored values when rows exist', async () => {
    mockSiteSettingFindUnique
      .mockResolvedValueOnce({ value: false }) // allowProfileImage
      .mockResolvedValueOnce({ value: false }) // allowSignature
      .mockResolvedValueOnce({ value: false }); // exposeInMemberSearch

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getFeature();

    expect(result).toEqual({
      allowProfileImage: false,
      allowSignature: false,
      exposeInMemberSearch: false,
    });
  });

  it('SETTINGS-FEATURE-003: updateFeature → persists all 3 keys via siteSetting.upsert inside transaction', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.updateFeature({
      allowProfileImage: false,
      allowSignature: false,
      exposeInMemberSearch: false,
    });

    expect(mockSiteSettingUpsert).toHaveBeenCalledTimes(3);
    expect(mockSiteSettingUpsert).toHaveBeenNthCalledWith(1, {
      where: {
        siteId_key: { siteId: 1, key: 'member.feature.allowProfileImage' },
      },
      create: {
        siteId: 1,
        key: 'member.feature.allowProfileImage',
        value: false,
      },
      update: { value: false },
    });
  });

  it('SETTINGS-FEATURE-004: updateFeature → writes 3 AdminLog entries', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.updateFeature({
      allowProfileImage: false,
      allowSignature: true,
      exposeInMemberSearch: false,
    });

    // Each of the 3 keys creates 1 AdminLog entry
    expect(mockAdminLogCreate.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  // ==========================================================================
  // Agreement Settings (REQ-ADMIN2-050, REQ-ADMIN2-051)
  // ==========================================================================

  it('SETTINGS-AGREEMENT-001: getAgreement → includes termsVersion/privacyVersion as null when unset', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getAgreement();

    expect(result).toEqual({
      terms: '',
      privacy: '',
      termsRequired: true,
      privacyRequired: true,
      termsVersion: null,
      privacyVersion: null,
    });
  });

  it('SETTINGS-AGREEMENT-002: getAgreement → returns stored version strings when set', async () => {
    mockSiteSettingFindUnique
      .mockResolvedValueOnce({ value: 'Updated terms' }) // terms
      .mockResolvedValueOnce({ value: 'Updated privacy' }) // privacy
      .mockResolvedValueOnce({ value: true }) // termsRequired
      .mockResolvedValueOnce({ value: true }) // privacyRequired
      .mockResolvedValueOnce({ value: '2024-01-01T00:00:00.000Z' }) // termsVersion
      .mockResolvedValueOnce({ value: '2024-01-02T00:00:00.000Z' }); // privacyVersion

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getAgreement();

    expect(result).toEqual({
      terms: 'Updated terms',
      privacy: 'Updated privacy',
      termsRequired: true,
      privacyRequired: true,
      termsVersion: '2024-01-01T00:00:00.000Z',
      privacyVersion: '2024-01-02T00:00:00.000Z',
    });
  });

  it('SETTINGS-AGREEMENT-003: updateAgreement → new termsVersion written only when terms differs', async () => {
    // Current terms are "Old terms"
    mockSiteSettingFindUnique
      .mockResolvedValueOnce({ value: 'Old terms' }) // current terms
      .mockResolvedValueOnce({ value: 'Old privacy' }) // current privacy
      .mockResolvedValueOnce({ value: null }) // current termsVersion
      .mockResolvedValueOnce({ value: null }); // current privacyVersion
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // Update only terms, not privacy
    await caller.updateAgreement({
      terms: 'New terms',
      privacy: 'Old privacy',
      termsRequired: true,
      privacyRequired: true,
      termsVersion: null,
      privacyVersion: null,
    });

    // Should have 5 upsert calls: terms, privacy (both unchanged content), then termsVersion, privacy, termsRequired, privacyRequired
    // Actually: terms + termsVersion (since changed), privacy (no version since unchanged), termsRequired, privacyRequired
    expect(mockSiteSettingUpsert).toHaveBeenCalledTimes(5);

    // Check that termsVersion was updated (2nd call - immediately after terms)
    const termsVersionCall = mockSiteSettingUpsert.mock.calls[1]!;
    expect(termsVersionCall[0]).toMatchObject({
      where: { siteId_key: { siteId: 1, key: 'member.agreement.termsVersion' } },
      create: expect.objectContaining({
        value: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO timestamp
      }),
    });
  });

  it('SETTINGS-AGREEMENT-004: updateAgreement → new privacyVersion written only when privacy differs', async () => {
    // Current privacy is "Old privacy"
    mockSiteSettingFindUnique
      .mockResolvedValueOnce({ value: 'Old terms' }) // current terms
      .mockResolvedValueOnce({ value: 'Old privacy' }) // current privacy
      .mockResolvedValueOnce({ value: null }) // current termsVersion
      .mockResolvedValueOnce({ value: null }); // current privacyVersion
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // Update only privacy, not terms
    await caller.updateAgreement({
      terms: 'Old terms',
      privacy: 'New privacy',
      termsRequired: true,
      privacyRequired: true,
      termsVersion: null,
      privacyVersion: null,
    });

    // Should have 5 upsert calls: terms (no version since unchanged), privacy + privacyVersion (since changed), termsRequired, privacyRequired
    expect(mockSiteSettingUpsert).toHaveBeenCalledTimes(5);

    // Check that privacyVersion was updated (3rd call - immediately after privacy)
    const privacyVersionCall = mockSiteSettingUpsert.mock.calls[2]!;
    expect(privacyVersionCall[0]).toMatchObject({
      where: { siteId_key: { siteId: 1, key: 'member.agreement.privacyVersion' } },
      create: expect.objectContaining({
        value: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO timestamp
      }),
    });
  });

  // ==========================================================================
  // Join Form Settings (REQ-ADMIN2-054/055)
  // ==========================================================================

  it('SETTINGS-JOINFORM-001: getJoinForm → returns 3 reserved default fields when unset', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getJoinForm();

    expect(result).toEqual({
      fields: [
        { key: 'email', label: '이메일', type: 'text', required: true, order: 0 },
        { key: 'password', label: '비밀번호', type: 'text', required: true, order: 1 },
        { key: 'nickname', label: '닉네임', type: 'text', required: true, order: 2 },
      ],
    });
  });

  it('SETTINGS-JOINFORM-002: getJoinForm → returns stored fields when set', async () => {
    const customFields = [
      { key: 'email', label: 'Email', type: 'text' as const, required: true, order: 0 },
      { key: 'password', label: 'Password', type: 'text' as const, required: true, order: 1 },
      { key: 'nickname', label: 'Nickname', type: 'text' as const, required: true, order: 2 },
      { key: 'phone', label: 'Phone', type: 'text' as const, required: false, order: 3 },
    ];
    mockSiteSettingFindUnique.mockResolvedValueOnce({ value: customFields });

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getJoinForm();

    expect(result).toEqual({
      fields: customFields,
    });
  });

  it('SETTINGS-JOINFORM-003: updateJoinForm → succeeds when all 3 reserved keys present', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);
    mockSiteSettingUpsert.mockResolvedValue({});

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const fields = [
      { key: 'email', label: '이메일', type: 'text' as const, required: true, order: 0 },
      { key: 'password', label: '비밀번호', type: 'text' as const, required: true, order: 1 },
      { key: 'nickname', label: '닉네임', type: 'text' as const, required: true, order: 2 },
    ];

    const result = await caller.updateJoinForm({ fields });

    expect(result).toEqual({ success: true });
    expect(mockSiteSettingUpsert).toHaveBeenCalledOnce();
  });

  it('SETTINGS-JOINFORM-004: updateJoinForm → throws BAD_REQUEST when reserved key missing', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // Missing 'password' reserved key
    const fields = [
      { key: 'email', label: '이메일', type: 'text' as const, required: true, order: 0 },
      { key: 'nickname', label: '닉네임', type: 'text' as const, required: true, order: 2 },
    ];

    await expect(caller.updateJoinForm({ fields })).rejects.toThrow(TRPCError);
    await expect(caller.updateJoinForm({ fields })).rejects.toThrow('예약된 필드');
  });

  it('SETTINGS-JOINFORM-005: updateJoinForm → throws BAD_REQUEST when duplicate keys exist', async () => {
    mockSiteSettingFindUnique.mockResolvedValue(null);

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // Duplicate 'nickname' key
    const fields = [
      { key: 'email', label: '이메일', type: 'text' as const, required: true, order: 0 },
      { key: 'password', label: '비밀번호', type: 'text' as const, required: true, order: 1 },
      { key: 'nickname', label: '닉네임', type: 'text' as const, required: true, order: 2 },
      { key: 'nickname', label: '별명', type: 'text' as const, required: false, order: 3 },
    ];

    await expect(caller.updateJoinForm({ fields })).rejects.toThrow(TRPCError);
    await expect(caller.updateJoinForm({ fields })).rejects.toThrow('중복된 필드 키');
  });
});
