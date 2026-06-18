'use server';
/**
 * 가입 양식 편집 Server Action — SPEC-ADMIN-002 REQ-ADMIN2-054/055.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-054, REQ-ADMIN2-055
 */
import { revalidatePath } from 'next/cache';
import { getServerCaller } from '@/lib/trpc/server';

export interface UpdateJoinFormActionField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  order: number;
}

export async function updateJoinFormAction(
  fields: UpdateJoinFormActionField[],
): Promise<{ ok: true } | { error: string }> {
  try {
    const caller = await getServerCaller();
    await caller.admin.settings.updateJoinForm({ fields });
    revalidatePath('/admin/members/joinform');
    return { ok: true };
  } catch (err) {
    return { error: '가입 양식 저장 중 오류가 발생했습니다.' };
  }
}
