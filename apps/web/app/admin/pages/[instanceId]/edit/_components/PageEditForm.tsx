'use client';

/**
 * PageEditForm.tsx — SPEC-PAGE-001 Slice C
 *
 * 페이지 본문 편집 클라이언트 컴포넌트.
 * textarea + 저장 버튼으로 구성된 간단한 HTML 편집 폼.
 *
 * @MX:NOTE [AUTO]: 클라이언트 컴포넌트로 분리된 이유 — textarea 상태와 form submit 상태가 필요.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-031
 */
import React, { useTransition } from 'react';
import { savePageAction } from '../actions';

interface PageEditFormProps {
  instanceId: number;
  initialContent: string;
}

/**
 * 페이지 본문 편집 폼.
 * Save 버튼 클릭 시 savePageAction Server Action 을 호출한다.
 */
export function PageEditForm({ instanceId, initialContent }: PageEditFormProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const mcontent = String(data.get('mcontent') ?? '');

    startTransition(async () => {
      await savePageAction(instanceId, mcontent);
    });
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
          defaultValue={initialContent}
          rows={20}
          className="w-full font-mono text-sm border border-zinc-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
          data-testid="mcontent-textarea"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="save-button"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
