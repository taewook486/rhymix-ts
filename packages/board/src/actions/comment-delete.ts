/**
 * actions/comment-delete.ts — SPEC-BOARD-CRUD-001
 *
 * 댓글 삭제 Server Action 래퍼.
 * 소유권 검사 후 deleteComment(@rhymix-ts/comment) 를 호출한다.
 * revalidatePath 는 apps/web 레이어에서 처리.
 *
 * @MX:NOTE [AUTO]: Server Action 래퍼. prisma 는 호출자(apps/web)가 주입한다.
 * @MX:SPEC: SPEC-BOARD-CRUD-001
 */
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { deleteComment } from '@rhymix-ts/comment';

// ---------------------------------------------------------------------------
// 입력 스키마
// ---------------------------------------------------------------------------

const CommentDeleteFormSchema = z.object({
  commentId: z.coerce.number().int().positive(),
  documentId: z.coerce.number().int().positive(),
  mid: z.string().min(1),
});

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

export interface CommentDeleteActionResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Action 핸들러
// ---------------------------------------------------------------------------

/**
 * FormData 를 파싱해 댓글을 삭제(soft delete)한다.
 * 소유권 검사는 deleteComment 내부에서 수행.
 * revalidatePath 는 apps/web 레이어에서 처리.
 */
export async function handleCommentDeleteForm(
  formData: FormData,
  ctx: {
    prisma: PrismaClient;
    actor: { userId: number; userGroupSrl: number; isAdmin: boolean };
  },
): Promise<CommentDeleteActionResult> {
  const raw = {
    commentId: formData.get('commentId'),
    documentId: formData.get('documentId'),
    mid: formData.get('mid'),
  };

  const parsed = CommentDeleteFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
    };
  }

  try {
    await deleteComment(
      {
        id: parsed.data.commentId,
        actor: ctx.actor,
      },
      { prisma: ctx.prisma },
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}
