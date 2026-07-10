/**
 * 글로벌 헤더 — 도메인의 HEADER_PRIMARY 슬롯 메뉴를 렌더링하는 Server Component.
 * SPEC-SEARCH-001: 헤더 검색 UI 추가
 * SPEC-MENU-001 Slice D: 다중 슬롯 메뉴 렌더링
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-030~034
 */
import Link from 'next/link';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { DarkModeToggle } from '@/components/theme/DarkModeToggle';
import { auth } from '@/lib/auth/config';
import { createNotificationService } from '@rhymix-ts/notification';
import { NotificationBell } from '@rhymix-ts/ui/components';
import { markOneRead, markAllRead } from '@/app/(member)/notifications/actions';
import { UserAuthSection } from '@/components/layout/UserAuthSection';
import { SearchIcon } from './SearchIcon';
import { MenuSlotRenderer } from './MenuRenderer';

export async function GlobalHeader() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  if (!Number.isFinite(domainId) || domainId <= 0) return null;

  // SPEC-NOTIFICATION-001 Slice A 작업 항목 6: 헤더에 미읽음 카운트 배지
  const session = await auth();
  const userId = session?.user?.id
    ? (typeof session.user.id === 'string' ? Number.parseInt(session.user.id, 10) : session.user.id)
    : null;

  let unreadCount = 0;
  let recentNotifications: Array<{
    id: number;
    category: string;
    actorNickname: string | null;
    read: boolean;
    createdAt: Date;
  }> = [];

  if (userId != null) {
    const notificationService = createNotificationService(prisma);
    unreadCount = await notificationService.countUnread({ recipientId: userId });
    const result = await notificationService.list({ recipientId: userId, limit: 5 });
    recentNotifications = result.items as typeof recentNotifications;
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="mx-auto max-w-6xl flex items-center gap-6 px-6 py-3">
        <Link href="/" className="text-lg font-bold text-blue-700 shrink-0">
          Rhymix-TS
        </Link>
        <nav aria-label="주 메뉴">
          {/* SPEC-MENU-001 Slice D: HEADER_PRIMARY 슬롯 렌더링 (REQ-MENU-030~034) */}
          <MenuSlotRenderer slot="HEADER_PRIMARY" domainId={domainId} />
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchIcon />
          {userId != null && (
            <NotificationBell
              unreadCount={unreadCount}
              notifications={recentNotifications}
              onMarkRead={markOneRead}
              onMarkAllRead={markAllRead}
            />
          )}
          <DarkModeToggle />
          {/* @MX:NOTE: [AUTO] 인증 상태에 따른 UI 분기 — SPEC-INSTALL-002 Group 1 */}
          {/* @MX:REASON: Server Component에서 계산한 userId/사용자 정보를 Client Component로 전달하여 조건부 렌더링 */}
          <UserAuthSection
            userId={userId}
            userName={session?.user?.name ?? null}
            userEmail={session?.user?.email ?? null}
            userIdString={session?.user?.id ?? null}
          />
        </div>
      </div>
    </header>
  );
}
