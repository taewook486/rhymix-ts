/**
 * Specification tests for admin.poll tRPC router — SPEC-ADMIN-002 Slice 3A.
 *
 * POLL-LIST-001: list → 설문 목록 (제목/상태/투표수/기간)
 * POLL-GET-001: get → 단건 조회 (옵션 포함)
 * POLL-CREATE-001: create → 설문 생성 (질문/옵션/복수선택/투표기간)
 * POLL-UPDATE-001: update → 설문 수정
 * POLL-DELETE-001: delete → 설문 삭제
 * POLL-RESULTS-001: results → 옵션별 투표수/백분율
 * POLL-CONFIG-001/002: config.get/config.set → 전역 기본값
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

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

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: (session: unknown) =>
    (session as { user?: { isAdmin?: boolean } } | null)?.user?.isAdmin === true,
}));

vi.mock('@/lib/auth/two-factor', () => ({
  isAdminTwoFactorRequired: vi.fn().mockResolvedValue(false),
  isSessionTwoFactorVerified: vi.fn().mockReturnValue(true),
}));

const mockSiteFindFirst = vi.fn();
const mockPollFindMany = vi.fn();
const mockPollFindFirst = vi.fn();
const mockPollFindUnique = vi.fn();
const mockPollCreate = vi.fn();
const mockPollUpdate = vi.fn();
const mockPollDelete = vi.fn();
const mockPollVoteFindMany = vi.fn();
const mockSiteSettingFindUnique = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockSiteSettingCreate = vi.fn();
const mockSiteSettingUpsert = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockTransaction = vi.fn();

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  poll: {
    findMany: (...args: unknown[]) => mockPollFindMany(...args),
    findFirst: (...args: unknown[]) => mockPollFindFirst(...args),
    findUnique: (...args: unknown[]) => mockPollFindUnique(...args),
    create: (...args: unknown[]) => mockPollCreate(...args),
    update: (...args: unknown[]) => mockPollUpdate(...args),
    delete: (...args: unknown[]) => mockPollDelete(...args),
  },
  pollVote: {
    findMany: (...args: unknown[]) => mockPollVoteFindMany(...args),
  },
  siteSetting: {
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    create: (...args: unknown[]) => mockSiteSettingCreate(...args),
    upsert: (...args: unknown[]) => mockSiteSettingUpsert(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (...args: unknown[]) => mockTransaction(...args),
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.poll tRPC router (Slice 3A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('POLL-LIST-001: list → 설문 목록 (제목/상태/투표수/기간)', async () => {
    mockPollFindMany.mockResolvedValue([
      {
        id: 1,
        title: '좋아하는 언어',
        startAt: new Date('2020-01-01T00:00:00Z'),
        endAt: new Date('2020-01-31T00:00:00Z'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        duplicateVotePolicy: 'by-member',
        _count: { votes: 5 },
      },
    ]);

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      title: '좋아하는 언어',
      voteCount: 5,
    });
    expect(result[0]?.status).toBe('closed');
  });

  it('POLL-GET-001: get → 단건 조회 (옵션 포함)', async () => {
    mockPollFindFirst.mockResolvedValue({
      id: 1,
      siteId: 1,
      title: '좋아하는 언어',
      description: null,
      allowGuestVote: false,
      allowMultipleChoice: true,
      duplicateVotePolicy: 'by-member',
      startAt: new Date('2026-06-01T00:00:00Z'),
      endAt: new Date('2026-06-30T00:00:00Z'),
      options: [
        { id: 1, label: 'TypeScript', sortOrder: 0 },
        { id: 2, label: 'Go', sortOrder: 1 },
      ],
    });

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.get({ id: 1 });

    expect(result.title).toBe('좋아하는 언어');
    expect(result.options).toHaveLength(2);
  });

  it('POLL-GET-002: get → 존재하지 않으면 NOT_FOUND', async () => {
    mockPollFindFirst.mockResolvedValue(null);

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(caller.get({ id: 999 })).rejects.toThrow();
  });

  it('POLL-CREATE-001: create → 설문 생성 (질문/옵션/복수선택/투표기간)', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        poll: {
          create: vi.fn().mockResolvedValue({
            id: 1,
            siteId: 1,
            title: '좋아하는 언어',
            description: null,
            allowGuestVote: false,
            allowMultipleChoice: true,
            duplicateVotePolicy: 'by-member',
            startAt: new Date('2026-06-01T00:00:00Z'),
            endAt: new Date('2026-06-30T00:00:00Z'),
          }),
        },
        adminLog: { create: mockAdminLogCreate },
      };
      return fn(tx);
    });

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.create({
      title: '좋아하는 언어',
      allowGuestVote: false,
      allowMultipleChoice: true,
      duplicateVotePolicy: 'by-member',
      startAt: new Date('2026-06-01T00:00:00Z'),
      endAt: new Date('2026-06-30T00:00:00Z'),
      options: [{ label: 'TypeScript' }, { label: 'Go' }],
    });

    expect(result.title).toBe('좋아하는 언어');
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('POLL-CREATE-002: create → 옵션이 2개 미만이면 BAD_REQUEST', async () => {
    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.create({
        title: '단일 옵션 설문',
        allowGuestVote: false,
        allowMultipleChoice: false,
        duplicateVotePolicy: 'by-member',
        startAt: new Date('2026-06-01T00:00:00Z'),
        endAt: new Date('2026-06-30T00:00:00Z'),
        options: [{ label: '옵션 하나뿐' }],
      }),
    ).rejects.toThrow();
  });

  it('POLL-UPDATE-001: update → 설문 수정', async () => {
    mockPollFindFirst.mockResolvedValue({ id: 1, siteId: 1 });
    mockPollUpdate.mockResolvedValue({
      id: 1,
      siteId: 1,
      title: '수정된 제목',
      description: null,
      allowGuestVote: true,
      allowMultipleChoice: false,
      duplicateVotePolicy: 'by-ip',
      startAt: new Date('2026-06-01T00:00:00Z'),
      endAt: new Date('2026-06-30T00:00:00Z'),
    });

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({
      id: 1,
      title: '수정된 제목',
      allowGuestVote: true,
      allowMultipleChoice: false,
      duplicateVotePolicy: 'by-ip',
      startAt: new Date('2026-06-01T00:00:00Z'),
      endAt: new Date('2026-06-30T00:00:00Z'),
    });

    expect(result.title).toBe('수정된 제목');
    expect(mockAdminLogCreate).toHaveBeenCalled();
  });

  it('POLL-DELETE-001: delete → 설문 삭제', async () => {
    mockPollFindFirst.mockResolvedValue({ id: 1, siteId: 1, title: '삭제될 설문' });
    mockPollDelete.mockResolvedValue({});

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.delete({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(mockPollDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('POLL-RESULTS-001: results → 옵션별 투표수/백분율', async () => {
    mockPollFindFirst.mockResolvedValue({
      id: 1,
      siteId: 1,
      title: '좋아하는 언어',
      options: [
        { id: 1, label: 'TypeScript', sortOrder: 0 },
        { id: 2, label: 'Go', sortOrder: 1 },
      ],
    });
    mockPollVoteFindMany.mockResolvedValue([
      { pollOptionId: 1 },
      { pollOptionId: 1 },
      { pollOptionId: 2 },
    ]);

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.results({ id: 1 });

    expect(result.totalVotes).toBe(3);
    expect(result.options.find((o) => o.id === 1)?.voteCount).toBe(2);
    expect(result.options.find((o) => o.id === 1)?.percentage).toBeCloseTo(66.6667, 3);
  });

  it('POLL-CONFIG-001: config.get → 전역 기본값 조회', async () => {
    mockSiteSettingFindUnique.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'pollConfig',
      value: { allowGuestVote: true, duplicateVotePolicy: 'by-ip' },
    });

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.config.get();

    expect(result.allowGuestVote).toBe(true);
    expect(result.duplicateVotePolicy).toBe('by-ip');
  });

  it('POLL-CONFIG-002: config.set → 전역 기본값 업데이트', async () => {
    mockSiteSettingUpsert.mockResolvedValue({
      id: 1,
      siteId: 1,
      key: 'pollConfig',
      value: { allowGuestVote: true, duplicateVotePolicy: 'by-cookie' },
    });

    const { adminPollRouter } = await import('./poll');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminPollRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.config.set({
      allowGuestVote: true,
      duplicateVotePolicy: 'by-cookie',
    });

    expect(result.duplicateVotePolicy).toBe('by-cookie');
    expect(mockAdminLogCreate).toHaveBeenCalled();
  });
});
