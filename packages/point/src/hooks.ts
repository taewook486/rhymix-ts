// SPEC-POINT-001 REQ-POINT-046: pointHooks 헬퍼 — Phase 3 direct injection 경로
// @MX:ANCHOR (fan_in: 4) — document.create, comment.create, vote.cast, signup.bonus 모두 호출

import type { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { PointService } from './service';

interface DocumentCreatedEvent {
  documentId: number;
  authorId: number;
  boardId: number;
  pointPerDocument: number;
}

interface CommentCreatedEvent {
  commentId: number;
  authorId: number;
  boardId: number;
  pointPerComment: number;
}

interface VoteCastEvent {
  targetAuthorId: number;
  voterId: number;
  boardId: number;
  isUp: boolean;
  pointPerVoteUp: number;
  pointPerVoteDown: number;
}

interface MemberSignedUpEvent {
  memberId: number;
  signupBonus: number;
}

export const pointHooks = {
  // REQ-POINT-041: 게시글 작성 포인트 지급
  async onDocumentCreated(
    prisma: PrismaClient,
    event: DocumentCreatedEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (event.pointPerDocument === 0) return;
    const svc = new PointService(prisma);
    const amount = event.pointPerDocument;
    const method = amount > 0 ? 'add' : 'subtract';
    await svc[method](
      {
        memberId: event.authorId,
        amount: Math.abs(amount),
        reason: 'document.create',
        sourceType: 'DOCUMENT',
        sourceId: event.documentId,
        boardId: event.boardId,
      },
      tx,
    );
  },

  // REQ-POINT-042: 댓글 작성 포인트 지급
  async onCommentCreated(
    prisma: PrismaClient,
    event: CommentCreatedEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (event.pointPerComment === 0) return;
    const svc = new PointService(prisma);
    const amount = event.pointPerComment;
    const method = amount > 0 ? 'add' : 'subtract';
    await svc[method](
      {
        memberId: event.authorId,
        amount: Math.abs(amount),
        reason: 'comment.create',
        sourceType: 'COMMENT',
        sourceId: event.commentId,
        boardId: event.boardId,
      },
      tx,
    );
  },

  // REQ-POINT-043: 투표 포인트 지급 (선택 사항 — Phase 3에서 선택적 구현)
  async onVoteCast(
    prisma: PrismaClient,
    event: VoteCastEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // self-vote guard: no points when voter === author
    if (event.voterId === event.targetAuthorId) return;
    const pointAmt = event.isUp ? event.pointPerVoteUp : event.pointPerVoteDown;
    if (pointAmt === 0) return;
    const svc = new PointService(prisma);
    const method = pointAmt > 0 ? 'add' : 'subtract';
    await svc[method](
      {
        memberId: event.targetAuthorId,
        amount: Math.abs(pointAmt),
        reason: event.isUp ? 'vote.up' : 'vote.down',
        sourceType: 'VOTE',
        boardId: event.boardId,
      },
      tx,
    );
  },

  // REQ-POINT-070: 회원가입 보너스 지급
  async onMemberSignedUp(
    prisma: PrismaClient,
    event: MemberSignedUpEvent,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (event.signupBonus <= 0) return;
    const svc = new PointService(prisma);
    await svc.add(
      {
        memberId: event.memberId,
        amount: event.signupBonus,
        reason: 'signup.bonus',
        sourceType: 'SIGNUP',
        sourceId: event.memberId,
      },
      tx,
    );
  },
};
