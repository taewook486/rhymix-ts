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
} from '../export/bundle-schema';
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
