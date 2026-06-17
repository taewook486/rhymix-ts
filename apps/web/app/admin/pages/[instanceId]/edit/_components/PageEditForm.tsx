'use client';

/**
 * PageEditForm.tsx — SPEC-PAGE-001 Slice C + SPEC-ADMIN-002 Slice 1B
 *
 * 페이지 본문 편집 클라이언트 컴포넌트.
 * textarea + 저장/되돌리기(revert) 버튼으로 구성된 간단한 HTML 편집 폼.
 *
 * REQ-ADMIN2-026: 저장 및 되돌리기(revert) 기능 제공
 *
 * @MX:NOTE [AUTO]: 클라이언트 컴포넌트로 분리된 이유 — textarea 상태와 form submit 상태가 필요.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-031 + SPEC-ADMIN-002 REQ-ADMIN2-026
 */
import React, { useTransition, useState } from 'react';
import { savePageAction } from '../actions';

interface PageEditFormProps {
  instanceId: number;
  initialContent: string;
}

/**
 * 페이지 본문 편집 폼.
 * Save 버튼 클릭 시 savePageAction Server Action 을 호출한다.
 * Revert 버튼으로 초기 상태로 되돌릴 수 있다 (REQ-ADMIN2-026).
 */
export function PageEditForm({ instanceId, initialContent }: PageEditFormProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const mcontent = String(data.get('mcontent') ?? '');

    startTransition(async () => {
      await savePageAction(instanceId, mcontent);
      setIsDirty(false);
    });
  }

  function handleRevert(): void {
    setContent(initialContent);
    setIsDirty(false);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setContent(event.target.value);
    setIsDirty(event.target.value !== initialContent);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="mcontent"
          className="block text-sm font-medium text-zinc-700 mb-2"
        >
          페이지 본문 (HTML)
        </label>
        <textarea
          id="mcontent"
          name="mcontent"
          value={content}
          onChange={handleChange}
          rows={20}
          className="w-full font-mono text-sm border border-zinc-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
          data-testid="mcontent-textarea"
        />
        <p className="text-xs text-zinc-500 mt-2">
          위젯 토큰 ({'{{widget:}}}'})을 사용하여 위젯을 삽입할 수 있습니다.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !isDirty}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="save-button"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={handleRevert}
          disabled={isPending || !isDirty}
          className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 disabled:opacity-50"
          data-testid="revert-button"
        >
          되돌리기
        </button>
        {isDirty && (
          <span className="text-xs text-orange-600 self-center">
            변경사항이 저장되지 않았습니다
          </span>
        )}
      </div>
    </form>
  );
}
