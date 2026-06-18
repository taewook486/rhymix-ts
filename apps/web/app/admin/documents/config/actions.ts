'use server'
/**
 * 문서 설정 Server Actions — SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-074)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-074
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getServerCaller } from '@/lib/trpc/server'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// Document Config Actions
// ---------------------------------------------------------------------------

const UpdateDocumentConfigSchema = z.object({
  sortOrder: z.enum(['latest', 'popular', 'comment_count']),
  pageSize: z.coerce.number().int().min(1).max(100),
  allowGuestWrite: z.boolean().default(false),
})

export async function updateDocumentConfigAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = UpdateDocumentConfigSchema.safeParse({
    sortOrder: formData.get('sortOrder') || 'latest',
    pageSize: formData.get('pageSize') || 20,
    allowGuestWrite: formData.get('allowGuestWrite') === 'on',
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const caller = await getServerCaller()
    await caller.admin.document.updateConfig(parsed.data)
  } catch (err) {
    if (err instanceof TRPCError) {
      return { error: err.message }
    }
    return { error: '문서 설정 저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/admin/documents/config')
  return {}
}
