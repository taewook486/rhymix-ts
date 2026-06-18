'use server';
/**
 * Layout 인스턴스 생성 Server Action — SPEC-ADMIN-002 REQ-ADMIN2-021.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-021
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
