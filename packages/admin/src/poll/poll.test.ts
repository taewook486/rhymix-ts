/**
 * poll domain tests — TDD RED phase.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-083~086
 */
import { describe, it, expect } from 'vitest';
import {
  calculatePollResults,
  derivePollStatus,
  checkDuplicateVote,
  type PollOptionInput,
  type PollVoteInput,
} from './poll';

describe('poll domain', () => {
  describe('derivePollStatus', () => {
    it('should return "draft" when startAt is in the future', () => {
      const now = new Date('2026-06-20T00:00:00Z');
      const status = derivePollStatus(
        { startAt: new Date('2026-06-25T00:00:00Z'), endAt: new Date('2026-06-30T00:00:00Z') },
        now,
      );
      expect(status).toBe('draft');
    });

    it('should return "open" when now is within [startAt, endAt]', () => {
      const now = new Date('2026-06-20T00:00:00Z');
      const status = derivePollStatus(
        { startAt: new Date('2026-06-15T00:00:00Z'), endAt: new Date('2026-06-25T00:00:00Z') },
        now,
      );
      expect(status).toBe('open');
    });

    it('should return "closed" when now is after endAt', () => {
      const now = new Date('2026-06-20T00:00:00Z');
      const status = derivePollStatus(
        { startAt: new Date('2026-06-01T00:00:00Z'), endAt: new Date('2026-06-10T00:00:00Z') },
        now,
      );
      expect(status).toBe('closed');
    });

    it('should treat boundary timestamps as open (inclusive)', () => {
      const now = new Date('2026-06-20T00:00:00Z');
      expect(
        derivePollStatus({ startAt: now, endAt: new Date('2026-06-25T00:00:00Z') }, now),
      ).toBe('open');
      expect(
        derivePollStatus({ startAt: new Date('2026-06-01T00:00:00Z'), endAt: now }, now),
      ).toBe('open');
    });
  });

  describe('calculatePollResults', () => {
    const options: PollOptionInput[] = [
      { id: 1, label: '옵션 A' },
      { id: 2, label: '옵션 B' },
      { id: 3, label: '옵션 C' },
    ];

    it('should compute vote counts and percentages per option', () => {
      const votes: PollVoteInput[] = [
        { pollOptionId: 1 },
        { pollOptionId: 1 },
        { pollOptionId: 2 },
        { pollOptionId: 1 },
      ];

      const results = calculatePollResults(options, votes);

      expect(results.totalVotes).toBe(4);
      const a = results.options.find((o) => o.id === 1);
      const b = results.options.find((o) => o.id === 2);
      const c = results.options.find((o) => o.id === 3);

      expect(a?.voteCount).toBe(3);
      expect(a?.percentage).toBeCloseTo(75, 5);
      expect(b?.voteCount).toBe(1);
      expect(b?.percentage).toBeCloseTo(25, 5);
      expect(c?.voteCount).toBe(0);
      expect(c?.percentage).toBe(0);
    });

    it('should return 0 percentages for all options when there are no votes', () => {
      const results = calculatePollResults(options, []);
      expect(results.totalVotes).toBe(0);
      for (const option of results.options) {
        expect(option.voteCount).toBe(0);
        expect(option.percentage).toBe(0);
      }
    });

    it('should preserve option order as given (sortOrder responsibility of caller)', () => {
      const results = calculatePollResults(options, []);
      expect(results.options.map((o) => o.id)).toEqual([1, 2, 3]);
    });
  });

  describe('checkDuplicateVote', () => {
    it('should detect duplicate vote by member when policy is by-member', async () => {
      const findExisting = async () => ({ id: 99 }); // 기존 투표 존재
      const result = await checkDuplicateVote(
        { policy: 'by-member', memberId: 1, voterIp: '1.2.3.4' },
        { findExistingVote: findExisting },
      );
      expect(result.isDuplicate).toBe(true);
    });

    it('should allow vote by member when no prior vote exists', async () => {
      const findExisting = async () => null;
      const result = await checkDuplicateVote(
        { policy: 'by-member', memberId: 1, voterIp: '1.2.3.4' },
        { findExistingVote: findExisting },
      );
      expect(result.isDuplicate).toBe(false);
    });

    it('should detect duplicate vote by IP when policy is by-ip', async () => {
      const findExisting = async () => ({ id: 99 });
      const result = await checkDuplicateVote(
        { policy: 'by-ip', memberId: null, voterIp: '1.2.3.4' },
        { findExistingVote: findExisting },
      );
      expect(result.isDuplicate).toBe(true);
    });

    it('should allow guest vote when policy is by-member and memberId is null (guest)', async () => {
      // by-member 정책은 memberId 기준으로만 중복을 판단하므로 비회원(memberId=null)은
      // DB 유니크 제약(다중 NULL 허용)과 동일하게 차단하지 않는다.
      const findExisting = async () => {
        throw new Error('should not be called for guest under by-member policy');
      };
      const result = await checkDuplicateVote(
        { policy: 'by-member', memberId: null, voterIp: '1.2.3.4' },
        { findExistingVote: findExisting },
      );
      expect(result.isDuplicate).toBe(false);
    });
  });
});
