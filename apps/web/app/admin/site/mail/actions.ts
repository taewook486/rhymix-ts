'use server';

import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { mailDispatcher } from '@/lib/mail/dispatcher';
import { SmtpMailDispatcher } from '@rhymix-ts/auth';
import { z } from 'zod';

/**
 * SMTP 연결 테스트 Server Action — REQ-MAIL-051
 *
 * 디스패처의 verify() 메서드를 호출하여 SMTP 연결 상태를 확인한다.
 */
export async function testMailConnectionAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect('/login');

  if (!(mailDispatcher instanceof SmtpMailDispatcher)) {
    return { ok: false, error: 'SMTP not configured' };
  }

  const ok = await mailDispatcher.verify();
  return ok ? { ok: true } : { ok: false, error: 'Connection failed' };
}

const SendTestMailInput = z.object({ to: z.string().email() });

/**
 * 테스트 메일 발송 Server Action — REQ-MAIL-052
 *
 * signup-verify 템플릿을 사용하여 테스트 메일을 발송한다.
 */
export async function sendTestMailAction(input: {
  to: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect('/login');

  const parsed = SendTestMailInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid email' };

  try {
    await mailDispatcher.dispatch({
      template: 'signup-verify',
      to: parsed.data.to,
      subject: '[테스트] 메일 발송 테스트',
      vars: { verifyUrl: 'https://example.com/test', userName: 'Test' },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
