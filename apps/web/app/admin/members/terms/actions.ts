'use server';
/**
 * 약관 관리 Server Actions — SPEC-CAPTCHA-001 REQ-CAPTCHA-002.
 *
 * 약관 CRUD Server Actions.
 *
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-002, AC-CAPTCHA-006
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getServerCaller } from '@/lib/trpc/server';

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}

// 약관 스키마
const TermSchema = z.object({
  id: z.number().optional(),
  type: z.enum(['terms', 'privacy', 'custom']),
  title: z.string().min(1, '제목을 입력하세요'),
  content: z.string().min(1, '내용을 입력하세요'),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
});

// 생성/수정
export async function upsertTermAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = TermSchema.safeParse({
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    type: formData.get('type'),
    title: formData.get('title'),
    content: formData.get('content'),
    required: formData.get('required') === 'on',
    active: formData.get('active') === 'on',
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const caller = await getServerCaller();
    const { id, ...fields } = parsed.data;
    if (id !== undefined) {
      await caller.admin.terms.update({ id, ...fields });
    } else {
      await caller.admin.terms.create(fields);
    }

    revalidatePath('/admin/members/terms');
    return { success: true };
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '약관 저장 중 오류가 발생했습니다.' };
  }
}

// 삭제
export async function deleteTermAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get('id'));

  if (!id || Number.isNaN(id)) {
    return { error: '유효하지 않은 약관 ID입니다.' };
  }

  try {
    const caller = await getServerCaller();
    await caller.admin.terms.delete({ id });

    revalidatePath('/admin/members/terms');
    return { success: true };
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message };
    }
    return { error: '약관 삭제 중 오류가 발생했습니다.' };
  }
}
