import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { mailDispatcher } from '@/lib/mail/dispatcher';
import { SmtpMailDispatcher } from '@rhymix-ts/auth';
import MailTestButtons from './MailTestButtons';

/**
 * 관리자 메일 설정 페이지 — REQ-MAIL-050
 *
 * SMTP 설정 상태를 표시하고 연결 테스트 및 테스트 메일 발송 기능을 제공한다.
 */
export default async function AdminMailSettingsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect('/login');

  const isSmtp = mailDispatcher instanceof SmtpMailDispatcher;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ?? '587';
  const smtpFrom = process.env.SMTP_FROM;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUserSet = !!process.env.SMTP_USER;
  const smtpPassSet = !!process.env.SMTP_PASS;

  // 호스트 마스킹 — REQ-MAIL-050
  const maskedHost = smtpHost
    ? smtpHost.replace(/^([^.]+)/, (m) => m[0] + '*'.repeat(m.length - 1))
    : undefined;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">메일 설정</h1>

      {!isSmtp && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-yellow-800">
            ⚠ 메일 발송이 비활성화되어 있습니다. .env 에 SMTP_HOST 를 설정하세요.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">SMTP 설정</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-gray-500">디스패처</dt>
          <dd className="font-mono">
            {isSmtp ? 'SmtpMailDispatcher' : 'NoopMailDispatcher'}
          </dd>

          <dt className="text-gray-500">SMTP_HOST</dt>
          <dd className="font-mono">{maskedHost ?? '(미설정)'}</dd>

          <dt className="text-gray-500">SMTP_PORT</dt>
          <dd className="font-mono">{smtpPort}</dd>

          <dt className="text-gray-500">SMTP_FROM</dt>
          <dd className="font-mono">{smtpFrom ?? '(미설정)'}</dd>

          <dt className="text-gray-500">SMTP_SECURE</dt>
          <dd className="font-mono">{String(smtpSecure)}</dd>

          <dt className="text-gray-500">SMTP_USER</dt>
          <dd className="font-mono">{smtpUserSet ? '(설정됨)' : '(미설정)'}</dd>

          <dt className="text-gray-500">SMTP_PASS</dt>
          <dd className="font-mono">{smtpPassSet ? '(설정됨)' : '(미설정)'}</dd>
        </dl>
      </div>

      <MailTestButtons />
    </div>
  );
}
