'use server';
/**
 * 디버그 설정 Server Actions — SPEC-ADMIN-002 Slice 3E (REQ-ADMIN2-117/159/160).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-117, REQ-ADMIN2-159, REQ-ADMIN2-160
 */
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function updateDebugSettingsAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();

  if (!isAdminSession(session)) {
    return { error: '권한이 없습니다.' };
  }

  try {
    const caller = await getServerCaller();

    // REQ-ADMIN2-159: 느린 작업 임계값 (초 단위)
    const slowQueryThreshold = parseFloat(formData.get('slowQueryThreshold') as string);
    const slowTriggerThreshold = parseFloat(formData.get('slowTriggerThreshold') as string);
    const slowWidgetThreshold = parseFloat(formData.get('slowWidgetThreshold') as string);
    const slowExternalThreshold = parseFloat(formData.get('slowExternalThreshold') as string);

    // REQ-ADMIN2-159: 디버그 정보 표시 방법 (복수 선택)
    const displayMethods = formData.getAll('displayMethods') as (
      | 'html_comment'
      | 'screen_panel'
      | 'file_log'
    )[];

    // REQ-ADMIN2-159: 디버그 정보 표시 내용 (복수 선택)
    const contentTypes = formData.getAll('contentTypes') as (
      | 'request_response'
      | 'debug_message'
      | 'error'
      | 'query'
      | 'slow_query'
      | 'slow_trigger'
      | 'slow_widget'
      | 'slow_external'
    )[];

    // REQ-ADMIN2-117/159: 디버그 정보 표시 대상
    const displayTarget = formData.get('displayTarget') as 'admin_only' | 'allowed_ips' | 'all';

    // REQ-ADMIN2-159: 디버그 허용 IP 목록
    const allowedIpsRaw = formData.get('allowedIps') as string;
    const allowedIps = allowedIpsRaw ? allowedIpsRaw.split('\n').map(ip => ip.trim()).filter(ip => ip.length > 0) : [];

    // REQ-ADMIN2-160: 에러 로그 기록 수준
    const errorLogLevel = formData.get('errorLogLevel') as 'all_errors_warnings' | 'critical_only';

    const debugData = {
      enabled: formData.get('enabled') === 'true',
      slowQueryThreshold,
      slowTriggerThreshold,
      slowWidgetThreshold,
      slowExternalThreshold,
      displayMethods,
      contentTypes,
      logFilePath: (formData.get('logFilePath') as string) || '',
      displayTarget,
      allowedIps,
      addQueryComment: formData.get('addQueryComment') === 'true',
      showFullCallStack: formData.get('showFullCallStack') === 'true',
      deduplicateErrors: formData.get('deduplicateErrors') === 'true',
      errorLogLevel,
    };

    await caller.admin.settings.updateDebug(debugData);

    revalidatePath('/admin/settings/debug');

    return { success: true };
  } catch (error) {
    console.error('Debug settings update error:', error);
    return { error: '설정 저장에 실패했습니다.' };
  }
}
