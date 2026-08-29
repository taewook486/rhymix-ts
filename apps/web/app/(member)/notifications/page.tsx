/**
 * 알림 목록 페이지 — SPEC-NOTIFICATION-001 Slice A Phase 2.
 *
 * 현재 로그인 사용자의 알림을 최신순으로 나열한다.
 * 단일 읽음 처리와 전체 읽음 처리 Server Action을 제공한다.
 *
 * @MX:NOTE [AUTO]: Server Component — 세션 검사 후 auth() 결과를 props 없이 직접 사용.
 * @MX:SPEC: SPEC-NOTIFICATION-001 REQ-NOTIF-020, REQ-NOTIF-022, REQ-NOTIF-023, REQ-NOTIF-024
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { createNotificationService } from '@rhymix-ts/notification';
import type { NotificationCategory } from '@rhymix-ts/notification';
import { markOneRead, markAllRead } from './actions';

export const dynamic = 'force-dynamic';

// 카테고리 한글명 매핑
const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  COMMENT: '댓글',
  COMMENT_REPLY: '댓글 답글',
  MENTION: '멘션',
  MESSAGE: '쪽지',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR');
}

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/notifications');
  }

  const userId = typeof session.user.id === 'string'
    ? Number.parseInt(session.user.id, 10)
    : (session.user.id as unknown as number);

  const notificationService = createNotificationService(prisma);
  const result = await notificationService.list({
    recipientId: userId,
    limit: 50,
  });

  const notifications = result.items;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">알림</h1>

        {notifications.length > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              전체 읽음
            </button>
          </form>
        )}
      </header>

      {notifications.length === 0 ? (
        <p className="text-zinc-500 text-sm">알림이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
          {notifications.map((notif: any) => {
            const isUnread = !notif.read;
            const categoryLabel = CATEGORY_LABELS[notif.category as NotificationCategory] || notif.category;
            const timeLabel = formatRelativeTime(new Date(notif.createdAt));

            return (
              <li
                key={notif.id}
                className={`px-4 py-3 hover:bg-zinc-50 ${isUnread ? 'bg-blue-50' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                        {categoryLabel}
                      </span>
                      {isUnread && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          미읽음
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-zinc-800 mb-1">
                      {notif.actorNickname && (
                        <span className="font-medium">{notif.actorNickname}</span>
                      )}{' '}
                      {notif.category === 'COMMENT' && '님이 댓글을 남겼습니다.'}
                      {notif.category === 'COMMENT_REPLY' && '님이 대댓글을 남겼습니다.'}
                      {notif.category === 'MENTION' && '님이 멘션했습니다.'}
                      {notif.category === 'MESSAGE' && '님이 쪽지를 보냈습니다.'}
                    </p>

                    <p className="text-xs text-zinc-500">{timeLabel}</p>
                  </div>

                  {isUnread && (
                    <form action={markOneRead.bind(null, notif.id)}>
                      <button
                        type="submit"
                        className="shrink-0 text-xs px-3 py-1.5 bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                      >
                        읽음
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
