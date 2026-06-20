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
const mockSiteSettingCreate = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockTransaction = vi.fn((callback: (tx: any) => Promise<any>) => {
  const tx = {
    site: {
      findFirst: mockSiteFindFirst,
    },
    siteSetting: {
      findFirst: mockSiteSettingFindFirst,
      findUnique: mockSiteSettingFindUnique,
      upsert: mockSiteSettingUpsert,
      create: mockSiteSettingCreate,
    },
    adminLog: {
      create: mockAdminLogCreate,
    },
  };
  return callback(tx);
});

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
    create: (...args: unknown[]) => mockSiteSettingCreate(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: mockTransaction,
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
    mockSiteSettingFindUnique.mockResolvedValue(null); // Default: no existing settings
    mockSiteSettingCreate.mockResolvedValue({ id: 1, siteId: 1, key: 'test', value: {} });
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

  // ==========================================================================
  // Slice 2D Tests (REQ-ADMIN2-112, 118/119, 116/157/158, 154, 155)
  // ==========================================================================

  it('SETTINGS-EMAIL-QUEUE-001: getEmailQueue → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getEmailQueue();

    expect(result.queueMode).toBe('immediate');
    expect(result.batchSize).toBe(50);
  });

  it('SETTINGS-SEO-001: getSeo → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getSeo();

    expect(result.canonicalUrlPolicy).toBe('none');
    expect(result.sitemapEnabled).toBe(false);
  });

  it('SETTINGS-SEO-002: updateSeo → persists settings', async () => {
    mockSiteSettingUpsert.mockResolvedValue({});
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateSeo({
      defaultMetaTitle: 'Test Site',
      sitemapEnabled: true,
      canonicalUrlPolicy: 'default',
    });

    expect(result).toEqual({ success: true });
    expect(mockSiteSettingUpsert).toHaveBeenCalled();
  });

  it('SETTINGS-ADV-ROUTE-001: getAdvancedRouting → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getAdvancedRouting();

    expect(result.siteTimezone).toBe('Asia/Seoul');
    expect(result.cacheDriver).toBe('file');
  });

  it('SETTINGS-ADV-LOC-001: getAdvancedLocalization → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getAdvancedLocalization();

    expect(result.shortUrlPolicy).toBe('disabled');
    expect(result.mobileViewEnabled).toBe(true);
  });

  it('SETTINGS-ADV-PERF-001: getAdvancedPerformance → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getAdvancedPerformance();

    expect(result.sessionDbUse).toBe(false);
    expect(result.jqueryVersion).toBe('3.7.1');
  });

  it('SETTINGS-ASYNC-001: getAsync → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getAsync();

    expect(result.enabled).toBe(false);
    expect(result.intervalMinutes).toBe(5);
  });

  it('SETTINGS-SITELOCK-001: getSitelock → returns defaults', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getSitelock();

    expect(result.locked).toBe(false);
    expect(result.allowedIpList).toEqual([]);
  });

  it('SETTINGS-SITELOCK-002: updateSitelock → persists settings', async () => {
    mockSiteSettingUpsert.mockResolvedValue({});
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateSitelock({
      locked: true,
      message: 'Maintenance mode',
      allowedIpList: ['192.168.1.1'],
    });

    expect(result).toEqual({ success: true });
    expect(mockSiteSettingUpsert).toHaveBeenCalled();
  });

  it('SETTINGS-SITELOCK-003: updateSitelock with locked=true auto-includes current admin IP — self-lockout protection (REQ-ADMIN2-155)', async () => {
    mockSiteSettingUpsert.mockResolvedValue({});
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // adminCtx.ip is '::1' — it is NOT in the provided allowedIpList.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.updateSitelock({
      locked: true,
      message: 'Maintenance mode',
      allowedIpList: ['192.168.1.1'],
    });

    // The persisted value MUST include the current admin IP (::1) so the admin
    // is never locked out of their own site.
    const upsertCall = mockSiteSettingUpsert.mock.calls.find(
      (c) => c[0]?.where?.siteId_key?.key === 'sitelock',
    );
    expect(upsertCall).toBeDefined();
    const persistedAllowList = upsertCall![0].create.value.allowedIpList as string[];
    expect(persistedAllowList).toContain('::1');
    expect(persistedAllowList).toContain('192.168.1.1');
  });

  it('SETTINGS-SITELOCK-004: updateSitelock rejects malformed IP in allow list with BAD_REQUEST (REQ-ADMIN2-155)', async () => {
    mockSiteSettingUpsert.mockResolvedValue({});
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateSitelock({
        locked: true,
        message: '',
        allowedIpList: ['not-an-ip-address'],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  // ==========================================================================
  // Tag Settings (REQ-ADMIN2-087/156)
  // ==========================================================================

  it('SETTINGS-TAGS-001: getTags → returns defaults when no SiteSetting row exists', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getTags();

    expect(result).toEqual({
      cloudDisplayCount: 50,
      sortBy: 'frequency',
      delimiters: ['comma'],
    });
  });

  it('SETTINGS-TAGS-002: getTags → returns stored values when row exists', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      value: { cloudDisplayCount: 80, sortBy: 'name', delimiters: ['hash', 'space'] },
    });

    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getTags();

    expect(result).toEqual({
      cloudDisplayCount: 80,
      sortBy: 'name',
      delimiters: ['hash', 'space'],
    });
  });

  it('SETTINGS-TAGS-003: updateTags → persists via siteSetting.upsert', async () => {
    mockSiteSettingUpsert.mockResolvedValue({});
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateTags({
      cloudDisplayCount: 100,
      sortBy: 'recent',
      delimiters: ['comma', 'hash', 'space'],
    });

    expect(result).toEqual({
      cloudDisplayCount: 100,
      sortBy: 'recent',
      delimiters: ['comma', 'hash', 'space'],
    });
    expect(mockSiteSettingUpsert).toHaveBeenCalledWith({
      where: { siteId_key: { siteId: 1, key: 'tagSettings' } },
      create: {
        siteId: 1,
        key: 'tagSettings',
        value: { cloudDisplayCount: 100, sortBy: 'recent', delimiters: ['comma', 'hash', 'space'] },
      },
      update: {
        value: { cloudDisplayCount: 100, sortBy: 'recent', delimiters: ['comma', 'hash', 'space'] },
      },
    });
  });

  it('SETTINGS-TAGS-004: updateTags → rejects empty delimiters array with BAD_REQUEST validation error', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateTags({
        cloudDisplayCount: 50,
        sortBy: 'frequency',
        delimiters: [],
      }),
    ).rejects.toThrow();
  });

  // ==========================================================================
  // Communication Settings Tests (REQ-ADMIN2-143)
  // ==========================================================================

  it('SETTINGS-COMMUNICATION-001: getCommunication → returns defaults when no SiteSetting exists', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockSiteSettingFindUnique.mockResolvedValue(null);

    const result = await caller.getCommunication();

    expect(result).toEqual({
      enabled: false,
      inboxLimit: 100,
    });
  });

  it('SETTINGS-COMMUNICATION-002: getCommunication → returns stored values', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'communication',
      value: { enabled: true, inboxLimit: 50 },
    });

    const result = await caller.getCommunication();

    expect(result).toEqual({
      enabled: true,
      inboxLimit: 50,
    });
  });

  it('SETTINGS-COMMUNICATION-003: updateCommunication → persists values via siteSetting.upsert inside transaction', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'communication',
      value: { enabled: true, inboxLimit: 50 },
    });

    await caller.updateCommunication({
      enabled: false,
      inboxLimit: 200,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockSiteSettingUpsert).toHaveBeenCalledWith({
      where: { siteId_key: { siteId: 1, key: 'communication' } },
      create: { siteId: 1, key: 'communication', value: { enabled: false, inboxLimit: 200 } },
      update: { value: { enabled: false, inboxLimit: 200 } },
    });
  });

  it('SETTINGS-COMMUNICATION-004: updateCommunication → writes AdminLog entry', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'communication',
      value: { enabled: true, inboxLimit: 50 },
    });

    await caller.updateCommunication({
      enabled: false,
      inboxLimit: 200,
    });

    expect(mockAdminLogCreate).toHaveBeenCalledWith({
      data: {
        actorId: 1,
        action: 'configure',
        target: 'site_setting:communication',
        diff: { before: { enabled: true, inboxLimit: 50 }, after: { enabled: false, inboxLimit: 200 } },
        ip: '::1',
        userAgent: 'test',
      },
    });
  });

  // ==========================================================================
  // Debug Settings Tests (REQ-ADMIN2-117/159/160)
  // ==========================================================================

  it('SETTINGS-DEBUG-001: getDebug → returns defaults when no SiteSetting exists', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockSiteSettingFindUnique.mockResolvedValue(null);

    const result = await caller.getDebug();

    expect(result).toEqual({
      enabled: false,
      slowQueryThreshold: 1.0,
      slowTriggerThreshold: 1.0,
      slowWidgetThreshold: 1.0,
      slowExternalThreshold: 1.0,
      displayMethods: ['html_comment'],
      contentTypes: ['error', 'slow_query', 'slow_trigger'],
      logFilePath: '',
      displayTarget: 'admin_only',
      allowedIps: [],
      addQueryComment: false,
      showFullCallStack: false,
      deduplicateErrors: true,
      errorLogLevel: 'critical_only',
    });
  });

  it('SETTINGS-DEBUG-002: getDebug → returns stored values', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'debug',
      value: {
        enabled: true,
        slowQueryThreshold: 0.5,
        slowTriggerThreshold: 2.0,
        slowWidgetThreshold: 1.5,
        slowExternalThreshold: 3.0,
        displayMethods: ['file_log', 'screen_panel'],
        contentTypes: ['error', 'slow_query'],
        logFilePath: '/var/log/debug.log',
        displayTarget: 'allowed_ips',
        allowedIps: ['192.168.1.1'],
        addQueryComment: true,
        showFullCallStack: true,
        deduplicateErrors: false,
        errorLogLevel: 'all_errors_warnings',
      },
    });

    const result = await caller.getDebug();

    expect(result).toEqual({
      enabled: true,
      slowQueryThreshold: 0.5,
      slowTriggerThreshold: 2.0,
      slowWidgetThreshold: 1.5,
      slowExternalThreshold: 3.0,
      displayMethods: ['file_log', 'screen_panel'],
      contentTypes: ['error', 'slow_query'],
      logFilePath: '/var/log/debug.log',
      displayTarget: 'allowed_ips',
      allowedIps: ['192.168.1.1'],
      addQueryComment: true,
      showFullCallStack: true,
      deduplicateErrors: false,
      errorLogLevel: 'all_errors_warnings',
    });
  });

  it('SETTINGS-DEBUG-003: updateDebug → persists values via siteSetting.upsert inside transaction', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const updateData = {
      enabled: true,
      slowQueryThreshold: 0.5,
      slowTriggerThreshold: 1.0,
      slowWidgetThreshold: 1.5,
      slowExternalThreshold: 2.0,
      displayMethods: ['html_comment', 'file_log'],
      contentTypes: ['error', 'slow_query'],
      logFilePath: '/var/log/rhymix/debug.log',
      displayTarget: 'admin_only',
      allowedIps: ['127.0.0.1'],
      addQueryComment: true,
      showFullCallStack: false,
      deduplicateErrors: true,
      errorLogLevel: 'all_errors_warnings',
    };

    await caller.updateDebug(updateData);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockSiteSettingUpsert).toHaveBeenCalledWith({
      where: { siteId_key: { siteId: 1, key: 'debug' } },
      create: { siteId: 1, key: 'debug', value: updateData },
      update: { value: updateData },
    });
  });

  it('SETTINGS-DEBUG-004: updateDebug → writes AdminLog entry', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const updateData = {
      enabled: false,
      slowQueryThreshold: 1.0,
      slowTriggerThreshold: 1.0,
      slowWidgetThreshold: 1.0,
      slowExternalThreshold: 1.0,
      displayMethods: ['html_comment'],
      contentTypes: ['error'],
      displayTarget: 'admin_only',
      allowedIps: [],
      addQueryComment: false,
      showFullCallStack: false,
      deduplicateErrors: true,
      errorLogLevel: 'critical_only',
    };

    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'debug',
      value: { enabled: true, slowQueryThreshold: 2.0 },
    });

    await caller.updateDebug(updateData);

    expect(mockAdminLogCreate).toHaveBeenCalledWith({
      data: {
        actorId: 1,
        action: 'configure',
        target: 'site_setting:debug',
        diff: { before: { enabled: true, slowQueryThreshold: 2.0 }, after: updateData },
        ip: '::1',
        userAgent: 'test',
      },
    });
  });

  it('SETTINGS-DEBUG-005: updateDebug → rejects negative threshold values', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateDebug({
        enabled: true,
        slowQueryThreshold: -1.0,
        slowTriggerThreshold: 1.0,
        slowWidgetThreshold: 1.0,
        slowExternalThreshold: 1.0,
        displayMethods: ['html_comment'],
        contentTypes: ['error'],
        displayTarget: 'admin_only',
        allowedIps: [],
        addQueryComment: false,
        showFullCallStack: false,
        deduplicateErrors: true,
        errorLogLevel: 'critical_only',
      }),
    ).rejects.toThrow();
  });

  it('SETTINGS-DEBUG-006: updateDebug → rejects empty displayMethods array', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateDebug({
        enabled: true,
        slowQueryThreshold: 1.0,
        slowTriggerThreshold: 1.0,
        slowWidgetThreshold: 1.0,
        slowExternalThreshold: 1.0,
        displayMethods: [],
        contentTypes: ['error'],
        displayTarget: 'admin_only',
        allowedIps: [],
        addQueryComment: false,
        showFullCallStack: false,
        deduplicateErrors: true,
        errorLogLevel: 'critical_only',
      }),
    ).rejects.toThrow();
  });

  it('SETTINGS-DEBUG-007: updateDebug → accepts all valid display methods and targets', async () => {
    const { adminSettingsRouter } = await import('./settings');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminSettingsRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const updateData = {
      enabled: true,
      slowQueryThreshold: 0.3,
      slowTriggerThreshold: 0.5,
      slowWidgetThreshold: 0.7,
      slowExternalThreshold: 1.0,
      displayMethods: ['html_comment', 'screen_panel', 'file_log'],
      contentTypes: ['request_response', 'debug_message', 'error', 'query', 'slow_query', 'slow_trigger', 'slow_widget', 'slow_external'],
      logFilePath: '/var/log/rhymix/debug.log',
      displayTarget: 'all',
      allowedIps: [],
      addQueryComment: true,
      showFullCallStack: true,
      deduplicateErrors: false,
      errorLogLevel: 'all_errors_warnings',
    };

    const result = await caller.updateDebug(updateData);

    expect(result).toEqual({ success: true });
  });
});
