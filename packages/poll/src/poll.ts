/**
 * poll.ts — SPEC-POLL-001 Poll domain functions
 *
 * Poll 도메인 함수:
 * - castVote: 투표 제출 (REQ-POLL-002)
 * - getUserPollVote: 사용자의 기존 투표 조회 (REQ-POLL-003)
 * - getPollResults: 투표 결과 집계 (REQ-POLL-003)
 * - canUserVote: 투표 가능 여부 확인 (REQ-POLL-004)
 *
 * @MX:SPEC: SPEC-POLL-001
 */
// @MX:NOTE [AUTO]: Prisma 모델 타입은 @rhymix-ts/db 가 Prisma 네임스페이스를 재내보내므로
//                   Prisma.PollGetPayload<{}> 로 파생. poll 패키지는 @prisma/client 를
//                   직접 의존하지 않음 (SPEC-POLL-001).
// @MX:REASON: package.json 수정 금지(팀 리드 지시) — Prisma namespace 재내보내기로 타입 확보.
import type { PrismaClient, Prisma } from '@rhymix-ts/db';

/** Prisma Poll 모델 타입 */

/** Prisma PollOption 모델 타입 */

/** Prisma PollVote 모델 타입 */
type PollVote = Prisma.PollVoteGetPayload<Record<string, never>>;

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class PollNotFoundError extends Error {
  readonly code = 'POLL_NOT_FOUND';
  constructor(pollId: number) {
    super(`Poll ${pollId} not found`);
    this.name = 'PollNotFoundError';
  }
}

export class PollAlreadyVotedError extends Error {
  readonly code = 'POLL_ALREADY_VOTED';
  constructor() {
    super('이미 투표하셨습니다');
    this.name = 'PollAlreadyVotedError';
  }
}

export class PollClosedError extends Error {
  readonly code = 'POLL_CLOSED';
  constructor() {
    super('투표가 마감되었습니다');
    this.name = 'PollClosedError';
  }
}

export class PollNotStartedError extends Error {
  readonly code = 'POLL_NOT_STARTED';
  constructor() {
    super('투표가 아직 시작되지 않았습니다');
    this.name = 'PollNotStartedError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CastVoteInput {
  pollId: number;
  pollOptionIds: number[]; // 복수 선택 지원
  memberId: number | null;
  voterIp: string | null;
}

export interface CastVoteResult {
  success: true;
  voteCount: number;
}

export interface GetUserPollVoteInput {
  pollId: number;
  memberId: number | null;
  voterIp: string | null;
}

export interface GetPollResultsInput {
  pollId: number;
}

export interface PollOptionResult {
  id: number;
  label: string;
  voteCount: number;
  percentage: number;
}

export interface PollResults {
  pollId: number;
  totalVotes: number;
  options: PollOptionResult[];
}

export interface CanUserVoteInput {
  pollId: number;
  memberId: number | null;
  voterIp: string | null;
}

export interface CanUserVoteResult {
  canVote: boolean;
  reason?: 'already_voted' | 'not_started' | 'closed' | 'not_allowed';
}

// ---------------------------------------------------------------------------
// REQ-POLL-002: 투표 실행
// ---------------------------------------------------------------------------

/**
 * 투표를 제출한다.
 * 단일 선택/복수 선택 모두 지원하며, 중복 투표 방지와 마감일 확인을 수행한다.
 */
export async function castVote(
  input: CastVoteInput,
  ctx: { prisma: PrismaClient },
): Promise<CastVoteResult> {
  const { pollId, pollOptionIds, memberId, voterIp } = input;

  // Poll 존재 여부 확인
  const poll = await ctx.prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });

  if (!poll) {
    throw new PollNotFoundError(pollId);
  }

  const now = new Date();

  // 마감일 확인 (REQ-POLL-004)
  if (poll.endAt && now > poll.endAt) {
    throw new PollClosedError();
  }

  // 시작일 확인
  if (poll.startAt && now < poll.startAt) {
    throw new PollNotStartedError();
  }

  // 비회원 투표 권한 확인
  if (memberId === null && !poll.allowGuestVote) {
    throw new Error('비회원은 투표할 수 없습니다');
  }

  // 복수 선택 확인
  if (!poll.allowMultipleChoice && pollOptionIds.length > 1) {
    throw new Error('단일 선택 설문입니다');
  }

  // 중복 투표 확인 (REQ-POLL-003)
  const existingVote = await checkUserVote({ pollId, memberId, voterIp }, ctx);
  if (existingVote) {
    throw new PollAlreadyVotedError();
  }

  // 투표 기록 생성
  return ctx.prisma.$transaction(async (tx) => {
    // 투표 생성
    await tx.pollVote.createMany({
      data: pollOptionIds.map((pollOptionId) => ({
        pollId,
        pollOptionId,
        memberId,
        voterIp,
      })),
    });

    // 전체 투표수 계산
    const voteCount = await tx.pollVote.count({ where: { pollId } });

    return { success: true, voteCount };
  });
}

// ---------------------------------------------------------------------------
// Helper: 사용자 투표 확인
// ---------------------------------------------------------------------------

/**
 * 사용자가 해당 설문에 이미 투표했는지 확인한다.
 */
async function checkUserVote(
  input: GetUserPollVoteInput,
  ctx: { prisma: PrismaClient },
): Promise<PollVote | null> {
  const { pollId, memberId, voterIp } = input;

  // 회원 투표 확인
  if (memberId !== null) {
    return ctx.prisma.pollVote.findFirst({
      where: { pollId, memberId },
    });
  }

  // 비회원 투표 확인 (IP 기반)
  if (voterIp !== null) {
    return ctx.prisma.pollVote.findFirst({
      where: { pollId, voterIp },
    });
  }

  return null;
}

// ---------------------------------------------------------------------------
// REQ-POLL-003: 투표 결과 시각화
// ---------------------------------------------------------------------------

/**
 * 사용자의 기존 투표를 조회한다.
 */
export async function getUserPollVote(
  input: GetUserPollVoteInput,
  ctx: { prisma: PrismaClient },
): Promise<PollVote | null> {
  return checkUserVote(input, ctx);
}

/**
 * 설문 투표 결과를 집계한다.
 */
export async function getPollResults(
  input: GetPollResultsInput,
  ctx: { prisma: PrismaClient },
): Promise<PollResults> {
  const { pollId } = input;

  const poll = await ctx.prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!poll) {
    throw new PollNotFoundError(pollId);
  }

  const votes = await ctx.prisma.pollVote.findMany({
    where: { pollId },
  });

  const totalVotes = votes.length;

  // 옵션별 투표수 집계
  const voteCountByOption = new Map<number, number>();
  for (const vote of votes) {
    voteCountByOption.set(
      vote.pollOptionId,
      (voteCountByOption.get(vote.pollOptionId) ?? 0) + 1,
    );
  }

  const options: PollOptionResult[] = poll.options.map((option) => {
    const voteCount = voteCountByOption.get(option.id) ?? 0;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
    return {
      id: option.id,
      label: option.label,
      voteCount,
      percentage,
    };
  });

  return {
    pollId,
    totalVotes,
    options,
  };
}

// ---------------------------------------------------------------------------
// REQ-POLL-004: 투표 가능 여부 확인
// ---------------------------------------------------------------------------

/**
 * 사용자가 투표 가능한지 확인한다.
 */
export async function canUserVote(
  input: CanUserVoteInput,
  ctx: { prisma: PrismaClient },
): Promise<CanUserVoteResult> {
  const { pollId, memberId, voterIp } = input;

  const poll = await ctx.prisma.poll.findUnique({
    where: { id: pollId },
  });

  if (!poll) {
    throw new PollNotFoundError(pollId);
  }

  const now = new Date();

  // 시작일 확인
  if (poll.startAt && now < poll.startAt) {
    return { canVote: false, reason: 'not_started' };
  }

  // 마감일 확인
  if (poll.endAt && now > poll.endAt) {
    return { canVote: false, reason: 'closed' };
  }

  // 비회원 권한 확인
  if (memberId === null && !poll.allowGuestVote) {
    return { canVote: false, reason: 'not_allowed' };
  }

  // 중복 투표 확인
  const existingVote = await checkUserVote({ pollId, memberId, voterIp }, ctx);
  if (existingVote) {
    return { canVote: false, reason: 'already_voted' };
  }

  return { canVote: true };
}
