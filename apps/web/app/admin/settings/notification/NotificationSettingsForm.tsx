'use client';
/**
 * 알림 설정 폼 (Client Component) — SPEC-ADMIN-002 Slice 1F + Slice 2G (REQ-ADMIN2-110, REQ-ADMIN2-111).
 */
import { useActionState } from 'react';
import { updateNotificationSettingsAction, sendTestEmailAction, type ActionState } from './actions';

const initialActionState: ActionState = {};

export function NotificationSettingsForm({
  initial,
}: {
  initial: {
    senderName: string;
    senderEmail: string;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpSecure?: boolean | null;
    smtpUser?: string | null;
    hasPassword?: boolean;
    smtpFrom?: string | null;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationSettingsAction,
    initialActionState,
  );

  const [testState, testFormAction, testPending] = useActionState(
    sendTestEmailAction,
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
        <h2 className="text-lg font-semibold mb-4">발신자 설정</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="senderName" className="block text-sm font-medium mb-1">
              발신자 이름
            </label>
            <input
              id="senderName"
              name="senderName"
              type="text"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.senderName}
              placeholder="관리자"
            />
            <p className="text-sm text-gray-500 mt-1">이메일의 발신자 이름으로 표시됩니다.</p>
          </div>

          <div>
            <label htmlFor="senderEmail" className="block text-sm font-medium mb-1">
              발신자 이메일
            </label>
            <input
              id="senderEmail"
              name="senderEmail"
              type="email"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.senderEmail}
              placeholder="noreply@example.com"
            />
            <p className="text-sm text-gray-500 mt-1">수신자에게 표시되는 발신자 이메일 주소입니다.</p>
          </div>
        </div>
      </div>

      <div className="border rounded bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">SMTP 설정</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="smtpHost" className="block text-sm font-medium mb-1">
              SMTP 호스트
            </label>
            <input
              id="smtpHost"
              name="smtpHost"
              type="text"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.smtpHost ?? ''}
              placeholder="smtp.gmail.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="smtpPort" className="block text-sm font-medium mb-1">
                포트
              </label>
              <input
                id="smtpPort"
                name="smtpPort"
                type="number"
                className="w-full border rounded px-3 py-2"
                defaultValue={initial.smtpPort ?? 587}
                min={1}
                max={65535}
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="smtpSecure"
                  className="rounded mr-2"
                  defaultChecked={initial.smtpSecure ?? false}
                />
                <span className="text-sm">SSL/TLS 사용</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="smtpUser" className="block text-sm font-medium mb-1">
              SMTP 사용자명
            </label>
            <input
              id="smtpUser"
              name="smtpUser"
              type="text"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.smtpUser ?? ''}
            />
          </div>

          <div>
            <label htmlFor="smtpPassword" className="block text-sm font-medium mb-1">
              SMTP 비밀번호
            </label>
            <input
              id="smtpPassword"
              name="smtpPassword"
              type="password"
              className="w-full border rounded px-3 py-2"
              defaultValue=""
              placeholder={initial.hasPassword ? '저장된 비밀번호를 유지하려면 비워두세요' : ''}
              autoComplete="new-password"
            />
            <p className="text-sm text-gray-500 mt-1">
              {initial.hasPassword
                ? '비밀번호가 저장되어 있습니다. 변경하려면 새 값을 입력하세요. 비워두면 기존 값이 유지됩니다.'
                : '저장된 비밀번호가 없습니다.'}
            </p>
          </div>

          <div>
            <label htmlFor="smtpFrom" className="block text-sm font-medium mb-1">
              FROM 주소
            </label>
            <input
              id="smtpFrom"
              name="smtpFrom"
              type="email"
              className="w-full border rounded px-3 py-2"
              defaultValue={initial.smtpFrom ?? ''}
              placeholder="noreply@example.com"
            />
            <p className="text-sm text-gray-500 mt-1">SMTP 서버에서 사용하는 발신자 주소입니다.</p>
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

      {/* 테스트 메일 발송 (REQ-ADMIN2-111) */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-md font-semibold mb-3">SMTP 설정 테스트</h3>
        {testState.error && (
          <p className="text-sm text-red-600 mb-3" role="alert">
            {testState.error}
          </p>
        )}
        {testState.success && (
          <p className="text-sm text-green-600 mb-3" role="status">
            {testState.message || '테스트 메일이 발송되었습니다. 이메일을 확인해주세요.'}
          </p>
        )}
        <form action={testFormAction}>
          <button
            type="submit"
            disabled={testPending}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {testPending ? '발송 중...' : '테스트 메일 발송'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            현재 로그인된 관리자의 이메일로 테스트 메일을 발송합니다. SMTP 설정이 올바른지 확인할 수
            있습니다.
          </p>
        </form>
      </div>
    </form>
  );
}
