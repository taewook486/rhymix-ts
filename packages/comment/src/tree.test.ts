/**
 * packages/comment/src/tree.test.ts — SPEC-COMMENT-001 Slice B (T-004)
 *
 * Comment tree functions — buildCommentTree / getCommentDepth.
 *
 * Tree 구성, depth 계산, orphan handling 검증.
 */
import { describe, it, expect } from 'vitest';
import type { Comment } from '@prisma/client';
import { buildCommentTree, getCommentDepth } from './tree';

// ---------------------------------------------------------------------------
// buildCommentTree
// ---------------------------------------------------------------------------

describe('buildCommentTree', () => {
  it('빈 배열은 빈 트리를 반환한다', () => {
    const result = buildCommentTree([]);
    expect(result).toEqual([]);
  });

  it('단일 루트 댓글은 children=[] 를 갖는다', () => {
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: null, content: 'root', status: 1 } as Comment,
    ];

    const result = buildCommentTree(comments);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].children).toEqual([]);
    expect(result[0].depth).toBe(0);
  });

  it('parentId로 자식이 올바르게 중첩된다', () => {
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: null, content: 'root', status: 1 } as Comment,
      { id: 2, documentId: 10, parentId: 1, content: 'child', status: 1 } as Comment,
    ];

    const result = buildCommentTree(comments);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe(2);
    expect(result[0].children[0].depth).toBe(1);
  });

  it('2단계 중첩 트리가 정확히 구성된다', () => {
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: null, content: 'root', status: 1 } as Comment,
      { id: 2, documentId: 10, parentId: 1, content: 'child1', status: 1 } as Comment,
      { id: 3, documentId: 10, parentId: 1, content: 'child2', status: 1 } as Comment,
      { id: 4, documentId: 10, parentId: 2, content: 'grandchild', status: 1 } as Comment,
    ];

    const result = buildCommentTree(comments);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].children).toHaveLength(2);

    const child1 = result[0].children[0];
    const child2 = result[0].children[1];

    expect(child1.id).toBe(2);
    expect(child1.depth).toBe(1);
    expect(child1.children).toHaveLength(1);
    expect(child1.children[0].id).toBe(4);
    expect(child1.children[0].depth).toBe(2);

    expect(child2.id).toBe(3);
    expect(child2.depth).toBe(1);
    expect(child2.children).toEqual([]);
  });

  it('parentId가 없는 댓글은 루트로 취급된다', () => {
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: null, content: 'root1', status: 1 } as Comment,
      { id: 2, documentId: 10, parentId: null, content: 'root2', status: 1 } as Comment,
      { id: 3, documentId: 10, parentId: 1, content: 'child', status: 1 } as Comment,
    ];

    const result = buildCommentTree(comments);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe(3);
  });

  it('orphan (존재하지 않는 parentId)는 __orphan: true 마커와 함께 루트로 표현된다', () => {
    const comments: Comment[] = [
      { id: 1, documentId: 10, parentId: 999, content: 'orphan', status: 1 } as Comment,
    ];

    const result = buildCommentTree(comments);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].__orphan).toBe(true);
    expect(result[0].depth).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getCommentDepth
// ---------------------------------------------------------------------------

describe('getCommentDepth', () => {
  const comments: Comment[] = [
    { id: 1, documentId: 10, parentId: null, content: 'root', status: 1 } as Comment,
    { id: 2, documentId: 10, parentId: 1, content: 'child1', status: 1 } as Comment,
    { id: 3, documentId: 10, parentId: 2, content: 'grandchild1', status: 1 } as Comment,
    { id: 4, documentId: 10, parentId: 3, content: 'greatgrandchild1', status: 1 } as Comment,
    { id: 5, documentId: 10, parentId: 4, content: 'greatgreatgrandchild1', status: 1 } as Comment,
    { id: 6, documentId: 10, parentId: 5, content: 'depth5', status: 1 } as Comment,
  ];

  it('루트 댓글의 depth는 0이다', () => {
    const depth = getCommentDepth(1, comments);
    expect(depth).toBe(0);
  });

  it('1단계 자식의 depth는 1이다', () => {
    const depth = getCommentDepth(2, comments);
    expect(depth).toBe(1);
  });

  it('2단계 자손의 depth는 2이다', () => {
    const depth = getCommentDepth(3, comments);
    expect(depth).toBe(2);
  });

  it('5단계 중첩의 depth는 5이다', () => {
    const depth = getCommentDepth(6, comments);
    expect(depth).toBe(5);
  });

  it('orphan (존재하지 않는 parentId)는 depth 0을 반환한다', () => {
    const orphanComment: Comment[] = [
      { id: 999, documentId: 10, parentId: 1000, content: 'orphan', status: 1 } as Comment,
    ];
    const depth = getCommentDepth(999, orphanComment);
    expect(depth).toBe(0);
  });
});
