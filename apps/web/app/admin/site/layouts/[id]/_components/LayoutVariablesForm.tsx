'use client';

/**
 * LayoutVariablesForm.tsx — SPEC-ADMIN-002 Slice 2A.
 *
 * ThemeAssignment.tokensOverride(JSON) 편집 폼 (REQ-ADMIN2-022).
 * 클라이언트 컴포넌트: JSON 편집 상태와 submit 처리가 필요함.
 *
 * @MX:NOTE: [AUTO] 클라이언트 컴포넌트로 분리된 이유 — textarea 상태와 form submit 필요.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-022
 */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@rhymix-ts/ui/components';
import { trpc } from '@/providers/TRPCProvider';

interface LayoutVariablesFormProps {
  instanceId: string;
  tokensOverride: unknown;
}

export function LayoutVariablesForm({ instanceId, tokensOverride }: LayoutVariablesFormProps): React.ReactElement {
  const router = useRouter();
  const updateInstanceVariables = trpc.admin.layout.updateInstanceVariables.useMutation();
  const isPending = updateInstanceVariables.isPending;
  const [jsonValue, setJsonValue] = useState(
    JSON.stringify(tokensOverride || {}, null, 2),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    // JSON 유효성 검증
    try {
      const parsed = JSON.parse(jsonValue);
      setError(null);

      await updateInstanceVariables.mutateAsync({
        id: instanceId,
        tokensOverride: parsed,
      });
      setIsDirty(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }

  function handleRevert(): void {
    setJsonValue(JSON.stringify(tokensOverride || {}, null, 2));
    setIsDirty(false);
    setError(null);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setJsonValue(event.target.value);
    setIsDirty(true);
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="tokensOverride"
          className="block text-sm font-medium text-zinc-700 mb-2"
        >
          토큰 오버라이드 (JSON)
        </label>
        <textarea
          id="tokensOverride"
          name="tokensOverride"
          value={jsonValue}
          onChange={handleChange}
          rows={20}
          className="w-full font-mono text-sm border border-zinc-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
        <p className="text-xs text-zinc-500 mt-2">
          logo, menuBinding, colors 등의 레이아웃 변수를 JSON 형식으로 입력하세요.
        </p>
        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !isDirty}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
        <button
          type="button"
          onClick={handleRevert}
          disabled={isPending || !isDirty}
          className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 disabled:opacity-50"
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
