/**
 * poll.test.ts — SPEC-POLL-001 Poll domain functions tests
 *
 * TDD approach: Write failing tests first, then implement.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  castVote,
  getUserPollVote,
  getPollResults,
  canUserVote,
  PollNotFoundError,
  PollAlreadyVotedError,
  PollClosedError,
  PollNotStartedError,
  type CastVoteInput,
  type GetUserPollVoteInput,
  type GetPollResultsInput,
  type CanUserVoteInput,
} from './poll';
import type { PrismaClient } from '@rhymix-ts/db';

// Mock Prisma Client
const mockPrisma = {
  poll: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  pollVote: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
  },
  pollOption: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

describe('Poll Domain Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // castVote tests
  // ---------------------------------------------------------------------------

  describe('castVote', () => {
    it('should throw PollNotFoundError when poll does not exist', async () => {
      (mockPrisma.poll.findUnique as any).mockResolvedValue(null);

      const input: CastVoteInput = {
        pollId: 999,
        pollOptionIds: [1],
        memberId: 1,
        voterIp: null,
      };

      await expect(castVote(input, { prisma: mockPrisma })).rejects.toThrow(
        PollNotFoundError,
      );
    });

    it('should throw PollClosedError when poll is closed', async () => {
      const closedPoll = {
        id: 1,
        endAt: new Date('2020-01-01'),
        startAt: new Date('2019-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(closedPoll);

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1],
        memberId: 1,
        voterIp: null,
      };

      await expect(castVote(input, { prisma: mockPrisma })).rejects.toThrow(
        PollClosedError,
      );
    });

    it('should throw PollNotStartedError when poll has not started', async () => {
      const futurePoll = {
        id: 1,
        endAt: new Date('2030-01-01'),
        startAt: new Date('2029-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(futurePoll);

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1],
        memberId: 1,
        voterIp: null,
      };

      await expect(castVote(input, { prisma: mockPrisma })).rejects.toThrow(
        PollNotStartedError,
      );
    });

    it('should throw error when guest tries to vote without permission', async () => {
      const activePoll = {
        id: 1,
        endAt: new Date('2030-01-01'),
        startAt: new Date('2020-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1],
        memberId: null,
        voterIp: '127.0.0.1',
      };

      await expect(castVote(input, { prisma: mockPrisma })).rejects.toThrow(
        '비회원은 투표할 수 없습니다',
      );
    });

    it('should throw error when single-choice poll receives multiple options', async () => {
      const activePoll = {
        id: 1,
        endAt: new Date('2030-01-01'),
        startAt: new Date('2020-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1, 2],
        memberId: 1,
        voterIp: null,
      };

      await expect(castVote(input, { prisma: mockPrisma })).rejects.toThrow(
        '단일 선택 설문입니다',
      );
    });

    it('should throw PollAlreadyVotedError when user has already voted', async () => {
      const activePoll = {
        id: 1,
        endAt: new Date('2030-01-01'),
        startAt: new Date('2020-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue({ id: 1 });

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1],
        memberId: 1,
        voterIp: null,
      };

      await expect(castVote(input, { prisma: mockPrisma })).rejects.toThrow(
        PollAlreadyVotedError,
      );
    });

    it('should successfully cast a single vote', async () => {
      const activePoll = {
        id: 1,
        endAt: new Date('2030-01-01'),
        startAt: new Date('2020-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: false,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue(null);

      const mockTx = {
        pollVote: {
          createMany: vi.fn(),
          count: vi.fn().mockResolvedValue(1),
        },
        pollOption: {
          update: vi.fn(),
        },
      };

      (mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1],
        memberId: 1,
        voterIp: null,
      };

      const result = await castVote(input, { prisma: mockPrisma });

      expect(result.success).toBe(true);
      expect(result.voteCount).toBe(1);
      expect(mockTx.pollVote.createMany).toHaveBeenCalled();
    });

    it('should successfully cast multiple votes for multi-choice poll', async () => {
      const activePoll = {
        id: 1,
        endAt: new Date('2030-01-01'),
        startAt: new Date('2020-01-01'),
        allowGuestVote: false,
        allowMultipleChoice: true,
        options: [],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue(null);

      const mockTx = {
        pollVote: {
          createMany: vi.fn(),
          count: vi.fn().mockResolvedValue(2),
        },
        pollOption: {
          update: vi.fn(),
        },
      };

      (mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const input: CastVoteInput = {
        pollId: 1,
        pollOptionIds: [1, 2],
        memberId: 1,
        voterIp: null,
      };

      const result = await castVote(input, { prisma: mockPrisma });

      expect(result.success).toBe(true);
      expect(result.voteCount).toBe(2);
      expect(mockTx.pollVote.createMany).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPollVote tests
  // ---------------------------------------------------------------------------

  describe('getUserPollVote', () => {
    it('should return existing vote for member', async () => {
      const existingVote = { id: 1, pollId: 1, memberId: 1 };
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue(existingVote);

      const input: GetUserPollVoteInput = {
        pollId: 1,
        memberId: 1,
        voterIp: null,
      };

      const result = await getUserPollVote(input, { prisma: mockPrisma });

      expect(result).toEqual(existingVote);
    });

    it('should return existing vote for guest by IP', async () => {
      const existingVote = { id: 1, pollId: 1, voterIp: '127.0.0.1' };
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue(existingVote);

      const input: GetUserPollVoteInput = {
        pollId: 1,
        memberId: null,
        voterIp: '127.0.0.1',
      };

      const result = await getUserPollVote(input, { prisma: mockPrisma });

      expect(result).toEqual(existingVote);
    });

    it('should return null when no vote exists', async () => {
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue(null);

      const input: GetUserPollVoteInput = {
        pollId: 1,
        memberId: 1,
        voterIp: null,
      };

      const result = await getUserPollVote(input, { prisma: mockPrisma });

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getPollResults tests
  // ---------------------------------------------------------------------------

  describe('getPollResults', () => {
    it('should throw PollNotFoundError when poll does not exist', async () => {
      (mockPrisma.poll.findUnique as any).mockResolvedValue(null);

      const input: GetPollResultsInput = { pollId: 999 };

      await expect(getPollResults(input, { prisma: mockPrisma })).rejects.toThrow(
        PollNotFoundError,
      );
    });

    it('should return poll results with zero votes', async () => {
      const poll = {
        id: 1,
        options: [
          { id: 1, label: 'Option A', sortOrder: 0 },
          { id: 2, label: 'Option B', sortOrder: 1 },
        ],
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(poll);
      (mockPrisma.pollVote.findMany as any).mockResolvedValue([]);

      const input: GetPollResultsInput = { pollId: 1 };

      const result = await getPollResults(input, { prisma: mockPrisma });

      expect(result.pollId).toBe(1);
      expect(result.totalVotes).toBe(0);
      expect(result.options).toHaveLength(2);
      expect(result.options[0].voteCount).toBe(0);
      expect(result.options[0].percentage).toBe(0);
    });

    it('should correctly calculate vote percentages', async () => {
      const poll = {
        id: 1,
        options: [
          { id: 1, label: 'Option A', sortOrder: 0 },
          { id: 2, label: 'Option B', sortOrder: 1 },
        ],
      };

      const votes = [
        { pollOptionId: 1 },
        { pollOptionId: 1 },
        { pollOptionId: 2 },
      ];

      (mockPrisma.poll.findUnique as any).mockResolvedValue(poll);
      (mockPrisma.pollVote.findMany as any).mockResolvedValue(votes);

      const input: GetPollResultsInput = { pollId: 1 };

      const result = await getPollResults(input, { prisma: mockPrisma });

      expect(result.totalVotes).toBe(3);
      expect(result.options[0].voteCount).toBe(2);
      expect(result.options[0].percentage).toBeCloseTo(66.67, 1);
      expect(result.options[1].voteCount).toBe(1);
      expect(result.options[1].percentage).toBeCloseTo(33.33, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // canUserVote tests
  // ---------------------------------------------------------------------------

  describe('canUserVote', () => {
    it('should throw PollNotFoundError when poll does not exist', async () => {
      (mockPrisma.poll.findUnique as any).mockResolvedValue(null);

      const input: CanUserVoteInput = {
        pollId: 999,
        memberId: 1,
        voterIp: null,
      };

      await expect(canUserVote(input, { prisma: mockPrisma })).rejects.toThrow(
        PollNotFoundError,
      );
    });

    it('should return false when poll has not started', async () => {
      const futurePoll = {
        id: 1,
        startAt: new Date('2030-01-01'),
        endAt: new Date('2031-01-01'),
        allowGuestVote: false,
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(futurePoll);

      const input: CanUserVoteInput = {
        pollId: 1,
        memberId: 1,
        voterIp: null,
      };

      const result = await canUserVote(input, { prisma: mockPrisma });

      expect(result.canVote).toBe(false);
      expect(result.reason).toBe('not_started');
    });

    it('should return false when poll is closed', async () => {
      const closedPoll = {
        id: 1,
        startAt: new Date('2019-01-01'),
        endAt: new Date('2020-01-01'),
        allowGuestVote: false,
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(closedPoll);

      const input: CanUserVoteInput = {
        pollId: 1,
        memberId: 1,
        voterIp: null,
      };

      const result = await canUserVote(input, { prisma: mockPrisma });

      expect(result.canVote).toBe(false);
      expect(result.reason).toBe('closed');
    });

    it('should return false when guest voting is not allowed', async () => {
      const activePoll = {
        id: 1,
        startAt: new Date('2020-01-01'),
        endAt: new Date('2030-01-01'),
        allowGuestVote: false,
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);

      const input: CanUserVoteInput = {
        pollId: 1,
        memberId: null,
        voterIp: '127.0.0.1',
      };

      const result = await canUserVote(input, { prisma: mockPrisma });

      expect(result.canVote).toBe(false);
      expect(result.reason).toBe('not_allowed');
    });

    it('should return false when user has already voted', async () => {
      const activePoll = {
        id: 1,
        startAt: new Date('2020-01-01'),
        endAt: new Date('2030-01-01'),
        allowGuestVote: false,
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue({ id: 1 });

      const input: CanUserVoteInput = {
        pollId: 1,
        memberId: 1,
        voterIp: null,
      };

      const result = await canUserVote(input, { prisma: mockPrisma });

      expect(result.canVote).toBe(false);
      expect(result.reason).toBe('already_voted');
    });

    it('should return true when user can vote', async () => {
      const activePoll = {
        id: 1,
        startAt: new Date('2020-01-01'),
        endAt: new Date('2030-01-01'),
        allowGuestVote: false,
      };

      (mockPrisma.poll.findUnique as any).mockResolvedValue(activePoll);
      (mockPrisma.pollVote.findFirst as any).mockResolvedValue(null);

      const input: CanUserVoteInput = {
        pollId: 1,
        memberId: 1,
        voterIp: null,
      };

      const result = await canUserVote(input, { prisma: mockPrisma });

      expect(result.canVote).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
