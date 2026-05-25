'use client';

/**
 * CommentForm.tsx — SPEC-CONTENT-001 Comment UI
 *
 * 댓글 작성 폼 클라이언트 컴포넌트.
 * - 비로그인 상태: 안내 메시지 + 폼 비활성
 * - onSubmit prop 주입 방식으로 테스트 용이성 확보
 * - 답글 모드: 취소 버튼 표시
 *
 * @MX:SPEC: SPEC-CONTENT-001
 */
import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentFormProps {
  documentId: number;
  parentId?: number | null;
  /** 콘텐츠 제출 핸들러 — 부모에서 주입 (testability 확보) */
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  isLoggedIn: boolean;
}

// ---------------------------------------------------------------------------
// CommentForm
// ---------------------------------------------------------------------------

/**
 * 댓글 작성 폼.
 *
 * @MX:SPEC: SPEC-CONTENT-001
 */
export function CommentForm({
  parentId,
  onSubmit,
  onCancel,
  placeholder = '댓글을 입력하세요.',
  submitLabel = '등록',
  isLoggedIn,
}: CommentFormProps): React.ReactElement {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReplyMode = parentId !== undefined && parentId !== null;
  const isEmpty = content.trim().length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="comment-form-disabled py-3 text-sm text-gray-500">
        <p>로그인 후 댓글을 작성할 수 있습니다.</p>
        <textarea
          disabled
          placeholder={placeholder}
          className="w-full mt-2 p-2 border border-gray-200 rounded text-sm bg-gray-50 cursor-not-allowed resize-none"
          rows={3}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form py-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:border-blue-400"
        rows={3}
        disabled={isSubmitting}
      />
      <div className="flex justify-end gap-2 mt-2">
        {isReplyMode && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isEmpty || isSubmitting}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '등록 중...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
