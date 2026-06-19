'use client';
/**
 * Admin Footer Component — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * Global admin utilities buttons: menu cache reset, session cleanup.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-150, REQ-ADMIN2-151
 */
import { useActionState } from 'react';
import {
  invalidateMenuCacheAction,
  purgeExpiredSessionsAction,
  type ActionState,
} from '../../app/admin/layout-actions';

export function AdminFooter() {
  const [menuState, menuFormAction, menuPending] = useActionState(
    invalidateMenuCacheAction,
    {} as ActionState,
  );

  const [sessionState, sessionFormAction, sessionPending] = useActionState(
    purgeExpiredSessionsAction,
    {} as ActionState,
  );

  return (
    <footer className="border-t bg-white p-4 mt-8">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">관리자 유틸리티</h3>

        <div className="flex flex-wrap gap-3">
          {/* Menu Cache Reset (REQ-ADMIN2-150) */}
          <form action={menuFormAction} className="flex items-center gap-2">
            <button
              type="submit"
              disabled={menuPending}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {menuPending ? '초기화 중...' : '관리자 메뉴 초기화'}
            </button>
            {menuState.error && (
              <span className="text-sm text-red-600" role="alert">
                {menuState.error}
              </span>
            )}
            {menuState.success && (
              <span className="text-sm text-green-600" role="status">
                메뉴 캐시가 초기화되었습니다.
              </span>
            )}
          </form>

          {/* Session Cleanup (REQ-ADMIN2-151) */}
          <form action={sessionFormAction} className="flex items-center gap-2">
            <button
              type="submit"
              disabled={sessionPending}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {sessionPending ? '정리 중...' : '세션 정리'}
            </button>
            {sessionState.error && (
              <span className="text-sm text-red-600" role="alert">
                {sessionState.error}
              </span>
            )}
            {sessionState.success && sessionState.data && (
              <span className="text-sm text-green-600" role="status">
                {sessionState.data.removedCount as number > 0
                  ? `${sessionState.data.removedCount}개의 만료 세션을 정리했습니다.`
                  : '정리할 만료 세션이 없습니다.'}
              </span>
            )}
          </form>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <p>
            <strong>관리자 메뉴 초기화:</strong> 캐시된 관리자 메뉴 구조를 무효화하고 다음 요청에서 재생성합니다. (REQ-ADMIN2-150)
          </p>
          <p className="mt-1">
            <strong>세션 정리:</strong> 만료된 세션과 오래된 세션 취소 기록을 일괄 삭제합니다. 현재 관리자의 세션은 유지됩니다. (REQ-ADMIN2-151)
          </p>
        </div>
      </div>
    </footer>
  );
}
