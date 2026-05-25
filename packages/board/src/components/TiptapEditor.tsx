/**
 * TiptapEditor.tsx — SPEC-CONTENT-001 REQ-CONTENT-130
 *
 * Tiptap 기반 리치 텍스트 에디터 클라이언트 컴포넌트.
 * form submit 시 HTML 콘텐츠를 hidden input 으로 전달한다.
 *
 * @MX:NOTE [AUTO]: StarterKit 기본 확장만 사용. Link/Image 확장은 Slice I+ 에서 추가 예정.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-130
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TiptapEditorProps {
  /** hidden input name — form submit 시 HTML 콘텐츠 전달에 사용 */
  name: string;
  /** 초기 HTML 콘텐츠 (편집 모드) */
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  /** 에디터 최소 높이 (CSS 값), 기본값 '200px' */
  minHeight?: string;
}

// ---------------------------------------------------------------------------
// TiptapEditor
// ---------------------------------------------------------------------------

/**
 * Tiptap EditorContent 를 래핑하는 리치 텍스트 에디터.
 * 툴바(Bold, Italic, BulletList, OrderedList, Heading2)와
 * form 제출용 hidden input 을 함께 렌더한다.
 *
 * @MX:ANCHOR [AUTO]: form submit 경로의 핵심 클라이언트 컴포넌트.
 * @MX:REASON: WriteBoardForm 과 BoardEditForm 에서 공통 사용 (fan_in >= 2, Slice I 에서 증가 예상).
 */
export function TiptapEditor({
  name,
  defaultValue = '',
  placeholder = '내용을 입력하세요...',
  required = false,
  minHeight = '200px',
}: TiptapEditorProps): React.ReactElement {
  const [htmlValue, setHtmlValue] = useState<string>(defaultValue);

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultValue || '',
    onUpdate({ editor: e }) {
      setHtmlValue(e.getHTML());
    },
  });

  // editor 가 마운트된 뒤 초기 HTML 동기화
  useEffect(() => {
    if (editor) {
      setHtmlValue(editor.getHTML());
    }
  }, [editor]);

  const isEmpty =
    !htmlValue || htmlValue === '<p></p>' || htmlValue === '';

  return (
    <div data-tiptap-editor className="tiptap-wrapper">
      {/* 툴바 */}
      <div className="tiptap-toolbar flex gap-1 border-b pb-1 mb-1">
        <button
          type="button"
          aria-label="Bold"
          className="px-2 py-1 font-bold border rounded hover:bg-gray-100"
          onClick={() =>
            editor?.chain().focus().toggleBold().run()
          }
        >
          B
        </button>
        <button
          type="button"
          aria-label="Italic"
          className="px-2 py-1 italic border rounded hover:bg-gray-100"
          onClick={() =>
            editor?.chain().focus().toggleItalic().run()
          }
        >
          I
        </button>
        <button
          type="button"
          aria-label="Bullet list"
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() =>
            editor?.chain().focus().toggleBulletList().run()
          }
        >
          •
        </button>
        <button
          type="button"
          aria-label="Ordered list"
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() =>
            editor?.chain().focus().toggleOrderedList().run()
          }
        >
          1.
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .toggleHeading({ level: 2 })
              .run()
          }
        >
          H2
        </button>
      </div>

      {/* 에디터 본문 */}
      <div
        className="tiptap-content-wrapper relative border rounded"
        style={{ minHeight }}
      >
        {isEmpty && (
          <div
            className="tiptap-placeholder pointer-events-none absolute top-2 left-2 text-gray-400"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} className="tiptap-editor p-2" />
      </div>

      {/* form 제출용 hidden input */}
      <input
        type="hidden"
        name={name}
        value={htmlValue}
        required={required}
        aria-hidden="true"
      />
    </div>
  );
}
