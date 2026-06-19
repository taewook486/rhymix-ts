'use client';
/**
 * 보안 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 1F + Slice 2G (REQ-ADMIN2-113, REQ-ADMIN2-114, REQ-ADMIN2-115).
 */
import { useActionState } from 'react';
import { updateSecuritySettingsAction, updateIpControlSettingsAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

interface InitialSettings {
  passwordMinLength: number;
  passwordRequireComplex: boolean;
  sessionLifetime: number;
  loginMaxAttempts: number;
  loginLockoutTime: number;
  // IP control settings (REQ-ADMIN2-115)
  ipControlEnabled: boolean;
  ipControlAllowList: string;
  ipControlDenyList: string;
}

export function SecuritySettingsForm({
  initial,
}: {
  initial: InitialSettings;
}) {
  const [securityState, securityFormAction, securityPending] = useActionState(
    updateSecuritySettingsAction,
    initialActionState,
  );

  const [ipState, ipFormAction, ipPending] = useActionState(
    updateIpControlSettingsAction,
    initialActionState,
  );

  return (
    <div className="space-y-6">
      {/* Password, Session, Lockout Settings Form */}
      <form action={securityFormAction} className="space-y-6 max-w-2xl">
        {securityState.error && (
          <p className="text-sm text-red-600" role="alert">
            {securityState.error}
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
            disabled={securityPending}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {securityPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      {/* IP Control Settings Form - REQ-ADMIN2-115 */}
      <form action={ipFormAction} className="space-y-6 max-w-2xl">
        {ipState.error && (
          <p className="text-sm text-red-600" role="alert">
            {ipState.error}
          </p>
        )}

        <div className="border rounded bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">IP 접근 제어 (REQ-ADMIN2-115)</h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="ipControlEnabled"
                  className="rounded mr-2"
                  defaultChecked={initial.ipControlEnabled}
                />
                <span className="text-sm font-medium">IP 접근 제어 사용</span>
              </label>
              <p className="text-sm text-gray-500 ml-6">관리자 영역 접근을 IP 허용/차단 목록으로 제한합니다.</p>
            </div>

            <div>
              <label htmlFor="ipControlAllowList" className="block text-sm font-medium mb-1">
                허용 IP 목록
              </label>
              <textarea
                id="ipControlAllowList"
                name="ipControlAllowList"
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={3}
                defaultValue={initial.ipControlAllowList}
                placeholder="예: 192.168.1.1, 10.0.0.0/24 (한 줄에 하나, 쉼표 또는 줄바꿈으로 구분)"
              />
              <p className="text-sm text-gray-500 mt-1">
                접근을 허용할 IP 주소 또는 CIDR 블록입니다. 빈 목록은 모든 IP를 허용합니다 (단, 차단 목록 우선).
              </p>
            </div>

            <div>
              <label htmlFor="ipControlDenyList" className="block text-sm font-medium mb-1">
                차단 IP 목록
              </label>
              <textarea
                id="ipControlDenyList"
                name="ipControlDenyList"
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={3}
                defaultValue={initial.ipControlDenyList}
                placeholder="예: 203.0.113.0/24 (한 줄에 하나, 쉼표 또는 줄바꿈으로 구분)"
              />
              <p className="text-sm text-gray-500 mt-1">
                접근을 차단할 IP 주소 또는 CIDR 블록입니다. 이 목록이 허용 목록보다 우선 적용됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">
            <strong>참고:</strong> IP 접근 제어는 관리자 영역 첫 진입점 보안 계층입니다. 차단 목록에 있는 IP는 허용 목록에 있어도
            차단됩니다 (REQ-ADMIN2-115).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={ipPending}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {ipPending ? '저장 중...' : 'IP 제어 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
