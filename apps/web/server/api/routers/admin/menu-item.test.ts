/**
 * Specification tests for admin.menuItem tRPC router — SPEC-ADMIN-001 Slice D + Slice E.
 *
 * D-8:  menuItem.create({ menuId, parentId, title, url, groupIds }) → prisma.menuItem.create 호출됨.
 * D-9:  menuItem.update({ id, parentId, listOrder }) → prisma.$transaction 안에서 menuItem.update 호출됨.
 * D-10: menuItem.delete({ id }) → prisma.menuItem.delete 호출됨.
 * E-2-1: menuItem.reorder → items 순서대로 listOrder 갱신.
 * E-2-2: menuItem.reorder 빈 items → updated: 0, DB 호출 없음.
 * E-2-3: menuItem.reorder 존재하지 않는 menuId → NOT_FOUND.
 * E-2-4: menuItem.reorder → $transaction 호출 증거.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@rhymix-ts/db';

// NextAuth + authConfig mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

// DB mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockMenuItemCreate = vi.fn();
const mockMenuItemUpdate = vi.fn();
const mockMenuItemDelete = vi.fn();
const mockMenuItemFindMany = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockMenuFindUnique = vi.fn();

// $transaction mock: 배열을 받아 실행하거나 콜백을 받아 tx 로 실행
const mockTransaction = vi.fn().mockImplementation(async (fnOrArray: unknown) => {
  if (Array.isArray(fnOrArray)) {
    // 배열 형태 (reorder에서 사용)
    return Promise.all(fnOrArray);
  }
  // 콜백 형태 (update에서 사용)
  const tx = {
    menuItem: {
      update: (...args: unknown[]) => mockMenuItemUpdate(...args),
    },
  };
  return (fnOrArray as (tx: unknown) => unknown)(tx);
});

const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  menu: {
    findUnique: (...args: unknown[]) => mockMenuFindUnique(...args),
  },
  menuItem: {
    create: (...args: unknown[]) => mockMenuItemCreate(...args),
    update: (...args: unknown[]) => mockMenuItemUpdate(...args),
    delete: (...args: unknown[]) => mockMenuItemDelete(...args),
    findMany: (...args: unknown[]) => mockMenuItemFindMany(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (...args: unknown[]) => mockTransaction(...args),
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.menuItem tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('D-8: admin menuItem.create → prisma.menuItem.create 가 menuId/title/groupIds 로 호출됨 (REQ-ADMIN-030, REQ-ADMIN-032)', async () => {
    const createdItem = {
      id: 10, menuId: 1, parentId: null, title: 'Home', url: '/',
      groupIds: [1, 2], listOrder: 0,
      icon: null, cssClass: null, description: null,
      openInNewWindow: false, expand: false,
      normalBtn: null, hoverBtn: null, activeBtn: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    mockMenuItemCreate.mockResolvedValueOnce(createdItem);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.create({
      menuId: 1,
      parentId: null,
      title: 'Home',
      url: '/',
      groupIds: [1, 2],
    });

    expect(mockMenuItemCreate).toHaveBeenCalledOnce();
    expect(mockMenuItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          menuId: 1,
          title: 'Home',
          groupIds: [1, 2],
        }),
      }),
    );
    expect(result).toMatchObject({ id: 10, title: 'Home', groupIds: [1, 2] });
  });

  it('D-9: admin menuItem.update({ id, parentId, listOrder }) → $transaction 안에서 menuItem.update 호출됨 (REQ-ADMIN-031 transactional)', async () => {
    const updatedItem = { id: 5, menuId: 1, parentId: 3, listOrder: 2, title: 'Home', url: '/' };
    mockMenuItemUpdate.mockResolvedValueOnce(updatedItem);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({ id: 5, parentId: 3, listOrder: 2 });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockMenuItemUpdate).toHaveBeenCalledOnce();
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ parentId: 3, listOrder: 2 }),
      }),
    );
    expect(result).toMatchObject({ id: 5, parentId: 3, listOrder: 2 });
  });

  it('D-10: admin menuItem.delete({ id }) → prisma.menuItem.delete 호출됨 (REQ-ADMIN-030)', async () => {
    const deleted = { id: 5, menuId: 1, parentId: null, title: 'Home' };
    mockMenuItemDelete.mockResolvedValueOnce(deleted);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.delete({ id: 5 });

    expect(mockMenuItemDelete).toHaveBeenCalledOnce();
    expect(mockMenuItemDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice E-2: admin.menuItem.reorder 테스트
// ---------------------------------------------------------------------------

describe('admin.menuItem.reorder (Slice E-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
    // 기본적으로 menu 존재하는 상황
    mockMenuFindUnique.mockResolvedValue({ id: 1, title: '메인메뉴' });
    // reorder 순환검사가 읽는 기존 rows — 기본값 없음
    mockMenuItemFindMany.mockResolvedValue([]);
    // menuItem.update 기본 반환값
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0 });
  });

  it('E-2-1: items 순서대로 listOrder 갱신 (REQ-ADMIN-031)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const items = [
      { id: 3, parentId: null, listOrder: 0 },
      { id: 1, parentId: null, listOrder: 1 },
      { id: 2, parentId: null, listOrder: 2 },
    ];

    const result = await caller.reorder({ menuId: 1, items });

    expect(result).toMatchObject({ updated: 3 });
    expect(mockMenuItemUpdate).toHaveBeenCalledTimes(3);
  });

  it('E-2-2: 빈 items → updated: 0, DB 호출 없음 (REQ-ADMIN-031)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.reorder({ menuId: 1, items: [] });

    expect(result).toMatchObject({ updated: 0 });
    expect(mockMenuItemUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('E-2-3: 존재하지 않는 menuId → NOT_FOUND (REQ-ADMIN-031)', async () => {
    mockMenuFindUnique.mockResolvedValue(null);

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.reorder({ menuId: 999, items: [{ id: 1, parentId: null, listOrder: 0 }] }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('E-2-4: $transaction 호출 증거 (REQ-ADMIN-031 transactional)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.reorder({
      menuId: 1,
      items: [
        { id: 1, parentId: null, listOrder: 0 },
        { id: 2, parentId: null, listOrder: 1 },
      ],
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    // 배열 형태의 $transaction 이어야 함
    const arg = mockTransaction.mock.calls[0]![0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Slice I-2: cross-level DnD (REQ-ADMIN-031)
// ---------------------------------------------------------------------------

describe('admin.menuItem.reorder cross-level DnD (Slice I-2 — REQ-ADMIN-031)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
    mockMenuFindUnique.mockResolvedValue({ id: 1, title: '메인메뉴' });
    mockMenuItemFindMany.mockResolvedValue([]);
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0, parentId: null });
  });

  it('I-2-1: parentId 변경 + listOrder 갱신 → 단일 $transaction 으로 처리 (REQ-ADMIN-031)', async () => {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // 아이템 1이 parentId: null → parentId: 5 로 이동
    const items = [
      { id: 1, parentId: 5, listOrder: 0 },
    ];

    const result = await caller.reorder({ menuId: 1, items });
    expect(result).toMatchObject({ updated: 1 });

    // menuItem.update 에 parentId: 5 + listOrder: 0 가 전달됨
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ parentId: 5, listOrder: 0 }),
      }),
    );
    // $transaction 호출됨
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('I-2-2: 여러 항목의 parentId 가 각각 다른 값으로 → 모두 갱신 (REQ-ADMIN-031)', async () => {
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0, parentId: 5 });

    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const items = [
      { id: 1, parentId: 5, listOrder: 0 },   // item1 → 부모 5 아래 0번째
      { id: 2, parentId: 10, listOrder: 0 },  // item2 → 부모 10 아래 0번째
      { id: 3, parentId: 10, listOrder: 1 },  // item3 → 부모 10 아래 1번째
    ];

    const result = await caller.reorder({ menuId: 1, items });
    expect(result).toMatchObject({ updated: 3 });
    expect(mockMenuItemUpdate).toHaveBeenCalledTimes(3);

    // 각 항목이 올바른 parentId + listOrder 로 갱신됨
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ parentId: 5, listOrder: 0 }),
      }),
    );
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({ parentId: 10, listOrder: 0 }),
      }),
    );
    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({ parentId: 10, listOrder: 1 }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 M3 — 버튼 필드 입력 형태 정합화 (AC-SITE-011 tRPC 경계)
//
// MenuItemInput 의 버튼 3종 필드는 현재 z.unknown().optional() 이라 무엇이든
// 통과한다. design.md D1 정합화(이미지 참조형 {"image", "alt"?} | null | undefined
// 의 닫힌 집합)를 이 경계에서 강제한다 — actions.ts 는 이 스키마를 통과한 값만
// prisma 에 전달하므로, tRPC 입력이 마지막 방어선이다.
// ---------------------------------------------------------------------------

describe('admin.menuItem.update 버튼 필드 형태 (SPEC-LEGACY-PARITY-001 M3, AC-SITE-011)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null);
  });

  async function makeCaller() {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createCaller(adminCtx as any);
  }

  it('M3-1: 이미지 참조형 {"image", "alt"?}는 그대로 prisma update에 전달된다', async () => {
    mockMenuItemUpdate.mockResolvedValueOnce({ id: 7 });
    const caller = await makeCaller();

    await caller.update({
      id: 7,
      normalBtn: { image: '2026/08/uuid-a', alt: '소개' },
    } as never);

    expect(mockMenuItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({
          normalBtn: { image: '2026/08/uuid-a', alt: '소개' },
        }),
      }),
    );
  });

  it('M3-2: null(상태별 제거)은 Prisma.DbNull 로 전달된다 — undefined(변경 없음)와 구분', async () => {
    mockMenuItemUpdate.mockResolvedValueOnce({ id: 7 });
    const caller = await makeCaller();

    await caller.update({ id: 7, normalBtn: null, hoverBtn: undefined } as never);

    const data = mockMenuItemUpdate.mock.calls[0]![0].data as Record<string, unknown>;
    // 평범한 null 을 그대로 넘기면 Prisma 가 Json? 컬럼에 SQL NULL 이 아니라
    // JSON null('null'::jsonb)을 기록해 "IS NULL" 이 false 로 남는다(실측).
    // 저장 계층에 도달하는 값이 DbNull 인지까지 봐야 AC-SITE-003 이 성립한다.
    expect(data.normalBtn).toBe(Prisma.DbNull);
    expect(data.normalBtn).not.toBeNull();
    // undefined(변경 없음)는 DbNull 로 바뀌지 않는다 — Prisma 는 undefined 를
    // "이 필드는 건드리지 않음"으로 읽는다
    expect(data.hoverBtn).toBeUndefined();
  });

  // e2e 는 normal 제거만 실행한다 — hover/active 도 같은 변환을 받는지, 그리고
  // 한 상태를 지울 때 나머지 두 상태가 건드려지지 않는지를 여기서 고정한다.
  it.each([
    ['normalBtn', ['hoverBtn', 'activeBtn']],
    ['hoverBtn', ['normalBtn', 'activeBtn']],
    ['activeBtn', ['normalBtn', 'hoverBtn']],
  ] as const)(
    'M3-4: %s 만 제거하면 DbNull 로 변환되고 나머지 2종은 patch 에 실리지 않는다',
    async (removed, untouched) => {
      mockMenuItemUpdate.mockResolvedValueOnce({ id: 7 });
      const caller = await makeCaller();

      await caller.update({ id: 7, [removed]: null } as never);

      const data = mockMenuItemUpdate.mock.calls[0]![0].data as Record<string, unknown>;
      expect(data[removed]).toBe(Prisma.DbNull);
      for (const field of untouched) {
        // undefined = Prisma 가 "이 컬럼은 건드리지 않음"으로 읽는 값
        expect(data[field]).toBeUndefined();
      }
    },
  );

  it('M3-3: 정합화 외 값(구 {label, href} 스타일)은 입력 검증에서 거부된다 (닫힌 집합)', async () => {
    const caller = await makeCaller();

    // 현재 z.unknown() 은 무엇이든 통과시켜 prisma 까지 도달한다 — RED 재현.
    await expect(
      caller.update({
        id: 7,
        normalBtn: { label: '구형', href: '/old', icon: 'x', target: '_blank' },
      } as never),
    ).rejects.toThrow();
    expect(mockMenuItemUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 M4 — admin.menuItem.duplicate (AC-SITE-001 단위 부분)
//
// 단위 검증은 상태 저장 in-memory fake 로 **최종 행 상태**를 관찰한다 — mock
// 호출 기록이 아니라 남은 rows 자체를 본다 (B1: Prisma mock 은 전달값만 보고
// 저장 형태를 가린다 — M3 결함 2의 교훈). fake 는 create 에 전달된 값을 그대로
// 저장하므로, 평범한 null 이 버튼 컬럼에 실리면(real Prisma 는 'null'::jsonb
// 를 쓴다) rows 에서 그대로 보인다.
// ---------------------------------------------------------------------------

/** M4 fake 행 — schema.prisma MenuItem 스칼라 전부 */
interface M4Row {
  id: number;
  menuId: number;
  parentId: number | null;
  title: string;
  url: string | null;
  icon: string | null;
  cssClass: string | null;
  description: string | null;
  groupIds: number[];
  openInNewWindow: boolean;
  expand: boolean;
  listOrder: number;
  normalBtn: unknown;
  hoverBtn: unknown;
  activeBtn: unknown;
}

function m4Row(partial: Partial<M4Row> & Pick<M4Row, 'id' | 'title'>): M4Row {
  return {
    menuId: 1,
    parentId: null,
    url: null,
    icon: null,
    cssClass: null,
    description: null,
    groupIds: [],
    openInNewWindow: false,
    expand: false,
    listOrder: 0,
    normalBtn: null,
    hoverBtn: null,
    activeBtn: null,
    ...partial,
  };
}

/**
 * 상태 저장 fake — duplicate 호출 뒤 rows 배열이 최종 DB 상태다.
 * where/data 는 duplicate 가 쓸 수 있는 형태만 지원하고, 계약 밖 형태는
 * 조용히 통과하지 않고 예외를 낸다.
 */
function makeDuplicateFake(seed: M4Row[], createCap = Infinity) {
  const rows: M4Row[] = seed.map((r) => ({ ...r, groupIds: [...r.groupIds] }));
  const createdInTx: boolean[] = [];
  let nextId = 1000;
  let inTx = false;
  // 가드가 없으면 순환/병적 깊이에서 create 가 무한 호출된다. 상한을 두어
  // 테스트가 무한 루프에 빠지지 않고 "가드 부재" 를 관측할 수 있게 한다.
  let createCount = 0;

  const menuItem = {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) =>
      rows.find((r) => r.id === where.id) ?? null,
    ),
    findMany: vi.fn(async ({ where }: { where: { menuId: number } }) =>
      rows.filter((r) => r.menuId === where.menuId).map((r) => ({ ...r })),
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      createCount += 1;
      if (createCount > createCap) {
        throw new Error(`fake: create 호출이 상한(${createCap})을 초과 — 무한 재귀 의심`);
      }
      const id = nextId++;
      const row = {
        ...m4Row({ id, title: typeof data.title === 'string' ? data.title : '' }),
        ...data,
        id,
      } as unknown as M4Row;
      rows.push(row);
      createdInTx.push(inTx);
      return { ...row };
    }),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: number };
        data: { listOrder?: number | { increment: number } };
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error(`fake: update 대상 없음 id=${where.id}`);
        if (data.listOrder !== undefined) {
          row.listOrder =
            typeof data.listOrder === 'number'
              ? data.listOrder
              : row.listOrder + data.listOrder.increment;
        }
        return { ...row };
      },
    ),
    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { menuId: number; parentId?: number | null; listOrder?: { gt?: number } };
        data: { listOrder?: number | { increment: number } };
      }) => {
        let count = 0;
        for (const row of rows) {
          if (row.menuId !== where.menuId) continue;
          if ('parentId' in where && (row.parentId ?? null) !== (where.parentId ?? null)) continue;
          if (where.listOrder?.gt !== undefined && !(row.listOrder > where.listOrder.gt)) continue;
          if (data.listOrder !== undefined) {
            row.listOrder =
              typeof data.listOrder === 'number'
                ? data.listOrder
                : row.listOrder + data.listOrder.increment;
          }
          count += 1;
        }
        return { count };
      },
    ),
    delete: vi.fn(async () => {
      throw new Error('fake: duplicate 는 delete 를 쓰지 않는다');
    }),
  };

  const prisma = {
    siteSetting: { findFirst: vi.fn(async () => null) },
    adminLog: { create: vi.fn(async () => ({ id: BigInt(1) })) },
    menu: {
      findUnique: vi.fn(async ({ where }: { where: { id: number } }) =>
        where.id === 1 ? { id: 1, title: '메인메뉴' } : null,
      ),
    },
    menuItem,
    $transaction: vi.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      inTx = true;
      try {
        return await (arg as (tx: unknown) => unknown)({ menuItem });
      } finally {
        inTx = false;
      }
    }),
  };

  return { prisma, rows, createdInTx };
}

describe('admin.menuItem.duplicate (SPEC-LEGACY-PARITY-001 M4, AC-SITE-001)', () => {
  /** AC-SITE-001 픽스처 — 형제 3개(A,B,C) + 복제 대상 A 에 2단계 중첩 자식 */
  function acFixture(): M4Row[] {
    return [
      m4Row({
        id: 1, title: 'A', listOrder: 0,
        normalBtn: { image: '2026/08/a-key', alt: 'A' },
      }),
      m4Row({ id: 11, title: 'A-1', parentId: 1, listOrder: 0, groupIds: [4, 7], openInNewWindow: true }),
      m4Row({ id: 111, title: 'A-1-a', parentId: 11, listOrder: 0, expand: true }),
      m4Row({ id: 12, title: 'A-2', parentId: 1, listOrder: 1 }),
      m4Row({ id: 2, title: 'B', listOrder: 1 }),
      m4Row({ id: 3, title: 'C', listOrder: 2 }),
    ];
  }

  async function makeDuplicateCaller(seed: M4Row[]) {
    const fake = makeDuplicateFake(seed);
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller({ ...adminCtx, prisma: fake.prisma } as any);
    return { caller, fake };
  }

  it('M4-1: A(형제 3개 + 2단계 중첩) 복제 → 서브트리 전체 복사 + listOrder 충돌 0건', async () => {
    const seed = acFixture();
    const { caller, fake } = await makeDuplicateCaller(seed);

    const result = await caller.duplicate({ id: 1 });

    // 신규 행 4개 (A, A-1, A-1-a, A-2 사본) — 전부 새 id, 전부 단일 $transaction 안 (B2)
    const created = fake.rows.filter((r) => r.id >= 1000);
    expect(created).toHaveLength(4);
    expect(fake.createdInTx).toEqual([true, true, true, true]);

    // 루트 사본: 같은 부모(null), 원본 바로 뒤 listOrder 1
    const rootCopy = created.find((r) => r.parentId === null);
    expect(rootCopy).toBeDefined();
    expect(rootCopy!.title).toBe('A');
    expect(rootCopy!.listOrder).toBe(1);
    expect(result).toMatchObject({ id: rootCopy!.id, created: 4 });

    // 버튼 참조형 값이 그대로 복사된다 (M3 형태 보존)
    expect(rootCopy!.normalBtn).toEqual({ image: '2026/08/a-key', alt: 'A' });

    // 자식 사본 체인 — parentId 가 새 id 들을 가리킨다 (재귀 전체 복사)
    const a1copy = created.find((r) => r.title === 'A-1');
    expect(a1copy!.parentId).toBe(rootCopy!.id);
    expect(a1copy!.listOrder).toBe(0);
    expect(a1copy!.groupIds).toEqual([4, 7]);
    expect(a1copy!.openInNewWindow).toBe(true);

    const a1acopy = created.find((r) => r.title === 'A-1-a');
    expect(a1acopy!.parentId).toBe(a1copy!.id);
    expect(a1acopy!.listOrder).toBe(0);
    expect(a1acopy!.expand).toBe(true);

    const a2copy = created.find((r) => r.title === 'A-2');
    expect(a2copy!.parentId).toBe(rootCopy!.id);
    expect(a2copy!.listOrder).toBe(1);

    // 원본 서브트리 불변
    const a1 = fake.rows.find((r) => r.id === 11);
    expect(a1!.parentId).toBe(1);
    expect(a1!.listOrder).toBe(0);
    const a = fake.rows.find((r) => r.id === 1);
    expect(a!.listOrder).toBe(0);

    // 형제 shift — 최상위 listOrder 는 [0,1,2,3] 이고 전 계층에서 충돌 0건
    const topLevel = fake.rows
      .filter((r) => r.parentId === null)
      .map((r) => r.listOrder)
      .sort();
    expect(topLevel).toEqual([0, 1, 2, 3]);
    for (const pid of new Set(fake.rows.map((r) => r.parentId))) {
      const orders = fake.rows.filter((r) => r.parentId === pid).map((r) => r.listOrder);
      expect(new Set(orders).size, `parentId=${pid} listOrder 충돌`).toBe(orders.length);
    }

    // B1: 소스 버튼이 비어 있으면(픽스처 null) 사본 생성 시 평범한 null 이 전달되면
    // 안 된다 — real Prisma 는 'null'::jsonb 를 쓴다. 필드 생략(undefined) 또는
    // DbNull 만 SQL NULL 이 된다.
    expect([undefined, Prisma.DbNull]).toContain(a1copy!.normalBtn);
    expect(a1copy!.normalBtn).not.toBeNull();
  });

  it('M4-2: 존재하지 않는 id → NOT_FOUND', async () => {
    const { caller } = await makeDuplicateCaller(acFixture());

    await expect(caller.duplicate({ id: 999 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});


// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 감사 결함 D4 (major) — 메뉴 트리 순환 가드
//
// reorder 는 각 item 의 새 parentId 를 검증 없이 기록한다. 항목이 자기 자신이나
// 자신의 하위 항목을 부모로 지정하면 부모 그래프에 순환이 생긴다(DnD 페이로드 또는
// 악의적 클라이언트). 순환은 duplicate.copySubtree / buildMenuTree 의 무한 재귀
// 벡터이므로 루트 원인인 reorder 경계에서 거부해야 한다.
// ---------------------------------------------------------------------------

describe('admin.menuItem.reorder 순환 가드 (SPEC-LEGACY-PARITY-001 D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null);
    mockMenuFindUnique.mockResolvedValue({ id: 1, title: '메인메뉴' });
    mockMenuItemUpdate.mockResolvedValue({ id: 1, listOrder: 0 });
    mockMenuItemFindMany.mockResolvedValue([]);
  });

  async function makeCaller() {
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createCaller(adminCtx as any);
  }

  it('D4-1: 항목이 자기 자신을 부모로 지정하면 BAD_REQUEST — DB 미변경(롤백 동치)', async () => {
    const caller = await makeCaller();

    await expect(
      caller.reorder({ menuId: 1, items: [{ id: 5, parentId: 5, listOrder: 0 }] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    // 순환은 쓰기 전에 거부된다 — update/$transaction 모두 미호출
    expect(mockMenuItemUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('D4-2: 배치 내부 2노드 순환(A↔B)이면 BAD_REQUEST', async () => {
    const caller = await makeCaller();

    await expect(
      caller.reorder({
        menuId: 1,
        items: [
          { id: 1, parentId: 2, listOrder: 0 },
          { id: 2, parentId: 1, listOrder: 0 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockMenuItemUpdate).not.toHaveBeenCalled();
  });

  it('D4-3: 항목을 자신의 하위(기존 rows 기준)로 이동하면 BAD_REQUEST', async () => {
    // 기존 트리: 1(root) → 2 → 3 (3 은 1 의 손자)
    mockMenuItemFindMany.mockResolvedValue([
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
    ]);
    const caller = await makeCaller();

    // 1 을 자신의 손자 3 아래로 → 1→3→2→1 순환
    await expect(
      caller.reorder({ menuId: 1, items: [{ id: 1, parentId: 3, listOrder: 0 }] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(mockMenuItemUpdate).not.toHaveBeenCalled();
  });

  it('D4-4: 순환 없는 정상 배치는 통과한다 (거짓 양성 방지)', async () => {
    // 기존 트리: 1(root) → {2, 3}
    mockMenuItemFindMany.mockResolvedValue([
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 1 },
    ]);
    const caller = await makeCaller();

    // 3 을 2 아래로 (정상 — 순환 아님)
    const result = await caller.reorder({
      menuId: 1,
      items: [{ id: 3, parentId: 2, listOrder: 0 }],
    });

    expect(result).toMatchObject({ updated: 1 });
    expect(mockMenuItemUpdate).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 D4 — duplicate.copySubtree 무한 재귀 방어
//
// reorder 가 순환을 만들어 두면(또는 병적으로 깊은 트리) copySubtree 는 visited/
// depth 가드 없이 childrenOf 를 따라 무한히 create 를 호출한다. fake 의 create
// 상한(runaway cap)은 가드 부재 시 일반 Error 를 던지므로 BAD_REQUEST 단언이
// 실패(RED)하고, 가드가 있으면 상한 도달 전에 BAD_REQUEST 로 끊긴다.
// ---------------------------------------------------------------------------

describe('admin.menuItem.duplicate 순환/깊이 가드 (SPEC-LEGACY-PARITY-001 D4)', () => {
  async function makeCappedCaller(seed: M4Row[], createCap: number) {
    const fake = makeDuplicateFake(seed, createCap);
    const { adminMenuItemRouter } = await import('./menu-item');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminMenuItemRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller({ ...adminCtx, prisma: fake.prisma } as any);
    return { caller, fake };
  }

  it('D4-5: 도달 가능한 서브트리 순환(A→B→A)이면 무한 재귀 대신 BAD_REQUEST', async () => {
    // 두 행이 서로를 부모로 가리킨다 → source(10) 에서 childrenOf 를 따라가면 순환.
    const seed: M4Row[] = [
      m4Row({ id: 10, title: 'X', parentId: 20, listOrder: 0 }),
      m4Row({ id: 20, title: 'Y', parentId: 10, listOrder: 0 }),
    ];
    const { caller } = await makeCappedCaller(seed, 500);

    await expect(caller.duplicate({ id: 10 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('D4-6: 깊이 상한(100) 초과 서브트리는 BAD_REQUEST (병적 트리 방어)', async () => {
    // 상한보다 깊은 정상 선형 체인 — 가드가 없으면 전부 복사되어 resolve(RED),
    // 가드가 있으면 깊이 상한에서 BAD_REQUEST.
    const seed: M4Row[] = [];
    for (let i = 1; i <= 110; i += 1) {
      seed.push(m4Row({ id: i, title: `n${i}`, parentId: i === 1 ? null : i - 1, listOrder: 0 }));
    }
    const { caller } = await makeCappedCaller(seed, 500);

    await expect(caller.duplicate({ id: 1 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
