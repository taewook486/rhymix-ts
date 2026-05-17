/**
 * document.ts — SPEC-CONTENT-001 Slice A
 *
 * Document 도메인 함수 (minimum viable kernel).
 * 권한 평가 / XSS sanitization / FTS / 익명 / 통계 갱신 / 카테고리 / 첨부는 Slice B+ 에서 추가.
 *
 * REQ-CONTENT-010, REQ-CONTENT-020 의 기초 구현.
 */
import { z } from 'zod';
import type { PrismaClient, Document } from '@prisma/client';

// ---------------------------------------------------------------------------
// createDocument
// ---------------------------------------------------------------------------

const CreateDocumentSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  authorId: z.number().int().positive().nullable(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  nickName: z.string().min(1).max(80).nullable().default(null),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export async function createDocument(
  input: CreateDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const parsed = CreateDocumentSchema.parse(input);

  const board = await ctx.prisma.board.findUniqueOrThrow({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });

  return ctx.prisma.document.create({
    data: {
      boardId: board.id,
      authorId: parsed.authorId,
      nickName: parsed.nickName,
      title: parsed.title,
      content: parsed.content,
      // Slice A: HTML sanitize 미적용 — content == contentText
      contentText: parsed.content,
      status: 'TEMP',
    },
  });
}

// ---------------------------------------------------------------------------
// listDocuments
// ---------------------------------------------------------------------------

const ListDocumentsSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
});

export type ListDocumentsInput = z.infer<typeof ListDocumentsSchema>;

export async function listDocuments(
  input: ListDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<Document[]> {
  const parsed = ListDocumentsSchema.parse(input);

  const board = await ctx.prisma.board.findUnique({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });
  if (!board) return [];

  return ctx.prisma.document.findMany({
    where: {
      boardId: board.id,
      status: parsed.status,
      deletedAt: null,
    },
    orderBy: { regdate: 'desc' },
    take: 20,
  });
}

// ---------------------------------------------------------------------------
// getDocument
// ---------------------------------------------------------------------------

export async function getDocument(
  id: number,
  ctx: { prisma: PrismaClient },
): Promise<Document & { author: { id: number; userId: string; nickName: string } | null }> {
  return ctx.prisma.document.findUniqueOrThrow({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          userId: true,
          nickName: true,
        },
      },
    },
  });
}
