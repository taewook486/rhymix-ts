'use client';

/**
 * DuplicateInstanceDialog.tsx — SPEC-ADMIN-002 REQ-ADMIN2-024.
 *
 * 레이아웃 인스턴스 복제 다이얼로그 컴포넌트.
 * 새 refId를 입력받아 duplicateLayoutInstanceAction을 호출한다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-024
 */
import React, { useState, useTransition } from 'react';
import { duplicateLayoutInstanceAction } from '../actions';

interface DuplicateInstanceDialogProps {
  instanceId: string;
  instanceName: string | null;
  onSuccess?: () => void;
}

export function DuplicateInstanceDialog({
  instanceId,
  instanceName,
  onSuccess,
}: DuplicateInstanceDialogProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [newRefId, setNewRefId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await duplicateLayoutInstanceAction(instanceId, newRefId);
      if (result.ok) {
        setIsOpen(false);
        setNewRefId('');
        onSuccess?.();
      } else {
        setError(result.error);
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        복제
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">레이아웃 인스턴스 복제</h2>
        <p className="text-sm text-zinc-600 mb-4">
          "{instanceName || '이름 없는'}" 인스턴스를 복제합니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newRefId" className="block text-sm font-medium text-zinc-700 mb-2">
              새 Ref ID
            </label>
            <input
              type="text"
              id="newRefId"
              value={newRefId}
              onChange={(e) => setNewRefId(e.target.value)}
              className="w-full border border-zinc-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
              placeholder="새 대상 ID를 입력하세요"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !newRefId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '복제 중...' : '복제'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
