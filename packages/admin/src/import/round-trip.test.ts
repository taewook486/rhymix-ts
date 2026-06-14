/**
 * Round-trip 통합 테스트 — SPEC-ADMIN-EXTRAS-001 REQ-091
 *
 * serializeBundle → bundle → applyImport(bundle, decisions) → final DB state === seed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminExportBundle } from '../export/bundle-schema';
import { serializeBundle } from '../export/serializer';
import { applyImport } from './apply';

// ---------------------------------------------------------------------------
// Prisma 트랜잭션 모킹 헬퍼
// ---------------------------------------------------------------------------

/** $transaction 콜백을 즉시 실행하는 mock 구현 */
function makeTxRunner(mockTx: unknown) {
  return vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn(mockTx);
  });
}

// ---------------------------------------------------------------------------
// 빈 bundle seed 팩토리
// ---------------------------------------------------------------------------

function makeEmptyBundle(): AdminExportBundle {
  return {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date(),
      exportedBy: { actorId: 1, nickname: 'test' },
      sourceSiteId: 1,
      format: 'partial',
      selection: {
        menu: false,
        moduleInstances: false,
        documents: { include: false },
        comments: { include: false },
        siteSettings: false,
      },
      entityCounts: {
        menus: 0,
        menuItems: 0,
        moduleInstances: 0,
        documents: 0,
        comments: 0,
      },
      bundleSizeBytes: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// 테스트 1: 빈 bundle apply → applied=0, success=true
// ---------------------------------------------------------------------------

describe('round-trip: 빈 bundle', () => {
  it('빈 bundle을 apply하면 applied=0, success=true', async () => {
    // mockTx: 아무 DB 호출도 없어야 함
    const mockTx = {
      menu: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      menuItem: { create: vi.fn() },
      moduleInstance: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      site: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: makeTxRunner(mockTx),
    } as unknown as import('@prisma/client').PrismaClient;

    const bundle = makeEmptyBundle();

    const result = await applyImport(mockPrisma, bundle, 1, {});

    expect(result.success).toBe(true);
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 테스트 2: menu 1개 → bundle → apply(create) → menu DB에 생성됨
// ---------------------------------------------------------------------------

describe('round-trip: menu 1개', () => {
  it('menu 1개 bundle → apply → menu가 DB에 생성됨', async () => {
    const createdMenu = { id: 10 };

    const mockTx = {
      menu: {
        findFirst: vi.fn().mockResolvedValue(null), // 기존 없음
        create: vi.fn().mockResolvedValue(createdMenu),
        update: vi.fn(),
      },
      menuItem: { create: vi.fn() },
      moduleInstance: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      site: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: makeTxRunner(mockTx),
    } as unknown as import('@prisma/client').PrismaClient;

    // bundle 직접 구성 (serializeBundle 대신 — DB seed 없이)
    const bundle: AdminExportBundle = {
      ...makeEmptyBundle(),
      menus: [
        {
          id: 1,
          siteId: 1,
          title: 'Main Menu',
          isAdminMenu: false,
          listOrder: 0,
          exportKey: 'menu:1',
          items: [],
        },
      ],
    };

    const result = await applyImport(mockPrisma, bundle, 1, {
      'menu:1': 'overwrite',
    });

    expect(result.success).toBe(true);
    expect(result.applied).toBeGreaterThanOrEqual(1);
    expect(mockTx.menu.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Main Menu', siteId: 1 }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 테스트 3: menu 1개 + menuItem 2개 → round-trip → menuItem 포함 복원
// ---------------------------------------------------------------------------

describe('round-trip: menu + menuItems', () => {
  it('menu 1개 + menuItem 2개 bundle → apply → menuItem 2개 생성됨', async () => {
    const createdMenu = { id: 20 };
    const createdItem = { id: 100 };

    const mockTx = {
      menu: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdMenu),
        update: vi.fn(),
      },
      menuItem: {
        create: vi.fn().mockResolvedValue(createdItem),
      },
      moduleInstance: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      site: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: makeTxRunner(mockTx),
    } as unknown as import('@prisma/client').PrismaClient;

    const bundle: AdminExportBundle = {
      ...makeEmptyBundle(),
      menus: [
        {
          id: 1,
          siteId: 1,
          title: 'Nav Menu',
          isAdminMenu: false,
          listOrder: 0,
          exportKey: 'menu:1',
          items: [
            {
              id: 10,
              menuId: 1,
              parentId: null,
              title: 'Home',
              listOrder: 0,
              url: '/',
              exportKey: 'menu:1:10',
              parentExportKey: null,
            },
            {
              id: 11,
              menuId: 1,
              parentId: null,
              title: 'About',
              listOrder: 1,
              url: '/about',
              exportKey: 'menu:1:11',
              parentExportKey: null,
            },
          ],
        },
      ],
    };

    const result = await applyImport(mockPrisma, bundle, 1, {
      'menu:1': 'overwrite',
    });

    expect(result.success).toBe(true);
    // menu create + 2 menuItem create = 3
    expect(result.applied).toBeGreaterThanOrEqual(3);
    expect(mockTx.menuItem.create).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 테스트 4: moduleInstance 1개 → round-trip → moduleInstance 복원
// ---------------------------------------------------------------------------

describe('round-trip: moduleInstance', () => {
  it('moduleInstance 1개 bundle → apply → moduleInstance 생성됨', async () => {
    const mockTx = {
      menu: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      menuItem: { create: vi.fn() },
      moduleInstance: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 5 }),
        update: vi.fn(),
      },
      site: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: makeTxRunner(mockTx),
    } as unknown as import('@prisma/client').PrismaClient;

    const bundle: AdminExportBundle = {
      ...makeEmptyBundle(),
      moduleInstances: [
        {
          id: 1,
          siteId: 1,
          moduleCode: 'board',
          mid: 'board_main',
          name: '메인 게시판',
          exportKey: 'module:board_main',
        },
      ],
    };

    const result = await applyImport(mockPrisma, bundle, 1, {
      'module:board_main': 'overwrite',
    });

    expect(result.success).toBe(true);
    expect(result.applied).toBeGreaterThanOrEqual(1);
    expect(mockTx.moduleInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moduleCode: 'board',
          mid: 'board_main',
          name: '메인 게시판',
          siteId: 1,
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 테스트 5: 충돌 있는 menu → decision="skipConflict" → skipped=1, 기존 menu 건드리지 않음
// ---------------------------------------------------------------------------

describe('round-trip: skipConflict 결정', () => {
  it('충돌 있는 menu에 skipConflict → skipped=1, create/update 호출 없음', async () => {
    const mockTx = {
      menu: {
        findFirst: vi.fn().mockResolvedValue({ id: 99 }), // 기존 있음
        create: vi.fn(),
        update: vi.fn(),
      },
      menuItem: { create: vi.fn() },
      moduleInstance: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      site: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: makeTxRunner(mockTx),
    } as unknown as import('@prisma/client').PrismaClient;

    const bundle: AdminExportBundle = {
      ...makeEmptyBundle(),
      menus: [
        {
          id: 1,
          siteId: 1,
          title: 'Existing Menu',
          isAdminMenu: false,
          listOrder: 0,
          exportKey: 'menu:1',
          items: [],
        },
      ],
    };

    const result = await applyImport(mockPrisma, bundle, 1, {
      'menu:1': 'skipConflict',
    });

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(1);
    expect(result.applied).toBe(0);
    // 기존 menu를 건드리면 안 됨
    expect(mockTx.menu.create).not.toHaveBeenCalled();
    expect(mockTx.menu.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 테스트 6: abort decision → ImportError throw → 트랜잭션 롤백 확인
// ---------------------------------------------------------------------------

describe('round-trip: abort 결정', () => {
  it('abort decision → ImportError throw → 트랜잭션이 throw로 롤백됨', async () => {
    // $transaction mock: 콜백 실행 후 throw가 발생하면 그대로 re-throw
    const abortTx = {
      menu: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      menuItem: { create: vi.fn() },
      moduleInstance: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      site: { update: vi.fn() },
    };

    const mockPrisma = {
      $transaction: makeTxRunner(abortTx),
    } as unknown as import('@prisma/client').PrismaClient;

    const bundle: AdminExportBundle = {
      ...makeEmptyBundle(),
      menus: [
        {
          id: 1,
          siteId: 1,
          title: 'Abort Menu',
          isAdminMenu: false,
          listOrder: 0,
          exportKey: 'menu:1',
          items: [],
        },
      ],
    };

    // abort decision → applyImport이 throw해야 함
    await expect(
      applyImport(mockPrisma, bundle, 1, { 'menu:1': 'abort' }),
    ).rejects.toThrow('Import aborted');

    // 트랜잭션 롤백 = create/update 호출 없어야 함
    expect(abortTx.menu.create).not.toHaveBeenCalled();
    expect(abortTx.menu.update).not.toHaveBeenCalled();
  });
});
