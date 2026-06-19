'use server';
/**
 * Admin Layout Global Utilities Server Actions — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-150, REQ-ADMIN2-151
 */
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export interface ActionState {
  error?: string;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * 관리자 메뉴 캐시 초기화 (REQ-ADMIN2-150)
 */
export async function invalidateMenuCacheAction(
  _prev: ActionState | null,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();
    const result = await caller.admin.adminUtils.invalidateMenuCache();
    return { success: true, message: '메뉴 캐시가 초기화되었습니다.', data: { invalidated: result.invalidated, path: result.path } };
  } catch (error) {
    console.error('Menu cache invalidation error:', error);
    return { error: '메뉴 캐시 초기화에 실패했습니다.' };
  }
}

/**
 * 세션 정리 (REQ-ADMIN2-151)
 */
export async function purgeExpiredSessionsAction(
  _prev: ActionState | null,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();
    const result = await caller.admin.adminUtils.purgeExpiredSessions({ batchSize: 500 });
    return {
      success: true,
      message: result.removedCount > 0
        ? `${result.removedCount}개의 만료 세션을 정리했습니다.`
        : '정리할 만료 세션이 없습니다.',
      data: {
        removedCount: result.removedCount,
        currentSessionPreserved: result.currentSessionPreserved,
        breakdown: result.breakdown,
      },
    };
  } catch (error) {
    console.error('Session purge error:', error);
    return { error: '세션 정리에 실패했습니다.' };
  }
}
