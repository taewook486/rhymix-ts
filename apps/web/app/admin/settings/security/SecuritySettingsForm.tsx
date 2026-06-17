'use client';
/**
 * 보안 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 1F (REQ-ADMIN2-113, REQ-ADMIN2-114).
 */
import { useActionState } from 'react';
import { updateSecuritySettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function SecuritySettingsForm({
  initial,
}: {
  initial: {
    passwordMinLength: number;
    passwordRequireComplex: boolean;
    sessionLifetime: number;
    loginMaxAttempts: number;
    loginLockoutTime: number;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateSecuritySettingsAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">비밀번호 정책</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="passwordMinLength" className="block text-sm font-medium mb-1">
              최소 길이
            </label>
            <input
              id="passwordMinLength"
              name="passwordMinLength"
              type="number"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.passwordMinLength}
              min={4}
              max={50}
            />
            <p className="text-sm text-gray-500 mt-1">비밀번호의 최소 길이입니다 (4-50자).</p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="passwordRequireComplex"
                className="rounded mr-2"
                defaultChecked={initial.passwordRequireComplex}
              />
              <span className="text-sm font-medium">복잡도 요구</span>
            </label>
            <p className="text-sm text-gray-500 ml-6">영문, 숫자, 특수문자 조합을 요구합니다.</p>
          </div>
        </div>
      </div>

      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">세션 설정</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="sessionLifetime" className="block text-sm font-medium mb-1">
              세션 유효시간
            </label>
            <div className="flex items-center gap-2">
              <input
                id="sessionLifetime"
                name="sessionLifetime"
                type="number"
                className="w-full border rounded px-3 py-2"
                defaultValue={initial.sessionLifetime}
                min={60}
                max={31536000}
              />
              <span className="text-sm text-gray-500">초</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">자동 로그아웃까지의 시간입니다 (최소 60초, 최대 1년).</p>
          </div>
        </div>
      </div>

      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">로그인 잠금 설정</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="loginMaxAttempts" className="block text-sm font-medium mb-1">
              최대 시도 횟수
            </label>
            <input
              id="loginMaxAttempts"
              name="loginMaxAttempts"
              type="number"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.loginMaxAttempts}
              min={1}
              max={10}
            />
            <p className="text-sm text-gray-500 mt-1">계정 잠금까지의 실패 허용 횟수입니다 (1-10회).</p>
          </div>

          <div>
            <label htmlFor="loginLockoutTime" className="block text-sm font-medium mb-1">
              잠금 시간
            </label>
            <div className="flex items-center gap-2">
              <input
                id="loginLockoutTime"
                name="loginLockoutTime"
                type="number"
                className="w-full border rounded px-3 py-2"
                defaultValue={initial.loginLockoutTime}
                min={60}
                max={86400}
              />
              <span className="text-sm text-gray-500">초</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">계정 잠금 유지 시간입니다 (1분 ~ 1일).</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-sm text-yellow-800">
          경고: <strong>중요</strong> — 인증을 우회할 수 있는 값은 자동으로 거부됩니다 (REQ-ADMIN2-114).
        </p>
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
