/**
 * actions/create-document.ts — SPEC-CONTENT-001 Slice B (T-013)
 *
 * 글쓰기 Server Action.
 * FormData → createDocument → redirect.
 *
 * 'use server' 지시어는 apps/web 레이어에서 re-export 할 때 추가하거나,
 * WritePage 내부에서 inline action 으로 사용한다.
 * 패키지 레이어에서는 순수 함수 시그니처만 제공.
 *
 * @MX:NOTE [AUTO]: Server Action 래퍼. prisma 는 호출자(apps/web)가 주입한다.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010
 */
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { createDocument } from '../document';

const CreateDocumentFormSchema = z.object({
  moduleInstanceId: z.coerce.number().int().positive(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export interface CreateDocumentActionResult {
  success: boolean;
  error?: string;
  documentId?: number;
}

/**
 * FormData 를 파싱해 createDocument 를 호출한다.
 * 성공 시 생성된 document id 를 반환한다.
 * redirect 는 apps/web 레이어(WritePage Server Action wrapper)에서 처리.
 */
export async function handleCreateDocumentForm(
  formData: FormData,
  ctx: {
    prisma: PrismaClient;
    authorId: number | null;
    actor: { userGroupSrl: number; isAdmin: boolean };
  },
): Promise<CreateDocumentActionResult> {
  const raw = {
    moduleInstanceId: formData.get('moduleInstanceId'),
    title: formData.get('title'),
    content: formData.get('content'),
  };

  const parsed = CreateDocumentFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.' };
  }

  try {
    const doc = await createDocument(
      {
        moduleInstanceId: parsed.data.moduleInstanceId,
        authorId: ctx.authorId,
        nickName: null,
        title: parsed.data.title,
        content: parsed.data.content,
        status: 'PUBLIC',
        actor: ctx.actor,
      },
      { prisma: ctx.prisma },
    );
    return { success: true, documentId: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}
