/**
 * TiptapEditor.tsx — SPEC-CONTENT-001 REQ-CONTENT-130 / SPEC-EDITOR-001 REQ-EDITOR-001,002,005,006
 *
 * Tiptap 기반 리치 텍스트 에디터 클라이언트 컴포넌트.
 * 풀 툴바(Bold/Italic/Underline/Strike/H1~H4/Quote/Code/CodeBlock/List/HRule/Link/Image/Highlight)와
 * 코드블록 lowlight 하이라이팅, 이미지 업로드(드래그/URL)를 지원한다.
 * form submit 시 HTML 콘텐츠를 hidden input 으로 전달한다.
 *
 * @MX:NOTE [AUTO]: StarterKit v3 가 Bold/Italic/Underline/Strike/Code/Link 를 이미 포함하므로
 *                  중복 등록을 피하기 위해 codeBlock 만 비활성화하고 CodeBlockLowlight 로 교체한다.
 * @MX:SPEC: SPEC-EDITOR-001 REQ-EDITOR-001
 */
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Underline } from '@tiptap/extension-underline';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

// lowlight: common 언어셋(js/ts/python/bash/sql/json 등 ~37종) 등록 — REQ-EDITOR-005
const lowlight = createLowlight(common);

/** 이미지 업로드 엔드포인트 — multipart, 필드명 'file', 응답 { id, storageKey } */
const UPLOAD_ENDPOINT = '/api/files/upload';

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
// 업로드 헬퍼
// ---------------------------------------------------------------------------

/**
 * 파일을 업로드 엔드포인트로 전송하고 다운로드 가능한 URL 을 반환한다.
 * 업로드 응답 { id, storageKey } 의 id 로 다운로드 경로를 구성한다.
 */
async function uploadImageFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: number };
    if (typeof data.id !== 'number') return null;
    return `/api/files/${data.id}/download`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 툴바 버튼
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** 굵게/기울임 등 시각적 강조용 추가 클래스 */
  extraClass?: string;
}

function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
  extraClass = '',
}: ToolbarButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={`px-2 py-1 border rounded hover:bg-gray-100 ${
        active ? 'bg-gray-200' : ''
      } ${extraClass}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TiptapEditor
// ---------------------------------------------------------------------------

/**
 * Tiptap EditorContent 를 래핑하는 리치 텍스트 에디터.
 * 풀 툴바 + form 제출용 hidden input 을 함께 렌더한다.
 *
 * @MX:ANCHOR [AUTO]: form submit 경로의 핵심 클라이언트 컴포넌트.
 * @MX:REASON: WriteBoardForm 과 BoardEditForm 에서 공통 사용 (fan_in >= 2).
 * @MX:SPEC: SPEC-EDITOR-001 REQ-EDITOR-001
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
    extensions: [
      // codeBlock 비활성화 → CodeBlockLowlight 로 교체 (REQ-EDITOR-005)
      StarterKit.configure({ codeBlock: false }),
      TextStyle,
      Color,
      Highlight,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: defaultValue || '',
    immediatelyRender: false,
    editorProps: {
      // 드래그&드롭 이미지 업로드 — REQ-EDITOR-002
      handleDrop(view, event, _slice, moved) {
        const dt = (event as DragEvent).dataTransfer;
        if (moved || !dt || dt.files.length === 0) return false;
        const file = dt.files[0];
        if (!file || !file.type.startsWith('image/')) return false;
        event.preventDefault();
        void uploadImageFile(file).then((url) => {
          if (!url) return;
          const imageType = view.state.schema.nodes.image;
          if (!imageType) return;
          const coords = view.posAtCoords({
            left: (event as DragEvent).clientX,
            top: (event as DragEvent).clientY,
          });
          const node = imageType.create({ src: url });
          const pos = coords?.pos ?? view.state.selection.from;
          view.dispatch(view.state.tr.insert(pos, node));
        });
        return true;
      },
    },
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

  // 링크 삽입/해제 — 선택 영역에 href 적용 (REQ-EDITOR-001)
  const handleLink = useCallback(() => {
    if (!editor) return;
    const previous = (editor.getAttributes('link').href as string) ?? '';
    const url = window.prompt('링크 URL 을 입력하세요', previous);
    if (url === null) return; // 취소
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }, [editor]);

  // 이미지 삽입 — URL 직접 입력 (SSR-safe, 드래그&드롭은 handleDrop 이 담당) (REQ-EDITOR-002)
  const handleImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('이미지 URL 을 입력하세요');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const isEmpty = !htmlValue || htmlValue === '<p></p>' || htmlValue === '';

  return (
    <div data-tiptap-editor className="tiptap-wrapper">
      {/* 툴바 — 375px 뷰포트에서도 줄바꿈되도록 flex-wrap (AC-EDITOR-007) */}
      <div className="tiptap-toolbar flex flex-wrap gap-1 border-b pb-1 mb-1">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold')}
          extraClass="font-bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic')}
          extraClass="italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive('underline')}
          extraClass="underline"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton
          label="Strike"
          active={editor?.isActive('strike')}
          extraClass="line-through"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          active={editor?.isActive('highlight')}
          onClick={() => editor?.chain().focus().toggleHighlight().run()}
        >
          HL
        </ToolbarButton>

        {/* 제목 H1~H4 */}
        {([1, 2, 3, 4] as const).map((level) => (
          <ToolbarButton
            key={level}
            label={`Heading ${level}`}
            active={editor?.isActive('heading', { level })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level }).run()
            }
          >
            H{level}
          </ToolbarButton>
        ))}

        <ToolbarButton
          label="Quote"
          active={editor?.isActive('blockquote')}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;&rdquo;
        </ToolbarButton>
        <ToolbarButton
          label="Code"
          active={editor?.isActive('code')}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          {'<>'}
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={editor?.isActive('codeBlock')}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          {'{ }'}
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor?.isActive('bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          &bull;
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          active={editor?.isActive('orderedList')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          &mdash;
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor?.isActive('link')}
          onClick={handleLink}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton label="Image" onClick={handleImage}>
          🖼
        </ToolbarButton>
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
