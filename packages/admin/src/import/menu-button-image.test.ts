/**
 * SPEC-LEGACY-PARITY-001 M3 — 버튼 필드 저장 형태 정합화 (AC-SITE-011).
 *
 * design.md D1이 채택한 이미지 참조형 `{"image": "<file-storage 참조>", "alt": "..."}`
 * 왕복을 검증한다. 현재 `menuItemButtonSchema`는 `{label, href, icon, target}`
 * 스키마라서 (1) 이미지 참조형이 zod strip-unknown으로 `{}`로 증발하고 (2) 레거시
 * 파일명 문자열은 parse 자체가 throw하며 (3) 정합화 형태 외 값이 통과해 버린다 —
 * 세 결함 모두 이 파일이 RED로 재현한다.
 *
 * 검증 축:
 *  1. 이미지 참조형이 schema parse를 strip 손실 없이 생존한다
 *  2. parse → applyImport 왕복이 원본 값을 DB 생성 인자에 그대로 전달한다
 *  3. 레거시 파일명 문자열은 수용되어 `{"image": <문자열>}`로 정규화된다 (D1 하위호환 규칙)
 *  4. 정합화 형태 외 값(구 `{label, href}` 스타일)은 schema가 거부한다
 */
import { describe, it, expect, vi } from 'vitest';
import {
  adminExportBundleSchema,
  type AdminExportBundle,
  type ExportRequest,
} from '../export/bundle-schema';
import { serializeBundle } from '../export/serializer';
import { applyImport } from './apply';

// ---------------------------------------------------------------------------
// Prisma 트랜잭션 모킹 헬퍼 (round-trip.test.ts와 동일한 형태)
// ---------------------------------------------------------------------------

/** $transaction 콜백을 즉시 실행하는 mock 구현 */
function makeTxRunner(mockTx: unknown) {
  return vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn(mockTx);
  });
}

function makeMockPrisma(mockTx: unknown) {
  return {
    $transaction: makeTxRunner(mockTx),
  } as unknown as import('@prisma/client').PrismaClient;
}

function makeButtonMockTx() {
  return {
    menu: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 10 }),
      update: vi.fn(),
    },
    menuItem: { create: vi.fn().mockResolvedValue({ id: 11 }) },
    moduleInstance: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    site: { update: vi.fn() },
  };
}

// ---------------------------------------------------------------------------
// bundle 팩토리
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

/** 버튼 필드 값을 바꿔 끼운 메뉴 1개 bundle (레거시·정합화 외 형태 주입용 캐스트 포함) */
function menuBundleWithItem(
  buttons: { normalBtn?: unknown; hoverBtn?: unknown; activeBtn?: unknown },
): AdminExportBundle {
  return {
    ...makeEmptyBundle(),
    menus: [
      {
        id: 1,
        siteId: 1,
        title: 'M3 정합화 메뉴',
        isAdminMenu: false,
        listOrder: 0,
        exportKey: 'menu:1',
        items: [
          {
            id: 11,
            menuId: 1,
            parentId: null,
            title: 'M3-버튼',
            listOrder: 0,
            url: '/',
            normalBtn: buttons.normalBtn,
            hoverBtn: buttons.hoverBtn,
            activeBtn: buttons.activeBtn,
            exportKey: 'menu:1:11',
            parentExportKey: null,
          },
        ],
      },
    ],
  } as unknown as AdminExportBundle;
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

describe('AC-SITE-011: 이미지 참조형 버튼 값의 export→import 왕복', () => {
  it('이미지 참조형 값은 schema parse를 strip 손실 없이 생존한다', () => {
    const bundle = menuBundleWithItem({
      normalBtn: { image: '2026/08/uuid-a', alt: '소개' },
      hoverBtn: { image: '2026/08/uuid-b' },
      activeBtn: { image: '2026/08/uuid-c' },
    });

    const parsed = adminExportBundleSchema.parse(bundle);

    // 현재 스키마는 {label,href,icon,target}만 알므로 image/alt가 통째로
    // strip되어 {}가 된다 — 이 기대가 실패하는 것이 결함 재현이다.
    expect(parsed.menus?.[0]?.items[0]?.normalBtn).toEqual({
      image: '2026/08/uuid-a',
      alt: '소개',
    });
    expect(parsed.menus?.[0]?.items[0]?.hoverBtn).toEqual({
      image: '2026/08/uuid-b',
    });
    expect(parsed.menus?.[0]?.items[0]?.activeBtn).toEqual({
      image: '2026/08/uuid-c',
    });
  });

  it('parse → apply 왕복이 원본 이미지 참조형을 tx 생성 인자에 그대로 전달한다', async () => {
    const mockTx = makeButtonMockTx();
    const mockPrisma = makeMockPrisma(mockTx);

    const bundle = menuBundleWithItem({
      normalBtn: { image: '2026/08/uuid-a', alt: '소개' },
    });
    const parsed = adminExportBundleSchema.parse(bundle);

    const result = await applyImport(mockPrisma, parsed, 1, { 'menu:1': 'overwrite' });

    expect(result.success).toBe(true);
    expect(mockTx.menuItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          normalBtn: { image: '2026/08/uuid-a', alt: '소개' },
        }),
      }),
    );
  });

  it('레거시 파일명 문자열은 수용되어 {"image": <문자열>}로 정규화된다 (design.md D1)', () => {
    const bundle = menuBundleWithItem({ normalBtn: 'btn_normal.gif' });

    // 현재 스키마는 문자열을 거부(throw)한다 — D1 하위호환 규칙 위반의 재현.
    const parsed = adminExportBundleSchema.parse(bundle);

    expect(parsed.menus?.[0]?.items[0]?.normalBtn).toEqual({
      image: 'btn_normal.gif',
    });
  });

  it('레거시 파일명 문자열 import는 정규화된 참조형으로 DB에 적재된다', async () => {
    const mockTx = makeButtonMockTx();
    const mockPrisma = makeMockPrisma(mockTx);

    const bundle = menuBundleWithItem({ hoverBtn: 'btn_hover.gif' });
    const parsed = adminExportBundleSchema.parse(bundle);

    const result = await applyImport(mockPrisma, parsed, 1, { 'menu:1': 'overwrite' });

    expect(result.success).toBe(true);
    expect(mockTx.menuItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hoverBtn: { image: 'btn_hover.gif' },
        }),
      }),
    );
  });

  it('정합화 형태 외 값(구 {label, href} 스타일)은 schema가 거부한다', () => {
    const bundle = menuBundleWithItem({
      normalBtn: { label: '구형', href: '/old', icon: 'x', target: '_blank' },
    });

    // 현재 스키마는 이 값을 통과시킨다(strip만 할 뿐) — 닫힌 집합이 아니다.
    expect(() => adminExportBundleSchema.parse(bundle)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// D3 방어 수리 — serializer의 비적합 버튼 값 낙하 (SPEC-LEGACY-PARITY-001-FIX)
// ---------------------------------------------------------------------------

/** export 방향 mock: menu.findMany가 지정한 items를 반환 (menu 1개) */
function makeExportPrisma(items: unknown[]) {
  const mockTx = {
    menu: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          siteId: 1,
          title: 'D3 메뉴',
          isAdminMenu: false,
          listOrder: 0,
          items,
        },
      ]),
    },
    site: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  return {
    $transaction: makeTxRunner(mockTx),
  } as unknown as import('@prisma/client').PrismaClient;
}

/** export용 menu item seed (버튼 필드는 buttons로 주입) */
function exportItem(
  id: number,
  title: string,
  buttons: Record<string, unknown>,
) {
  return {
    id,
    menuId: 1,
    parentId: null,
    title,
    listOrder: id,
    url: '/',
    expand: null,
    ...buttons,
  };
}

describe('D3 방어 수리: serializer는 비적합 버튼 값을 낙하하고 건수를 보고한다', () => {
  const exportRequest: ExportRequest = {
    siteId: 1,
    menu: true,
    moduleInstances: false,
    documents: { include: false },
    comments: { include: false },
    siteSettings: false,
    minify: false,
  };

  it('비적합 값 1건이 섞여 있어도 bundle 전체가 parse를 통과하고 나머지는 보존된다', async () => {
    const prisma = makeExportPrisma([
      exportItem(11, '정합 항목', {
        normalBtn: { image: '2026/08/uuid-a', alt: '소개' },
      }),
      exportItem(12, '구 편집기 잔재', {
        normalBtn: { color: '#fff', label: 'X' },
      }),
    ]);

    const bundle = await serializeBundle(prisma, 1, exportRequest);

    // serializeBundle은 exportedBy를 actorId: 0 스텁으로 초기화한다(프로덕션
    // 라우터 export.ts:34가 직후 덮어쓰는 값) — parse 검증은 그와 동일하게
    // 호출자가 채운 뒤에 한다. 버튼 값 검증이 이 테스트의 대상이다.
    bundle.metadata.exportedBy = { actorId: 1, nickname: 'test' };

    // 수리 전에는 toButtonImageRef의 무검사 캐스트가 {color,label}을 그대로
    // 흘려보내 bundle 전체 parse가 throw한다 — D3 회귀의 재현.
    const parsed = adminExportBundleSchema.parse(bundle);
    expect(
      parsed.menus?.[0]?.items.find((i) => i.id === 11)?.normalBtn,
    ).toEqual({ image: '2026/08/uuid-a', alt: '소개' });
    expect(
      parsed.menus?.[0]?.items.find((i) => i.id === 12)?.normalBtn,
    ).toBeUndefined();
  });

  it('낙하 건수가 metadata.droppedButtonImages에 보고된다', async () => {
    const prisma = makeExportPrisma([
      exportItem(11, '두 필드 모두 비적합', {
        normalBtn: { color: '#fff' },
        hoverBtn: { label: 'X', href: '/old' },
      }),
      exportItem(12, 'hoverBtn만 비적합', {
        normalBtn: { image: '2026/08/uuid-b' },
        hoverBtn: 42,
      }),
    ]);

    const bundle = await serializeBundle(prisma, 1, exportRequest);

    expect(bundle.metadata.droppedButtonImages).toBe(3);
  });

  it('레거시 문자열·정합 참조형은 기존 동작 그대로 직렬화된다', async () => {
    const prisma = makeExportPrisma([
      exportItem(11, '레거시 문자열', { normalBtn: 'btn_normal.gif' }),
      exportItem(12, '정합 객체', {
        hoverBtn: { image: '2026/08/uuid-b', alt: '대체텍스트' },
      }),
    ]);

    const bundle = await serializeBundle(prisma, 1, exportRequest);

    expect(bundle.menus?.[0]?.items[0]?.normalBtn).toEqual({
      image: 'btn_normal.gif',
    });
    expect(bundle.menus?.[0]?.items[1]?.hoverBtn).toEqual({
      image: '2026/08/uuid-b',
      alt: '대체텍스트',
    });
    expect(bundle.metadata.droppedButtonImages).toBeUndefined();
  });

  it('null/undefined 버튼 값은 undefined로 직렬화되며 낙하로 집계되지 않는다', async () => {
    const prisma = makeExportPrisma([
      exportItem(11, '빈 항목', { normalBtn: null, hoverBtn: undefined }),
    ]);

    const bundle = await serializeBundle(prisma, 1, exportRequest);

    expect(bundle.menus?.[0]?.items[0]?.normalBtn).toBeUndefined();
    expect(bundle.menus?.[0]?.items[0]?.hoverBtn).toBeUndefined();
    expect(bundle.metadata.droppedButtonImages).toBeUndefined();
  });
});
