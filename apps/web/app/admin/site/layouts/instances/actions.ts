'use server';
/**
 * Layout 인스턴스 생성 Server Action — SPEC-ADMIN-002 REQ-ADMIN2-021 + REQ-ADMIN2-024.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-021, REQ-ADMIN2-024
 */
import { revalidatePath } from 'next/cache';
import { getServerCaller } from '@/lib/trpc/server';

export async function createLayoutInstanceAction(
  themeId: string,
  scope: 'SITE' | 'DOMAIN' | 'MODULE_INSTANCE',
  refId: string,
  layoutName: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller();
    await caller.admin.layout.createInstance({ themeId, scope, refId, layoutName });
    revalidatePath('/admin/site/layouts/instances');
    return { ok: true };
  } catch (err) {
    return { error: '인스턴스 생성 중 오류가 발생했습니다.' };
  }
}

/**
 * Layout 인스턴스 복제 Server Action — REQ-ADMIN2-024.
 * 기존 인스턴스의 변수 값을 포함하여 새 인스턴스를 생성한다.
 */
export async function duplicateLayoutInstanceAction(
  instanceId: string,
  newRefId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller();
    await caller.admin.layout.duplicateInstance({ instanceId, newRefId });
    revalidatePath('/admin/site/layouts/instances');
    return { ok: true };
  } catch (err) {
    return { error: '인스턴스 복제 중 오류가 발생했습니다.' };
  }
}
