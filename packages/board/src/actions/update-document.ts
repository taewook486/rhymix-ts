/**
 * actions/update-document.ts — SPEC-BOARD-CRUD-001
 *
 * 글수정 Server Action 래퍼.
 * 소유권 검사 후 updateDocument 를 호출한다.
 * revalidatePath / redirect 는 apps/web 레이어에서 처리.
 *
 * @MX:NOTE [AUTO]: Server Action 래퍼. prisma 는 호출자(apps/web)가 주입한다.
 * @MX:SPEC: SPEC-BOARD-CRUD-001
 */
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { updateDocument } from '@rhymix-ts/document';

// ---------------------------------------------------------------------------
// 입력 스키마
// ---------------------------------------------------------------------------

const UpdateDocumentFormSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  moduleInstanceId: z.coerce.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  extraValues: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

export interface UpdateDocumentActionResult {
  success: boolean;
  error?: string;
  documentId?: number;
}

// ---------------------------------------------------------------------------
// Action 핸들러
// ---------------------------------------------------------------------------

/**
 * FormData 를 파싱해 updateDocument 를 호출한다.
 * 성공 시 documentId 를 반환한다.
 * redirect 는 apps/web 레이어에서 처리.
 */
export async function handleUpdateDocumentForm(
  formData: FormData,
  ctx: {
    prisma: PrismaClient;
    actor: { userId: number; userGroupSrl: number; isAdmin: boolean };
  },
): Promise<UpdateDocumentActionResult> {
  const raw = {
    documentId: formData.get('documentId'),
    moduleInstanceId: formData.get('moduleInstanceId'),
    title: formData.get('title') ?? undefined,
    content: formData.get('content') ?? undefined,
    categoryId: formData.get('categoryId') ?? undefined,
    extraValues: undefined,
  };

  const parsed = UpdateDocumentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
    };
  }

  try {
    const doc = await updateDocument(
      {
        id: parsed.data.documentId,
        title: parsed.data.title,
        content: parsed.data.content,
        actor: ctx.actor,
        extraVars: parsed.data.extraValues,
      },
      { prisma: ctx.prisma },
    );
    return { success: true, documentId: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}
