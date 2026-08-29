/**
 * 쪽지 수신 설정 페이지 — SPEC-MESSAGE-001 REQ-MSG-004.
 *
 * 다른 회원이 나에게 쪽지를 보낼 수 있는지 여부를 설정한다.
 * 기본값은 허용(allowMessages=true) — opt-out 모델.
 *
 * @MX:NOTE [AUTO]: Server Component — /settings/notifications 와 동일한 구조
 * (Server Component + Server Action)를 따른다.
 * @MX:SPEC: SPEC-MESSAGE-001 REQ-MSG-004
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// Server Action: 쪽지 수신 설정 업데이트
async function updateAllowMessages(formData: FormData) {
  'use server';

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/settings/messages');
  }

  const userId = typeof session.user.id === 'string'
    ? Number.parseInt(session.user.id, 10)
    : (session.user.id as unknown as number);

  await prisma.user.update({
    where: { id: userId },
    data: { allowMessages: formData.get('allowMessages') === 'on' },
  });

  revalidatePath('/settings/messages');
  redirect('/settings/messages');
}

export default async function MessageSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/settings/messages');
  }

  const userId = typeof session.user.id === 'string'
    ? Number.parseInt(session.user.id, 10)
    : (session.user.id as unknown as number);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { allowMessages: true },
  });

  const isChecked = user?.allowMessages ?? true;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">쪽지 설정</h1>
        <p className="text-sm text-zinc-500 mt-1">
          다른 회원의 쪽지 수신 여부를 선택하세요.
        </p>
      </header>

      <form action={updateAllowMessages} className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            id="allowMessages"
            name="allowMessages"
            type="checkbox"
            defaultChecked={isChecked}
            className="mt-1 w-4 h-4"
          />
          <div className="flex-1">
            <label htmlFor="allowMessages" className="block text-sm font-medium text-zinc-900 cursor-pointer">
              쪽지 수신 허용
            </label>
            <p className="text-sm text-zinc-500 mt-0.5">
              끄면 다른 회원이 나에게 쪽지를 보낼 수 없습니다.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
