/**
 * packages/comment/src/__tests__/errors.test.ts — SPEC-COMMENT-001 Slice B/C (T-004/T-007)
 *
 * Comment error classes — validation.
 *
 * 각 에러 클래스가 올바른 메시지와 속성을 갖는지 검증.
 */
import { describe, it, expect } from 'vitest';
import {
  CommentDepthExceededError,
  CommentNotFoundError,
  CommentAlreadyVotedError,
  SelfVoteNotAllowedError,
  CommentAlreadyReportedError,
} from '../errors';

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

describe('CommentDepthExceededError', () => {
  it('에러 메시지에 parentId와 maxDepth가 포함된다', () => {
    const error = new CommentDepthExceededError(123, 5);
    expect(error.message).toContain('123');
    expect(error.message).toContain('5');
  });

  it('커스텀 에러 타입을 갖는다', () => {
    const error = new CommentDepthExceededError(123, 5);
    expect(error.name).toBe('CommentDepthExceededError');
  });
});

describe('CommentNotFoundError', () => {
  it('에러 메시지에 commentId가 포함된다', () => {
    const error = new CommentNotFoundError(456);
    expect(error.message).toContain('456');
  });

  it('커스텀 에러 타입을 갖는다', () => {
    const error = new CommentNotFoundError(456);
    expect(error.name).toBe('CommentNotFoundError');
  });
});

describe('CommentAlreadyVotedError', () => {
  it('에러 메시지에 commentId와 memberId가 포함된다', () => {
    const error = new CommentAlreadyVotedError(789, 101);
    expect(error.message).toContain('789');
    expect(error.message).toContain('101');
  });

  it('커스텀 에러 타입을 갖는다', () => {
    const error = new CommentAlreadyVotedError(789, 101);
    expect(error.name).toBe('CommentAlreadyVotedError');
  });
});

describe('SelfVoteNotAllowedError', () => {
  it('에러 메시지에 commentId가 포함된다', () => {
    const error = new SelfVoteNotAllowedError(321);
    expect(error.message).toContain('321');
  });

  it('커스텀 에러 타입을 갖는다', () => {
    const error = new SelfVoteNotAllowedError(321);
    expect(error.name).toBe('SelfVoteNotAllowedError');
  });
});

describe('CommentAlreadyReportedError', () => {
  it('에러 메시지에 commentId와 reporterId가 포함된다', () => {
    const error = new CommentAlreadyReportedError(654, 202);
    expect(error.message).toContain('654');
    expect(error.message).toContain('202');
  });

  it('커스텀 에러 타입을 갖는다', () => {
    const error = new CommentAlreadyReportedError(654, 202);
    expect(error.name).toBe('CommentAlreadyReportedError');
  });
});
