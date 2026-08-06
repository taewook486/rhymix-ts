/**
 * packages/board/src/characterization.test.ts — SPEC-BOARD-CRUD-001 Slice A
 *
 * board 패키지 public API 스냅샷 characterization 테스트.
 *
 * comment.ts 삭제 전/후 모두 통과해야 한다 (PRESERVE phase).
 * 삭제 대상인 board-owned comment 구현이 @rhymix-ts/comment / @rhymix-ts/document
 * re-export shim 으로 동등하게 노출되는지 검증한다.
 *
 * @MX:NOTE [AUTO]: board public API 의 하위 호환 계약을 고정하는 characterization 테스트.
 */
import { describe, it, expect } from 'vitest';

import * as board from '@rhymix-ts/board';

describe('board public API characterization', () => {
  // @rhymix-ts/comment re-export (SPEC-COMMENT-001) 로 노출되는 댓글 함수
  it('comment 함수가 @rhymix-ts/comment re-export 로 노출된다', () => {
    expect(typeof board.createComment).toBe('function');
    expect(typeof board.deleteComment).toBe('function');
    // voteUp/voteDown 이 아니라 voteComment 가 실제 export 이름이다.
    expect(typeof board.voteComment).toBe('function');
  });

  // @rhymix-ts/document re-export 로 노출되는 문서 함수
  it('document 함수가 @rhymix-ts/document re-export 로 노출된다', () => {
    expect(typeof board.createDocument).toBe('function');
    expect(typeof board.deleteDocument).toBe('function');
  });

  // board 모듈 정의 자체가 그대로 노출된다.
  it('boardModule 정의가 노출된다', () => {
    expect(board.boardModule).toBeDefined();
    expect(board.boardModule.code).toBe('board');
  });
});
