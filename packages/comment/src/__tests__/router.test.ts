/**
 * packages/comment/src/__tests__/router.test.ts — SPEC-COMMENT-001 Slice B (T-004)
 *
 * Comment tRPC router — procedure validation.
 *
 * Router에 list/create/delete 프로시저가 존재하고 올바른 input 스키마를 갖는지 검증.
 */
import { describe, it, expect, vi } from 'vitest';
import { commentRouter } from '../router';
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Router Structure
// ---------------------------------------------------------------------------

describe('commentRouter structure', () => {
  it('list 프로시저가 존재한다', () => {
    expect(commentRouter._def.procedures).toHaveProperty('list');
    expect(commentRouter._def.procedures.list._def.type).toBe('query');
  });

  it('create 프로시저가 존재한다', () => {
    expect(commentRouter._def.procedures).toHaveProperty('create');
    expect(commentRouter._def.procedures.create._def.type).toBe('mutation');
  });

  it('delete 프로시저가 존재한다', () => {
    expect(commentRouter._def.procedures).toHaveProperty('delete');
    expect(commentRouter._def.procedures.delete._def.type).toBe('mutation');
  });

  it('vote 프로시저가 존재한다 (Slice C stub)', () => {
    expect(commentRouter._def.procedures).toHaveProperty('vote');
    expect(commentRouter._def.procedures.vote._def.type).toBe('mutation');
  });
});

// ---------------------------------------------------------------------------
// Input Schema Validation
// ---------------------------------------------------------------------------

describe('commentRouter input schemas', () => {
  it('list는 documentId를 필수로 받는다', () => {
    const schema = commentRouter._def.procedures.list._def.inputs[0];
    const result = schema.safeParse({ documentId: 10 });
    expect(result.success).toBe(true);
  });

  it('list는 documentId 없이 실패한다', () => {
    const schema = commentRouter._def.procedures.list._def.inputs[0];
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('create는 documentId, content, actor를 필수로 받는다', () => {
    const schema = commentRouter._def.procedures.create._def.inputs[0];
    const result = schema.safeParse({
      documentId: 10,
      content: 'test',
      actor: { userGroupSrl: 1, isAdmin: false },
    });
    expect(result.success).toBe(true);
  });

  it('create는 content 없이 실패한다', () => {
    const schema = commentRouter._def.procedures.create._def.inputs[0];
    const result = schema.safeParse({
      documentId: 10,
      actor: { userGroupSrl: 1, isAdmin: false },
    });
    expect(result.success).toBe(false);
  });

  it('delete는 id와 actor를 필수로 받는다', () => {
    const schema = commentRouter._def.procedures.delete._def.inputs[0];
    const result = schema.safeParse({
      id: 100,
      actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
    });
    expect(result.success).toBe(true);
  });

  it('delete는 id 없이 실패한다', () => {
    const schema = commentRouter._def.procedures.delete._def.inputs[0];
    const result = schema.safeParse({
      actor: { userId: 5, userGroupSrl: 1, isAdmin: false },
    });
    expect(result.success).toBe(false);
  });

  it('vote는 commentId, memberId, voteType을 필수로 받는다', () => {
    const schema = commentRouter._def.procedures.vote._def.inputs[0];
    const result = schema.safeParse({
      commentId: 1,
      memberId: 5,
      voteType: 1,
    });
    expect(result.success).toBe(true);
  });

  it('vote는 voteType=1 또는 -1만 허용한다', () => {
    const schema = commentRouter._def.procedures.vote._def.inputs[0];
    const valid1 = schema.safeParse({ commentId: 1, memberId: 5, voteType: 1 });
    const valid2 = schema.safeParse({ commentId: 1, memberId: 5, voteType: -1 });
    const invalid = schema.safeParse({ commentId: 1, memberId: 5, voteType: 2 });

    expect(valid1.success).toBe(true);
    expect(valid2.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
