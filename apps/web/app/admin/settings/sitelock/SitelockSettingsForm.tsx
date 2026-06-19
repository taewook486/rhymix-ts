'use client';
/**
 * 사이트 잠금 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 2D (REQ-ADMIN2-155).
 */
import { useActionState } from 'react';
import { updateSitelockSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function SitelockSettingsForm({
  initial,
  currentIp,
}: {
  initial: {
    locked: boolean;
    message?: string;
    allowedIpList: string[];
  };
  currentIp: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSitelockSettingsAction,
    initialActionState,
  );

  // Convert IP array to textarea format (one per line)
  const ipListText = initial.allowedIpList.join('\n');

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {/* 경고 메시지 */}
      {!initial.locked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            ⚠️ 사이트 잠금 주의사항
          </h3>
          <p className="text-sm text-yellow-700">
            사이트 잠금을 활성화하면 관리자를 포함한 모든 사용자의 접근이 제한됩니다.
            허용 IP 목록에 등록된 IP에서만 접근 가능합니다.
          </p>
          {currentIp && (
            <p className="text-sm text-yellow-700 mt-2">
              ✓ 현재 관리자 IP({currentIp})가 자동으로 허용 목록에 추가됩니다.
            </p>
          )}
        </div>
      )}

      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">사이트 잠금 설정 (REQ-ADMIN2-155)</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="locked"
                className="rounded mr-2"
                defaultChecked={initial.locked}
              />
              <span className="text-sm font-medium">사이트 잠금 활성화</span>
            </label>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">
              잠금 메시지
            </label>
            <textarea
              id="message"
              name="message"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.message || ''}
              placeholder="현재 서비스 점검 중입니다. 잠시 후 다시 이용해 주세요."
              rows={3}
              maxLength={1000}
            />
            <p className="text-sm text-gray-500 mt-1">
              사이트 잠금 시 방문자에게 표시할 메시지입니다 (최대 1000자).
            </p>
          </div>

          <div>
            <label htmlFor="allowedIpList" className="block text-sm font-medium mb-1">
              허용 IP 목록
            </label>
            <textarea
              id="allowedIpList"
              name="allowedIpList"
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              defaultValue={ipListText}
              placeholder="192.168.1.1&#10;10.0.0.0/24&#10;2001:db8::/32"
              rows={8}
            />
            <p className="text-sm text-gray-500 mt-1">
              IP 주소 또는 CIDR 표기법을 한 줄에 하나씩 입력하세요.
              예: 192.168.1.1, 10.0.0.0/24, 2001:db8::/32
            </p>
            {currentIp && initial.locked && initial.allowedIpList.includes(currentIp) && (
              <p className="text-sm text-green-600 mt-1">
                ✓ 현재 관리자 IP({currentIp})가 허용 목록에 포함되어 있습니다.
              </p>
            )}
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
