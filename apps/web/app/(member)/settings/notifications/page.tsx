/**
 * 알림 설정 페이지 — SPEC-NOTIFICATION-001 Slice A Phase 2.
 *
 * 알림 카테고리별 수신 여부를 설정한다.
 * 기본값은 opt-in (enabled=true) - 행이 없으면 활성화로 간주한다.
 *
 * @MX:NOTE [AUTO]: Server Component — 세션 검사 후 auth() 결과를 props 없이 직접 사용.
 * @MX:SPEC: SPEC-NOTIFICATION-001 REQ-NOTIF-032, REQ-NOTIF-033, REQ-NOTIF-034
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { createNotificationService, type NotificationCategory } from '@rhymix-ts/notification';

export const dynamic = 'force-dynamic';

// 카테고리 설정 (라벨, 설명)
const CATEGORY_CONFIG: Array<{
  category: NotificationCategory;
  label: string;
  description: string;
}> = [
  {
    category: 'COMMENT',
    label: '댓글',
    description: '내 게시글에 댓글이 달릴 때 알림을 받습니다.',
  },
  {
    category: 'COMMENT_REPLY',
    label: '댓글 답글',
    description: '내 댓글에 대댓글이 달릴 때 알림을 받습니다.',
  },
  {
    category: 'MENTION',
    label: '멘션',
    description: '댓글에서 @멘션될 때 알림을 받습니다.',
  },
  {
    category: 'MESSAGE',
    label: '쪽지',
    description: '쪽지가 도착할 때 알림을 받습니다. (준비 중)',
  },
];

// Server Action: 알림 설정 업데이트
async function updatePreferences(formData: FormData) {
  'use server';

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/settings/notifications');
  }

  const userId = typeof session.user.id === 'string'
    ? Number.parseInt(session.user.id, 10)
    : (session.user.id as unknown as number);

  const notificationService = createNotificationService(prisma);

  // FormData에서 체크박스 상태 파싱
  const preferences = CATEGORY_CONFIG.map(({ category }) => ({
    category,
    enabled: formData.get(category) === 'on',
  }));

  await notificationService.upsertPreference({
    memberId: userId,
    preferences,
  });

  revalidatePath('/settings/notifications');
  redirect('/settings/notifications');
}

export default async function NotificationSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/settings/notifications');
  }

  const userId = typeof session.user.id === 'string'
    ? Number.parseInt(session.user.id, 10)
    : (session.user.id as unknown as number);

  // 현재 사용자의 알림 설정 조회
  const existingPrefs = await prisma.notificationPreference.findMany({
    where: { memberId: userId },
    select: { category: true, enabled: true },
  });

  // Preference 행이 없는 카테고리는 enabled=true (opt-in, REQ-NOTIF-032)
  const prefMap = new Map<NotificationCategory, boolean>();
  CATEGORY_CONFIG.forEach(({ category }) => {
    const existing = existingPrefs.find((p) => p.category === category);
    prefMap.set(category, existing ? existing.enabled : true);
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">알림 설정</h1>
        <p className="text-sm text-zinc-500 mt-1">
          수신할 알림의 종류를 선택하세요.
        </p>
      </header>

      <form action={updatePreferences} className="space-y-4">
        {CATEGORY_CONFIG.map(({ category, label, description }) => {
          const isChecked = prefMap.get(category) ?? true;

          return (
            <div key={category} className="flex items-start gap-3">
              <input
                id={category}
                name={category}
                type="checkbox"
                defaultChecked={isChecked}
                className="mt-1 w-4 h-4"
              />
              <div className="flex-1">
                <label htmlFor={category} className="block text-sm font-medium text-zinc-900 cursor-pointer">
                  {label}
                </label>
                <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
              </div>
            </div>
          );
        })}

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
