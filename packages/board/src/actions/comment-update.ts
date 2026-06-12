/**
 * actions/comment-update.ts — SPEC-BOARD-CRUD-001
 *
 * 댓글 수정 Server Action 래퍼.
 * 소유권 검사 후 댓글을 직접 업데이트한다.
 * (@rhymix-ts/comment 에 updateComment 가 없으므로 prisma 직접 사용)
 * revalidatePath 는 apps/web 레이어에서 처리.
 *
 * @MX:NOTE [AUTO]: Server Action 래퍼. prisma 는 호출자(apps/web)가 주입한다.
 *                  comment service 에 updateComment 없음 — 직접 Prisma 업데이트.
 * @MX:SPEC: SPEC-BOARD-CRUD-001
 */
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// 입력 스키마
// ---------------------------------------------------------------------------

const CommentUpdateFormSchema = z.object({
  commentId: z.coerce.number().int().positive(),
  content: z.string().min(1),
  documentId: z.coerce.number().int().positive(),
  mid: z.string().min(1),
});

// ---------------------------------------------------------------------------
// 소유권 에러
// ---------------------------------------------------------------------------

export class CommentOwnershipError extends Error {
  readonly code = 'COMMENT_OWNERSHIP_ERROR';
  constructor(commentId: number) {
    super(`댓글(${commentId}) 수정 권한이 없습니다.`);
    this.name = 'CommentOwnershipError';
  }
}

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

export interface CommentUpdateActionResult {
  success: boolean;
  error?: string;
  commentId?: number;
}

// ---------------------------------------------------------------------------
// Action 핸들러
// ---------------------------------------------------------------------------

/**
 * FormData 를 파싱해 댓글을 수정한다.
 * 소유권 검사(본인 또는 admin) 후 content 를 업데이트한다.
 * revalidatePath 는 apps/web 레이어에서 처리.
 */
export async function handleCommentUpdateForm(
  formData: FormData,
  ctx: {
    prisma: PrismaClient;
    actor: { userId: number; isAdmin: boolean };
  },
): Promise<CommentUpdateActionResult> {
  const raw = {
    commentId: formData.get('commentId'),
    content: formData.get('content'),
    documentId: formData.get('documentId'),
    mid: formData.get('mid'),
  };

  const parsed = CommentUpdateFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
    };
  }

  try {
    // 댓글 조회 + 소유권 검사
    const comment = await ctx.prisma.comment.findUniqueOrThrow({
      where: { id: parsed.data.commentId },
    });

    if (!ctx.actor.isAdmin && comment.authorId !== ctx.actor.userId) {
      throw new CommentOwnershipError(parsed.data.commentId);
    }

    const updated = await ctx.prisma.comment.update({
      where: { id: parsed.data.commentId },
      data: { content: parsed.data.content },
    });

    return { success: true, commentId: updated.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}
