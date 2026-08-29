/**
 * vote.ts — SPEC-CONTENT-001 Slice D
 *
 * Document 투표 도메인 함수.
 *
 * @MX:NOTE [AUTO]: UPSERT-or-DELETE 패턴 + 카운트 원자성.
 * @MX:REASON: DocumentVote unique = (documentId, voterId, voteType). 동일 type 재호출은
 *             toggle off 의미 — 비즈니스 결정 사항. 다른 voteType 으로 전환은 별도 동작.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-090
 */
import { z } from 'zod';
import type { PrismaClient, DocumentVote } from '@prisma/client';

// ---------------------------------------------------------------------------
// 스키마 / 타입
// ---------------------------------------------------------------------------

const VoteDocumentSchema = z.object({
  documentId: z.number().int().positive(),
  voterId: z.string().min(1),
  voteType: z.enum(['UP', 'DOWN', 'BLAME']),
});

export type VoteDocumentInput = z.input<typeof VoteDocumentSchema>;

export interface VoteResult {
  action: 'created' | 'removed';
  vote: DocumentVote | null;
  newCounts: { voted: number; blamed: number };
}

// ---------------------------------------------------------------------------
// voteDocument
// ---------------------------------------------------------------------------

/**
 * 문서에 투표한다. 동일 (documentId, voterId, voteType) 재호출 시 toggle off.
 *
 * 카운트 매핑:
 *   - UP   → Document.votedCount +1 / -1
 *   - DOWN → Document.votedCount -1 / +1 (point: -1)
 *   - BLAME → Document.blamedCount +1 / -1
 */
export async function voteDocument(
  input: VoteDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<VoteResult> {
  const parsed = VoteDocumentSchema.parse(input);

  return ctx.prisma.$transaction(async (tx) => {
    // 문서 존재 확인 + 현재 카운트 조회
    await (tx as unknown as PrismaClient).document.findUniqueOrThrow({
      where: { id: parsed.documentId },
      select: { id: true, votedCount: true, blamedCount: true },
    });

    // 기존 vote 조회
    const existing = await (tx as unknown as PrismaClient).documentVote.findUnique({
      where: {
        documentId_voterId_voteType: {
          documentId: parsed.documentId,
          voterId: parsed.voterId,
          voteType: parsed.voteType as never,
        },
      },
    });

    if (existing) {
      // Toggle off: row 삭제 + 카운트 감소
      await (tx as unknown as PrismaClient).documentVote.delete({
        where: { id: existing.id },
      });

      const countUpdate = buildCountUpdate(parsed.voteType, 'decrement');
      const updated = await (tx as unknown as PrismaClient).document.update({
        where: { id: parsed.documentId },
        data: countUpdate,
        select: { votedCount: true, blamedCount: true },
      });

      return {
        action: 'removed',
        vote: null,
        newCounts: { voted: updated.votedCount, blamed: updated.blamedCount },
      };
    } else {
      // 신규 row 생성 + 카운트 증가
      const point = parsed.voteType === 'DOWN' ? -1 : 1;
      const created = await (tx as unknown as PrismaClient).documentVote.create({
        data: {
          documentId: parsed.documentId,
          voterId: parsed.voterId,
          voteType: parsed.voteType as never,
          point,
        },
      });

      const countUpdate = buildCountUpdate(parsed.voteType, 'increment');
      const updated = await (tx as unknown as PrismaClient).document.update({
        where: { id: parsed.documentId },
        data: countUpdate,
        select: { votedCount: true, blamedCount: true },
      });

      return {
        action: 'created',
        vote: created as unknown as DocumentVote,
        newCounts: { voted: updated.votedCount, blamed: updated.blamedCount },
      };
    }
  });
}

/**
 * voteType 에 따라 Prisma update data 를 반환한다.
 */
function buildCountUpdate(
  voteType: string,
  direction: 'increment' | 'decrement',
): Record<string, unknown> {
  if (voteType === 'BLAME') {
    return { blamedCount: { [direction]: 1 } };
  }
  // UP: increment, DOWN: decrement 기반 (실제 point 부호는 create 시 반영됨)
  // UP toggle off (decrement): -1, UP 신규 (increment): +1
  // DOWN 신규 (increment 여지): votedCount decrement
  // DOWN toggle off (decrement 여지): votedCount increment
  if (voteType === 'DOWN') {
    // DOWN 신규 → votedCount decrement, DOWN 삭제 → votedCount increment
    return { votedCount: { [direction === 'increment' ? 'decrement' : 'increment']: 1 } };
  }
  // UP
  return { votedCount: { [direction]: 1 } };
}

// ---------------------------------------------------------------------------
// getVoteCount
// ---------------------------------------------------------------------------

/**
 * 문서의 UP / DOWN / BLAME 카운트를 반환한다.
 */
export async function getVoteCount(
  documentId: number,
  ctx: { prisma: PrismaClient },
): Promise<{ up: number; down: number; blame: number }> {
  const votes = await ctx.prisma.documentVote.findMany({
    where: { documentId },
    select: { voteType: true },
  });

  return votes.reduce(
    (acc, v) => {
      if (v.voteType === 'UP') acc.up++;
      else if (v.voteType === 'DOWN') acc.down++;
      else if (v.voteType === 'BLAME') acc.blame++;
      return acc;
    },
    { up: 0, down: 0, blame: 0 },
  );
}
