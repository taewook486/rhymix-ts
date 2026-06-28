/**
 * TiptapEditor.test.tsx — SPEC-CONTENT-001 REQ-CONTENT-130 / SPEC-EDITOR-001 REQ-EDITOR-001
 *
 * TiptapEditor 컴포넌트 마운트/렌더 및 풀 툴바 검증 테스트.
 * jsdom 환경에서 @tiptap/react 및 확장들을 mock 하여 렌더 결과를 검증한다.
 *
 * @MX:NOTE [AUTO]: 실제 에디터 인터랙션(bold 토글 등)은 Playwright E2E 에서 검증.
 * @MX:SPEC: SPEC-EDITOR-001 REQ-EDITOR-001
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// @tiptap/react mock — jsdom 에서 ProseMirror DOM binding 이 동작하지 않으므로
// ---------------------------------------------------------------------------

const mockGetHTML = vi.fn(() => '<p></p>');

/**
 * chain() 은 호출 시마다 모든 커맨드를 체이닝 가능한 프록시를 반환한다.
 * 어떤 메서드(toggleBold, setLink, setImage 등)든 자기 자신을 반환하고,
 * run() 만 vi.fn() 으로 종결한다.
 */
function makeChainProxy(): unknown {
  const runFn = vi.fn();
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'run') return runFn;
        return () => proxy;
      },
    },
  );
  return proxy;
}

const mockEditor = {
  getHTML: mockGetHTML,
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  isActive: vi.fn(() => false),
  chain: vi.fn(() => makeChainProxy()),
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditor),
  EditorContent: ({ editor: _editor }: { editor: unknown }) => (
    <div data-testid="editor-content" className="tiptap-editor-content" />
  ),
}));

// StarterKit.configure({ codeBlock: false }) 호출을 지원하는 mock
vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock('@tiptap/extension-text-style', () => ({
  TextStyle: {},
  Color: {},
}));

vi.mock('@tiptap/extension-highlight', () => ({
  Highlight: {},
}));

vi.mock('@tiptap/extension-image', () => ({
  Image: { configure: vi.fn(() => ({})) },
}));

vi.mock('@tiptap/extension-code-block-lowlight', () => ({
  CodeBlockLowlight: { configure: vi.fn(() => ({})) },
}));

vi.mock('lowlight', () => ({
  createLowlight: vi.fn(() => ({ register: vi.fn() })),
  common: {},
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

  // globals:false 환경에서는 testing-library 자동 cleanup 이 등록되지 않으므로 수동 정리
  afterEach(() => {
    cleanup();
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
    const boldBtns = screen.queryAllByRole('button', { name: /bold/i });
    expect(boldBtns.length).toBeGreaterThan(0);
  });

  // TE-5: defaultValue 미전달 시 크래시 없이 렌더된다
  it('TE-5: renders without crashing when defaultValue is undefined', () => {
    expect(() => render(<TiptapEditor name="body" />)).not.toThrow();
  });

  // TE-6: 툴바에 Italic 버튼이 포함된다
  it('TE-6: toolbar contains an Italic button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Italic' })).toBeTruthy();
  });

  // TE-7: 툴바에 Underline 버튼이 포함된다 (REQ-EDITOR-001)
  it('TE-7: toolbar contains an Underline button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Underline' })).toBeTruthy();
  });

  // TE-8: 툴바에 Strike 버튼이 포함된다
  it('TE-8: toolbar contains a Strike button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Strike' })).toBeTruthy();
  });

  // TE-9: 툴바에 H1~H4 버튼이 모두 포함된다
  it('TE-9: toolbar contains Heading 1 through 4 buttons', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Heading 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Heading 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Heading 3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Heading 4' })).toBeTruthy();
  });

  // TE-10: 툴바에 Quote(blockquote) 버튼이 포함된다
  it('TE-10: toolbar contains a Quote button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Quote' })).toBeTruthy();
  });

  // TE-11: 툴바에 Code(inline) 버튼이 포함된다
  it('TE-11: toolbar contains a Code button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Code' })).toBeTruthy();
  });

  // TE-12: 툴바에 Code block 버튼이 포함된다 (REQ-EDITOR-005)
  it('TE-12: toolbar contains a Code block button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Code block' })).toBeTruthy();
  });

  // TE-13: 툴바에 Bullet list / Ordered list 버튼이 포함된다
  it('TE-13: toolbar contains list buttons', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ordered list' })).toBeTruthy();
  });

  // TE-14: 툴바에 Horizontal rule 버튼이 포함된다
  it('TE-14: toolbar contains a Horizontal rule button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Horizontal rule' })).toBeTruthy();
  });

  // TE-15: 툴바에 Link 버튼이 포함된다 (REQ-EDITOR-001)
  it('TE-15: toolbar contains a Link button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Link' })).toBeTruthy();
  });

  // TE-16: 툴바에 Image 버튼이 포함된다 (REQ-EDITOR-002)
  it('TE-16: toolbar contains an Image button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Image' })).toBeTruthy();
  });

  // TE-17: 툴바에 Highlight 버튼이 포함된다
  it('TE-17: toolbar contains a Highlight button', () => {
    render(<TiptapEditor name="content" />);
    expect(screen.getByRole('button', { name: 'Highlight' })).toBeTruthy();
  });
});
