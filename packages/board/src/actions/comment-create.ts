/**
 * actions/comment-create.ts — SPEC-BOARD-CRUD-001
 *
 * 댓글 생성 Server Action 래퍼.
 * write_comment 권한 검사 후 createComment 를 호출한다.
 * revalidatePath 는 apps/web 레이어에서 처리.
 *
 * @MX:NOTE [AUTO]: Server Action 래퍼. prisma 는 호출자(apps/web)가 주입한다.
 * @MX:SPEC: SPEC-BOARD-CRUD-001
 */
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { createComment } from '@rhymix-ts/comment';
import { canPerformAction } from '../permissions.js';

// ---------------------------------------------------------------------------
// 입력 스키마
// ---------------------------------------------------------------------------

const CommentCreateFormSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  content: z.string().min(1),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  mid: z.string().min(1),
});

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

export interface CommentCreateActionResult {
  success: boolean;
  error?: string;
  commentId?: number;
}

// ---------------------------------------------------------------------------
// Action 핸들러
// ---------------------------------------------------------------------------

/**
 * FormData 를 파싱해 댓글을 생성한다.
 * write_comment 권한이 없으면 에러를 반환한다.
 * revalidatePath 는 apps/web 레이어에서 처리.
 */
export async function handleCommentCreateForm(
  formData: FormData,
  ctx: {
    prisma: PrismaClient;
    authorId: number | null;
    actor: { userGroupSrl: number; isAdmin: boolean };
  },
): Promise<CommentCreateActionResult> {
  const raw = {
    documentId: formData.get('documentId'),
    content: formData.get('content'),
    parentId: formData.get('parentId') ?? null,
    mid: formData.get('mid'),
  };

  const parsed = CommentCreateFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
    };
  }

  try {
    // 게시판 인스턴스 + 권한 검사
    const doc = await ctx.prisma.document.findUniqueOrThrow({
      where: { id: parsed.data.documentId },
      include: { board: true },
    });

    if (!canPerformAction(doc.board as { permissions: Record<string, number[]> | null }, 'write_comment', ctx.actor)) {
      return { success: false, error: '댓글 작성 권한이 없습니다.' };
    }

    // createComment 는 내부에서도 권한 재검사 수행 (canPerformAction from @rhymix-ts/document)
    const comment = await createComment(
      {
        documentId: parsed.data.documentId,
        content: parsed.data.content,
        parentId: parsed.data.parentId ?? null,
        authorId: ctx.authorId,
        nickName: null,
        actor: ctx.actor,
      },
      { prisma: ctx.prisma },
    );

    return { success: true, commentId: comment.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}
