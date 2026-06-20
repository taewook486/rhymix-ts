/**
 * NotificationBell 컴포넌트 — SPEC-NOTIFICATION-001 Slice A Phase 2.
 *
 * 알림 드롭다운을 표시하는 벨 아이콘 컴포넌트.
 * dropdown-menu + badge + toast 기반의 프레젠테이션용 컴포넌트로,
 * packages/ui 패키지의 의존성 방지를 위해 데이터 페칭은 props로 주입받는다.
 *
 * @MX:NOTE [AUTO]: Client Component — presentational/composable design, no direct service dependency.
 * @MX:SPEC: SPEC-NOTIFICATION-001 REQ-NOTIF-025 (미읽음 카운트 표시)
 */
'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../index';
import { Badge } from './badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { toast } from 'sonner';

export interface NotificationItem {
  id: number;
  category: string;
  actorNickname: string | null;
  read: boolean;
  createdAt: Date | string;
  sourceUrl?: string; // 선택적: 알림 클릭 시 이동할 URL
}

export interface NotificationBellProps {
  unreadCount: number;
  notifications?: NotificationItem[];
  onMarkRead?: (notificationId: number) => void | Promise<void>;
  onMarkAllRead?: () => void | Promise<void>;
  onViewAll?: () => void; // 전체 알림 페이지로 이동
  className?: string;
}

// 카테고리 한글명 매핑
const CATEGORY_LABELS: Record<string, string> = {
  COMMENT: '댓글',
  COMMENT_REPLY: '댓글 답글',
  MENTION: '멘션',
  MESSAGE: '쪽지',
};

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return d.toLocaleDateString('ko-KR');
}

export function NotificationBell({
  unreadCount,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onViewAll,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);

  // 드롭다운에서 표시할 최근 알림 (최대 5개)
  const recentNotifications = notifications.slice(0, 5);

  const handleMarkRead = async (notificationId: number) => {
    try {
      await onMarkRead?.(notificationId);
      toast.success('알림을 읽음으로 표시했습니다.');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('알림 읽음 처리에 실패했습니다.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await onMarkAllRead?.();
      toast.success('모든 알림을 읽음으로 표시했습니다.');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('전체 읽음 처리에 실패했습니다.');
    }
  };

  const handleViewAll = () => {
    onViewAll?.();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative p-2 rounded-md hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500',
            className
          )}
          aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개의 미읽음 알림)` : ''}`}
        >
          <Bell className="h-5 w-5 text-zinc-600" />

          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>알림</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {recentNotifications.length === 0 ? (
          <div className="px-2 py-4 text-sm text-zinc-500 text-center">
            알림이 없습니다.
          </div>
        ) : (
          <>
            {recentNotifications.map((notif) => {
              const categoryLabel = CATEGORY_LABELS[notif.category] || notif.category;
              const timeLabel = formatRelativeTime(notif.createdAt);
              const isUnread = !notif.read;

              return (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-default"
                  onClick={(e) => {
                    // 소스 URL이 있으면 이동, 아니면 기본 동작
                    if (notif.sourceUrl) {
                      window.location.href = notif.sourceUrl;
                    }
                    // 드롭다운 닫기 방지 (선택적)
                    e.stopPropagation();
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      {categoryLabel}
                    </span>
                    {isUnread && (
                      <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        미읽음
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-800 mt-1">
                    {notif.actorNickname && (
                      <span className="font-medium">{notif.actorNickname}</span>
                    )}{' '}
                    {notif.category === 'COMMENT' && '님이 댓글을 남겼습니다.'}
                    {notif.category === 'COMMENT_REPLY' && '님이 대댓글을 남겼습니다.'}
                    {notif.category === 'MENTION' && '님이 멘션했습니다.'}
                    {notif.category === 'MESSAGE' && '님이 쪽지를 보냈습니다.'}
                  </p>

                  <div className="flex items-center justify-between w-full mt-2">
                    <span className="text-xs text-zinc-500">{timeLabel}</span>

                    {isUnread && onMarkRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notif.id);
                        }}
                        className="text-xs px-2 py-1 bg-white border border-zinc-300 text-zinc-700 rounded hover:bg-zinc-50"
                      >
                        읽음
                      </button>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />

            <div className="px-2 py-2 flex items-center justify-between">
              {onViewAll && (
                <button
                  type="button"
                  onClick={handleViewAll}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  모두 보기
                </button>
              )}

              {unreadCount > 0 && onMarkAllRead && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  전체 읽음
                </button>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
