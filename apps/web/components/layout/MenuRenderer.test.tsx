// @vitest-environment jsdom
/**
 * SPEC-LEGACY-PARITY-001 M3 — MenuRenderer 상태별 버튼 이미지 렌더 (AC-SITE-010).
 *
 * 현 MenuRenderer.tsx는 버튼 필드를 읽지 않는다(research.md §1.4 (1) — 쓰기 전용
 * 필드). 이 테스트는:
 *  1. buildMenuTree가 버튼 이미지 참조를 URL로 해석해 노드에 싣는다 (normal 기본 +
 *     hover/active 상태 + alt는 참조의 alt, 없으면 항목 제목으로 폴백)
 *  2. MenuTree가 normal 이미지를 라벨 대신 기본 표시하고(라벨 없는 빈 링크 아님),
 *     hover/active 레이어를 CSS 상태 선택자로 전환한다 (design.md D3 — CSS 우선)
 *  3. 이미지 없는 항목은 텍스트 라벨로 렌더된다 (현행 그대로 — M2 특성화 보호 분기)
 *  4. groupIds ACL 필터는 버튼 렌더링 변경에 영향받지 않는다
 *
 * 렌더 로직 재사용을 위해 buildMenuTree/MenuTree를 모듈에서 export해야 한다
 * (현재 module-private — 이 import 자체가 RED의 첫 실패다).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// ---------------------------------------------------------------------------
// 모듈 모킹
// ---------------------------------------------------------------------------

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    menuItem: { findMany: prismaMocks.findMany },
    memberGroupMember: { findMany: vi.fn(async () => []) },
    menuSlotAssignment: { findUnique: vi.fn() },
  },
}));

// 모듈 로드 시 next-auth 체인을 끌어오지 않도록 인증 모듈 전체를 모킹
vi.mock('@/lib/auth/config', () => ({ auth: vi.fn(async () => null) }));

// next/link → 평범한 <a>로 치환 (jsdom 렌더 검증용).
// className/target/rel 도 그대로 전달한다 — Link mock이 className를 버리면
// group 트리거 클래스 단언이 구현과 무관하게 항상 실패한다 (모킹 충실성).
vi.mock('next/link', () => ({
  default: (props: {
    href: string;
    className?: string;
    target?: string;
    rel?: string;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      'a',
      { href: props.href, className: props.className, target: props.target, rel: props.rel },
      props.children,
    ),
}));

// storage 참조 → 다운로드 URL 해석 모킹 (GREEN에서 renderer가 사용)
const storageMocks = vi.hoisted(() => ({
  getDownloadUrl: vi.fn(async ({ key }: { key: string }) => `/files/${key}`),
}));
vi.mock('@rhymix-ts/file', () => ({
  getStorage: () => ({ getDownloadUrl: storageMocks.getDownloadUrl }),
}));

// ---------------------------------------------------------------------------
// Prisma 행 픽스처 — 트리 재귀·ACL과 무관하게 버튼 필드 형태만 바꿔 끼운다
// ---------------------------------------------------------------------------

function menuRow(overrides: Record<string, unknown>) {
  return {
    id: 1,
    menuId: 1,
    parentId: null,
    title: '항목',
    url: '/',
    icon: null,
    cssClass: null,
    description: null,
    groupIds: [] as number[],
    openInNewWindow: false,
    expand: false,
    listOrder: 0,
    normalBtn: null,
    hoverBtn: null,
    activeBtn: null,
    ...overrides,
  };
}

/**
 * findMany 를 where.parentId 필터를 존중하는 구현으로 모킹한다.
 * mockResolvedValue 로 고정 값을 돌려주면 buildMenuTree 재귀가 모든 depth에서
 * 같은 행을 받아 무한 트리가 되어 힙이 터진다 — 실제 Prisma 동작을 반영.
 */
function mockMenuRows(...rows: ReturnType<typeof menuRow>[]) {
  prismaMocks.findMany.mockImplementation(
    async ({ where }: { where: { parentId: number | null } }) =>
      rows.filter((r) => r.parentId === where.parentId),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. buildMenuTree — 버튼 이미지 URL 해석 + ACL/무이미지 경계
// ---------------------------------------------------------------------------

describe('AC-SITE-010: buildMenuTree 버튼 이미지 해석', () => {
  it('이미지 참조형 3종을 URL로 해석해 buttonImages에 싣는다 (alt 폴백 포함)', async () => {
    mockMenuRows(
      menuRow({
        id: 1,
        title: 'M3-버튼',
        normalBtn: { image: 'k1', alt: '소개' },
        hoverBtn: { image: 'k2' },
        activeBtn: { image: 'k3' },
      }),
    );

    const MR = await import('./MenuRenderer');
    const nodes = await MR.buildMenuTree(1, null, []);

    expect(nodes).toHaveLength(1);
    // alt 미지정 상태는 항목 제목으로 폴백한다 (라벨 없는 이미지 방지)
    expect(nodes[0]!.buttonImages).toEqual({
      normal: { url: '/files/k1', alt: '소개' },
      hover: { url: '/files/k2', alt: 'M3-버튼' },
      active: { url: '/files/k3', alt: 'M3-버튼' },
    });
  });

  it('이미지 없는 항목·정합화 외 형태 값은 buttonImages가 null이다 (텍스트 라벨 분기)', async () => {
    mockMenuRows(
      menuRow({ id: 1, title: '라벨항목' }),
      // 구 스타일 잔존 값 — 이미지 참조형이 아니므로 없음으로 취급
      menuRow({ id: 2, title: '구형값', normalBtn: { color: '#ff0000' } }),
    );

    const MR = await import('./MenuRenderer');
    const nodes = await MR.buildMenuTree(1, null, []);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.buttonImages).toBeNull();
    expect(nodes[1]!.buttonImages).toBeNull();
  });

  it('groupIds ACL 필터는 버튼 필드와 무관하게 동작한다 (M2 보호 분기)', async () => {
    mockMenuRows(
      menuRow({ id: 1, title: '공개' }),
      menuRow({ id: 2, title: '제한', groupIds: [9] }),
    );

    const MR = await import('./MenuRenderer');
    const nodes = await MR.buildMenuTree(1, null, []);

    expect(nodes.map((n: { title: string }) => n.title)).toEqual(['공개']);
  });
});

// ---------------------------------------------------------------------------
// 2. MenuTree — normal 기본 표시 + hover/active CSS 상태 전환
// ---------------------------------------------------------------------------

describe('AC-SITE-010: MenuTree 상태별 렌더', () => {
  async function renderTree(children: { title: string; url: string; buttonImages?: unknown }[]) {
    const mkNode = (over: Record<string, unknown>) => ({
      id: 1,
      title: '',
      url: '/',
      icon: null,
      cssClass: null,
      description: null,
      groupIds: [],
      openInNewWindow: false,
      expand: false,
      listOrder: 0,
      children: [],
      buttonImages: null,
      ...over,
    });
    const nodes = [
      mkNode({
        id: 1,
        title: '버튼항목',
        buttonImages: {
          normal: { url: '/files/k1', alt: '소개' },
          hover: { url: '/files/k2', alt: '버튼항목' },
          active: { url: '/files/k3', alt: '버튼항목' },
        },
      }),
      mkNode({ id: 2, title: '라벨항목' }),
      ...children.map((c) => mkNode({ id: 3, ...c })),
    ];
    const MR = await import('./MenuRenderer');
    const { container } = render(React.createElement(MR.MenuTree, { items: nodes as never }));
    return container as HTMLElement;
  }

  it('normal 이미지가 라벨 대신 기본 표시된다 — 라벨 텍스트 없음, alt는 유지', async () => {
    const container = await renderTree([]);

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2);
    const btnLink = links[0]!;
    const normal = btnLink.querySelector('img[data-menu-btn="normal"]');
    expect(normal?.getAttribute('src')).toBe('/files/k1');
    expect(normal?.getAttribute('alt')).toBe('소개');
    // 이미지가 라벨을 대체한다 — 링크에 제목 텍스트가 남지 않는다
    expect(btnLink.textContent?.trim()).toBe('');
  });

  it('hover/active 레이어는 CSS 상태 선택자로 전환된다 (기본 숨김, JS 없음)', async () => {
    const container = await renderTree([]);

    const btnLink = container.querySelectorAll('a')[0]!;
    const hover = btnLink.querySelector('img[data-menu-btn="hover"]');
    const active = btnLink.querySelector('img[data-menu-btn="active"]');
    expect(hover?.getAttribute('src')).toBe('/files/k2');
    expect(active?.getAttribute('src')).toBe('/files/k3');
    // 레이어 전환은 Tailwind group 상태 유틸리티 클래스로 표현된다
    expect(hover?.className).toContain('group-hover:opacity-100');
    expect(hover?.className).toContain('opacity-0');
    expect(active?.className).toContain('group-active:opacity-100');
    expect(active?.className).toContain('opacity-0');
    // 링크 자체가 group 트리거다
    expect(btnLink.className).toContain('group');
    // 전환은 겹치기가 아니라 교대다 — 상태 레이어가 켜지면 normal 이 꺼진다
    const normal = btnLink.querySelector('img[data-menu-btn="normal"]');
    expect(normal?.className).toContain('group-hover:opacity-0');
    expect(normal?.className).toContain('group-active:opacity-0');
  });

  it('대체 레이어가 없는 상태는 normal 을 숨기지 않는다 (빈 링크 방지)', async () => {
    const MR = await import('./MenuRenderer');
    const { container } = render(
      React.createElement(MR.MenuTree, {
        items: [
          {
            id: 1,
            title: 'normal만',
            url: '/',
            icon: null,
            cssClass: null,
            description: null,
            groupIds: [],
            openInNewWindow: false,
            expand: false,
            listOrder: 0,
            children: [],
            buttonImages: { normal: { url: '/files/k1', alt: 'n' }, hover: null, active: null },
          },
        ] as never,
      }),
    );

    const normal = container.querySelector('img[data-menu-btn="normal"]');
    expect(normal?.className).not.toContain('group-hover:opacity-0');
    expect(normal?.className).not.toContain('group-active:opacity-0');
  });

  it('이미지 없는 항목은 텍스트 라벨로 렌더된다 (이미지 없는 img 0개)', async () => {
    const container = await renderTree([]);

    const labelLink = container.querySelectorAll('a')[1]!;
    expect(labelLink.querySelector('img')).toBeNull();
    expect(labelLink.textContent).toContain('라벨항목');
  });
});


// ---------------------------------------------------------------------------
// SPEC-LEGACY-PARITY-001 감사 결함 D4 — buildMenuTree 깊이 가드 (defense-in-depth)
//
// 주의(실측 검증): MenuItem 은 parentId 가 하나뿐이고 buildMenuTree 는 null-root
// 에서 시작하므로, 순수 순환(A→B→A)이나 자기부모(A→A) 노드는 어떤 null-root 에서도
// 도달 불가능(고아)해 무한 재귀를 트리거하지 못한다 — reorder/copySubtree 와 달리
// 도달 가능한 순환을 구성할 수 없다. 따라서 이 테스트는 무한 재귀를 재현한다고
// 주장하지 않고, 병적으로 깊은 정상 체인으로 깊이 상한만 방어적으로 고정한다.
// ---------------------------------------------------------------------------

describe('SPEC-LEGACY-PARITY-001 D4: buildMenuTree 깊이 가드', () => {
  it('D4-7: 깊이 상한(100)보다 깊은 트리는 무한 재귀 대신 예외로 중단된다', async () => {
    const deep: ReturnType<typeof menuRow>[] = [];
    for (let i = 1; i <= 110; i += 1) {
      deep.push(menuRow({ id: i, title: `n${i}`, parentId: i === 1 ? null : i - 1 }));
    }
    mockMenuRows(...deep);

    const MR = await import('./MenuRenderer');
    await expect(MR.buildMenuTree(1, null, [])).rejects.toThrow();
  });
});
