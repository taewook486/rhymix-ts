// @vitest-environment jsdom
/**
 * SPEC-LEGACY-PARITY-001 M3 — MenuItemEditor 버튼 이미지 UI (AC-SITE-002/003).
 *
 * AC-SITE-002의 거짓 통과 함정(감사 D1)을 피한다: "3종 입력 컨트롤 존재"는 현재
 * JSON 텍스트영역(MenuItemEditor.tsx:260-295)으로도 통과하므로, 이 테스트는
 * (1) 파일 입력 3종, (2) 상태별 제거 체크박스 3종, (3) 텍스트영역 0개,
 * (4) 재진입 시 미리보기 img 렌더를 각각 별도로 주장한다.
 *
 * C-1 결정(M3 run-phase 확인, design.md D1): 기존 스타일 JSON 실사용이 0건이므로
 * 텍스트영역은 교체된다 — 공존 아님.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/app/admin/menu/actions', () => ({
  createMenuItemAction: vi.fn(async () => null),
  updateMenuItemAction: vi.fn(async () => null),
  deleteMenuItemAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// GREEN에서 MenuItemEditor가 새로 받을 미리보기 URL props를 포함한 픽스처.
// (서버 컴포넌트 page.tsx가 storage 참조를 URL로 해석해 전달한다 — 클라이언트
// 컴포넌트에 storage 의존을 들이지 않기 위한 경계.)
const item = {
  id: 7,
  menuId: 2,
  parentId: null,
  title: 'M3-항목',
  url: '/',
  listOrder: 1,
  icon: null,
  cssClass: null,
  description: null,
  groupIds: [] as number[],
  openInNewWindow: false,
  expand: false,
  normalBtn: { image: '2026/08/uuid-a', alt: '기본' },
  hoverBtn: { image: '2026/08/uuid-b' },
  activeBtn: null,
  normalBtnUrl: '/api/files/by-key/2026%2F08%2Fuuid-a/download',
  hoverBtnUrl: '/api/files/by-key/2026%2F08%2Fuuid-b/download',
  activeBtnUrl: null,
};

async function renderEditor() {
  const { MenuItemEditor } = await import('./MenuItemEditor');
  render(React.createElement(MenuItemEditor, { menuId: 2, items: [item] as never }));
}

describe('AC-SITE-002: 편집기 버튼 이미지 파일 업로드 UI', () => {
  it('normal/hover/active 3종 모두 파일 업로드 입력(type=file, accept=image)을 가진다', async () => {
    await renderEditor();

    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(3);
    for (const name of ['normalBtnFile', 'hoverBtnFile', 'activeBtnFile']) {
      const input = document.querySelector(`input[type="file"][name="${name}"]`);
      expect(input, `파일 입력 ${name}이 존재해야 한다`).toBeTruthy();
      expect(input!.getAttribute('accept')).toContain('image');
    }
  });

  it('기존 JSON 텍스트영역은 제거되었다 (C-1 교체 결정)', async () => {
    await renderEditor();

    const textareas = document.querySelectorAll(
      'textarea[name="normalBtn"], textarea[name="hoverBtn"], textarea[name="activeBtn"]',
    );
    expect(textareas).toHaveLength(0);
  });

  it('설정된 이미지는 상태별 미리보기로 표시된다 (재진입 시 그대로)', async () => {
    await renderEditor();

    const normalImg = document.querySelector('img[data-menu-btn-preview="normal"]');
    expect(normalImg?.getAttribute('src')).toBe(item.normalBtnUrl);
    const hoverImg = document.querySelector('img[data-menu-btn-preview="hover"]');
    expect(hoverImg?.getAttribute('src')).toBe(item.hoverBtnUrl);
    // 값 없는 상태(activeBtn: null)의 미리보기는 렌더되지 않는다
    expect(document.querySelector('img[data-menu-btn-preview="active"]')).toBeNull();
  });
});

describe('AC-SITE-003: 상태별 제거 컨트롤', () => {
  it('removeNormalBtn/removeHoverBtn/removeActiveBtn 제거 체크박스 3종이 존재한다', async () => {
    await renderEditor();

    for (const name of ['removeNormalBtn', 'removeHoverBtn', 'removeActiveBtn']) {
      const box = document.querySelector(`input[type="checkbox"][name="${name}"]`);
      expect(box, `제거 컨트롤 ${name}이 존재해야 한다`).toBeTruthy();
    }
    const boxes = document.querySelectorAll(
      'input[type="checkbox"][name="removeNormalBtn"],' +
        'input[type="checkbox"][name="removeHoverBtn"],' +
        'input[type="checkbox"][name="removeActiveBtn"]',
    );
    expect(boxes).toHaveLength(3);
  });
});
