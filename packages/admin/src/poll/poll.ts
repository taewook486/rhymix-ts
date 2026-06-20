/**
 * poll domain logic — SPEC-ADMIN-002 Slice 3A.
 *
 * 설문(Poll) 도메인 함수:
 * - derivePollStatus: 시작/종료 시각으로부터 상태(draft/open/closed) 도출
 * - calculatePollResults: 옵션별 투표수/백분율 집계
 * - checkDuplicateVote: 중복 투표 방지 정책(by-member/by-ip/by-cookie) 검사
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-083~086
 */

// 설문 상태
export type PollStatus = 'draft' | 'open' | 'closed';

// 중복 투표 방지 정책
export type DuplicateVotePolicy = 'by-member' | 'by-ip' | 'by-cookie';

export type PollPeriod = {
  startAt: Date;
  endAt: Date;
};

export type PollOptionInput = {
  id: number;
  label: string;
};

export type PollVoteInput = {
  pollOptionId: number;
};

export type PollOptionResult = {
  id: number;
  label: string;
  voteCount: number;
  percentage: number;
};

export type PollResults = {
  totalVotes: number;
  options: PollOptionResult[];
};

/**
 * derivePollStatus — 시작/종료 시각으로부터 설문 상태를 도출한다.
 *
 * @param period - 설문의 시작/종료 시각
 * @param now - 기준 시각 (테스트 용이성을 위해 주입)
 * @returns 'draft' (시작 전) | 'open' (진행 중, 경계값 포함) | 'closed' (종료 후)
 */
export function derivePollStatus(period: PollPeriod, now: Date): PollStatus {
  const nowMs = now.getTime();
  if (nowMs < period.startAt.getTime()) {
    return 'draft';
  }
  if (nowMs > period.endAt.getTime()) {
    return 'closed';
  }
  return 'open';
}

/**
 * calculatePollResults — 옵션별 투표수와 전체 대비 백분율을 계산한다 (REQ-ADMIN2-085).
 *
 * @MX:ANCHOR: [AUTO] 설문 결과 화면의 집계 불변식 — 투표수/백분율 계산 단일 진입점.
 * @MX:REASON: 결과 페이지(`/admin/polls/[id]/results`)와 목록 페이지(투표수 컬럼)가
 *             동일한 집계 로직을 공유해야 한다. fan_in >= 3 예상
 *             (poll router results, poll router list aggregate, 향후 공개 설문 위젯).
 *
 * @param options - 설문 옵션 목록 (caller가 정렬 순서를 보장)
 * @param votes - 투표 기록 목록
 * @returns 전체 투표수와 옵션별 투표수/백분율
 */
export function calculatePollResults(
  options: PollOptionInput[],
  votes: PollVoteInput[],
): PollResults {
  const totalVotes = votes.length;

  const countByOption = new Map<number, number>();
  for (const vote of votes) {
    countByOption.set(vote.pollOptionId, (countByOption.get(vote.pollOptionId) ?? 0) + 1);
  }

  const optionResults: PollOptionResult[] = options.map((option) => {
    const voteCount = countByOption.get(option.id) ?? 0;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
    return {
      id: option.id,
      label: option.label,
      voteCount,
      percentage,
    };
  });

  return { totalVotes, options: optionResults };
}

export type DuplicateVoteCheckInput = {
  policy: DuplicateVotePolicy;
  memberId: number | null;
  voterIp: string | null;
};

export type DuplicateVoteCheckResult = {
  isDuplicate: boolean;
};

interface DuplicateVoteDeps {
  /**
   * 정책에 따라 이미 존재하는 투표를 조회한다. 호출자(guard/router)가
   * Prisma 쿼리를 정책별로 구성하여 주입한다 (pollId 는 호출 스코프에서 고정).
   */
  findExistingVote: () => Promise<{ id: number } | null>;
}

/**
 * checkDuplicateVote — 중복 투표 방지 정책(REQ-ADMIN2-086)에 따라 기존 투표 존재 여부를 확인한다.
 *
 * @MX:ANCHOR: [AUTO] 설문 투표 제출 경로의 보안/정합성 불변식 — 중복 투표 차단.
 * @MX:REASON: castVote 진입점에서 호출되어 정책(by-member/by-ip/by-cookie)에 따라 중복
 *             투표를 차단한다. fan_in >= 3 예상 (poll.vote mutation, 공개 투표 API,
 *             향후 by-cookie 구현 시 추가 호출 경로).
 *
 * by-member 정책에서 memberId가 null(비회원)인 경우, DB 유니크 제약(pollId, memberId)이
 * 다중 NULL을 허용하는 것과 동일하게 중복으로 판정하지 않는다 — 비회원 투표는 by-member
 * 정책 하에서 본질적으로 추적 대상이 아니다 (allowGuestVote=true 인 경우에만 도달 가능).
 *
 * @param input - 정책, memberId(nullable), voterIp(nullable)
 * @param deps - 기존 투표 조회 함수 (호출자 주입)
 * @returns 중복 여부
 */
export async function checkDuplicateVote(
  input: DuplicateVoteCheckInput,
  deps: DuplicateVoteDeps,
): Promise<DuplicateVoteCheckResult> {
  if (input.policy === 'by-member' && input.memberId === null) {
    // 비회원 투표는 by-member 정책의 추적 대상이 아니다 (DB 유니크 제약과 동일한 의미).
    return { isDuplicate: false };
  }

  const existing = await deps.findExistingVote();
  return { isDuplicate: existing !== null };
}
