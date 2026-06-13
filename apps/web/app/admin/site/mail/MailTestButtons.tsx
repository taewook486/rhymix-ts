'use client';

import { useState } from 'react';
import { testMailConnectionAction, sendTestMailAction } from './actions';

/**
 * 메일 테스트 버튼 컴포넌트 — REQ-MAIL-051, REQ-MAIL-052
 *
 * 연결 테스트와 테스트 메일 발송 기능을 제공하는 Client Component.
 */
export default function MailTestButtons() {
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
  } | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendResult, setSendResult] = useState<{
    ok: boolean;
    error?: string;
  } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function handleTest() {
    setIsTestingConn(true);
    setTestResult(null);
    try {
      const result = await testMailConnectionAction();
      setTestResult(result);
    } finally {
      setIsTestingConn(false);
    }
  }

  async function handleSend() {
    if (!sendEmail) return;
    setIsSending(true);
    setSendResult(null);
    try {
      const result = await sendTestMailAction({ to: sendEmail });
      setSendResult(result);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* 연결 테스트 버튼 — REQ-MAIL-051 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTest}
          disabled={isTestingConn}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isTestingConn ? '테스트 중...' : '연결 테스트'}
        </button>
        {testResult && (
          <span className={testResult.ok ? 'text-green-600' : 'text-red-600'}>
            {testResult.ok ? '✓ 연결 성공' : `✗ ${testResult.error}`}
          </span>
        )}
      </div>

      {/* 테스트 메일 발송 — REQ-MAIL-052 */}
      <div className="flex items-center gap-3">
        <input
          type="email"
          value={sendEmail}
          onChange={(e) => setSendEmail(e.target.value)}
          placeholder="수신 이메일 주소"
          className="px-3 py-2 border rounded w-64"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !sendEmail}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isSending ? '발송 중...' : '테스트 메일 발송'}
        </button>
        {sendResult && (
          <span className={sendResult.ok ? 'text-green-600' : 'text-red-600'}>
            {sendResult.ok ? '✓ 발송됨' : `✗ ${sendResult.error}`}
          </span>
        )}
      </div>
    </div>
  );
}
