/**
 * TiptapEditor.test.tsx — SPEC-CONTENT-001 REQ-CONTENT-130
 *
 * TiptapEditor 컴포넌트 마운트/렌더 검증 테스트.
 * jsdom 환경에서 @tiptap/react 를 mock 하여 렌더 결과를 검증한다.
 *
 * @MX:NOTE [AUTO]: 실제 에디터 인터랙션(bold 토글 등)은 Playwright E2E 에서 검증.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-130
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// @tiptap/react mock — jsdom 에서 ProseMirror DOM binding 이 동작하지 않으므로
// ---------------------------------------------------------------------------

const mockGetHTML = vi.fn(() => '<p></p>');

const mockEditor = {
  getHTML: mockGetHTML,
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  commands: {
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
    toggleHeading: vi.fn(),
  },
  isActive: vi.fn(() => false),
  chain: vi.fn(() => ({
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    run: vi.fn(),
  })),
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditor),
  EditorContent: ({ editor: _editor }: { editor: unknown }) => (
    <div data-testid="editor-content" className="tiptap-editor-content" />
  ),
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: {},
}));

// ---------------------------------------------------------------------------
// SUT import — mock 이 먼저 hoisting 된 뒤 import 됨
// ---------------------------------------------------------------------------
import { TiptapEditor } from './TiptapEditor';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TiptapEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHTML.mockReturnValue('<p></p>');
  });

  // TE-1: 에디터 컨테이너 요소가 렌더된다
  it('TE-1: renders an editor container element', () => {
    const { container } = render(<TiptapEditor name="content" />);
    const wrapper = container.querySelector('[data-tiptap-editor]');
    expect(wrapper).not.toBeNull();
  });

  // TE-2: hidden input 이 올바른 name 속성을 가진다
  it('TE-2: hidden input has the correct name attribute', () => {
    const { container } = render(<TiptapEditor name="content" />);
    const hiddenInput = container.querySelector('input[type="hidden"][name="content"]');
    expect(hiddenInput).not.toBeNull();
  });

  // TE-3: defaultValue 가 hidden input value 에 반영된다
  it('TE-3: defaultValue is reflected in the hidden input value', () => {
    mockGetHTML.mockReturnValue('<p>Hello</p>');

    const { container } = render(
      <TiptapEditor name="content" defaultValue="<p>Hello</p>" />,
    );
    const hiddenInput = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="content"]',
    );
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.value).toBe('<p>Hello</p>');
  });

  // TE-4: 툴바에 Bold 버튼이 포함된다
  it('TE-4: toolbar contains a Bold button', () => {
    render(<TiptapEditor name="content" />);
    // aria-label="Bold" 버튼이 하나 이상 존재해야 한다
    const boldBtns = screen.queryAllByRole('button', { name: /bold/i });
    expect(boldBtns.length).toBeGreaterThan(0);
  });

  // TE-5: defaultValue 미전달 시 크래시 없이 렌더된다
  it('TE-5: renders without crashing when defaultValue is undefined', () => {
    expect(() => render(<TiptapEditor name="body" />)).not.toThrow();
  });
});
