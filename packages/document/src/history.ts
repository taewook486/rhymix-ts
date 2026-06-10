/**
 * history.ts — SPEC-CONTENT-001 Slice D
 *
 * Document 수정 이력 기록/조회.
 *
 * @MX:NOTE [AUTO]: recordUpdate 는 반드시 트랜잭션 내에서 호출. 호출 누락 시 history 미생성.
 * @MX:REASON: board.updateLog=true 면 audit 의무 — 트랜잭션 외 호출 금지.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-110
 */
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { PrismaClient, DocumentUpdateLog } from '@prisma/client';
import { BoardPermissionDeniedError } from './document';

// ---------------------------------------------------------------------------
// 스키마
// ---------------------------------------------------------------------------

const RecordUpdateSchema = z.object({
  documentId: z.number().int().positive(),
  prevTitle: z.string(),
  prevContent: z.string(),
  prevExtraVars: z.unknown().nullable().default(null),
  editorId: z.number().int().positive().nullable(),
  editorIp: z.string().nullable().default(null),
});

export type RecordUpdateInput = z.input<typeof RecordUpdateSchema>;

// ---------------------------------------------------------------------------
// recordUpdate
// ---------------------------------------------------------------------------

/**
 * 수정 이전 snapshot 을 DocumentUpdateLog 에 기록한다.
 * 반드시 트랜잭션 클라이언트로 호출해야 함.
 */
export async function recordUpdate(
  input: RecordUpdateInput,
  tx: PrismaClient,
): Promise<DocumentUpdateLog> {
  const parsed = RecordUpdateSchema.parse(input);

  return tx.documentUpdateLog.create({
    data: {
      documentId: parsed.documentId,
      prevTitle: parsed.prevTitle,
      prevContent: parsed.prevContent,
      prevExtraVars: parsed.prevExtraVars !== undefined ? (parsed.prevExtraVars as Prisma.InputJsonValue) : Prisma.JsonNull,
      editorId: parsed.editorId,
      editorIp: parsed.editorIp,
    },
  });
}

// ---------------------------------------------------------------------------
// getUpdateHistory
// ---------------------------------------------------------------------------

interface Actor {
  userId: number;
  userGroupSrl: number;
  isAdmin: boolean;
}

/**
 * 문서 수정 이력을 조회한다.
 * 작성자 본인 또는 admin 만 조회 가능.
 */
export async function getUpdateHistory(
  input: { documentId: number; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<DocumentUpdateLog[]> {
  const doc = await ctx.prisma.document.findUniqueOrThrow({
    where: { id: input.documentId },
    select: { authorId: true },
  });

  // 권한 검사: 본인 또는 admin
  if (!input.actor.isAdmin && doc.authorId !== input.actor.userId) {
    throw new BoardPermissionDeniedError('update_view');
  }

  return ctx.prisma.documentUpdateLog.findMany({
    where: { documentId: input.documentId },
    orderBy: { regdate: 'desc' },
  });
}
