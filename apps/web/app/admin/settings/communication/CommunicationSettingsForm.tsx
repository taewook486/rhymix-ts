'use client';
/**
 * 쪽지 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-143).
 */
import { useActionState } from 'react';
import { updateCommunicationSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function CommunicationSettingsForm({
  initial,
}: {
  initial: {
    enabled: boolean;
    inboxLimit: number;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateCommunicationSettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-sm text-green-600" role="status">
          저장되었습니다.
        </p>
      )}

      {/* 쪽지 기능 설정 */}
      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">쪽지 기능 설정</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="enabled"
                className="rounded mr-2"
                defaultChecked={initial.enabled}
              />
              <span className="text-sm font-medium">쪽지 기능 활성화</span>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-6">
            비활성화 시 모든 사용자가 쪽지를 보내거나 받을 수 없습니다.
          </p>

          <div>
            <label htmlFor="inboxLimit" className="block text-sm font-medium mb-1">
              수신함 최대 개수 제한
            </label>
            <input
              id="inboxLimit"
              name="inboxLimit"
              type="number"
              min="1"
              max="10000"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.inboxLimit}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              회원별 수신함에 보관할 수 있는 최대 쪽지 개수입니다 (1~10,000).
              제한 초과 시 오래된 쪽지부터 자동 삭제됩니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
