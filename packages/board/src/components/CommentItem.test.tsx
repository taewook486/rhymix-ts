/**
 * CommentItem.test.tsx — SPEC-CONTENT-001 Comment UI
 *
 * CI-1 ~ CI-6: CommentItem 렌더 검증.
 *
 * @MX:SPEC: SPEC-CONTENT-001
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);

afterEach(() => { cleanup(); });

// ---------------------------------------------------------------------------
// CI-1: 작성자 닉네임과 날짜 렌더
// ---------------------------------------------------------------------------

describe('CommentItem — CI-1: 작성자 닉과 날짜 렌더', () => {
  it('CI-1: nickName과 createdAt 렌더', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const comment = {
      id: 1,
      content: '<p>테스트 댓글</p>',
      nickName: '홍길동',
      authorId: 42,
      isSecret: false,
      createdAt: new Date('2024-03-15'),
      parentId: null,
      children: [],
    };

    render(<CommentItem comment={comment} />);

    expect(document.body.textContent).toContain('홍길동');
    expect(document.body.textContent).toContain('2024-03-15');
  });

  it('CI-1b: nickName이 null이면 "익명" 표시', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const comment = {
      id: 2,
      content: '<p>익명 댓글</p>',
      nickName: null,
      authorId: null,
      isSecret: false,
      createdAt: new Date('2024-03-15'),
      parentId: null,
    };

    render(<CommentItem comment={comment} />);

    expect(document.body.textContent).toContain('익명');
  });
});

// ---------------------------------------------------------------------------
// CI-2: 비밀 댓글 — 작성자/admin이 아닐 때 플레이스홀더
// ---------------------------------------------------------------------------

describe('CommentItem — CI-2: 비밀 댓글 플레이스홀더', () => {
  it('CI-2: isSecret=true, 비작성자/비admin → "비밀 댓글입니다." 표시', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const comment = {
      id: 3,
      content: '<p>비밀 내용</p>',
      nickName: '작성자',
      authorId: 10,
      isSecret: true,
      createdAt: new Date('2024-03-15'),
      parentId: null,
    };

    render(<CommentItem comment={comment} currentUserId={99} isAdmin={false} />);

    expect(document.body.textContent).toContain('비밀 댓글입니다.');
    expect(document.body.textContent).not.toContain('비밀 내용');
  });
});

// ---------------------------------------------------------------------------
// CI-3: 비밀 댓글 — 작성자 본인이면 실제 내용 표시
// ---------------------------------------------------------------------------

describe('CommentItem — CI-3: 비밀 댓글 작성자 본인 접근', () => {
  it('CI-3: isSecret=true, currentUserId === authorId → 실제 내용 표시', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const comment = {
      id: 4,
      content: '<p>비밀 내용 공개</p>',
      nickName: '작성자',
      authorId: 42,
      isSecret: true,
      createdAt: new Date('2024-03-15'),
      parentId: null,
    };

    render(<CommentItem comment={comment} currentUserId={42} isAdmin={false} />);

    // dangerouslySetInnerHTML 로 렌더되므로 텍스트 포함 확인
    expect(document.body.textContent).toContain('비밀 내용 공개');
    expect(document.body.textContent).not.toContain('비밀 댓글입니다.');
  });
});

// ---------------------------------------------------------------------------
// CI-4: "답글" 버튼 클릭 → onReply(comment.id) 호출
// ---------------------------------------------------------------------------

describe('CommentItem — CI-4: 답글 버튼 클릭', () => {
  it('CI-4: "답글" 버튼 클릭 시 onReply(comment.id) 호출', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const onReply = vi.fn();
    const comment = {
      id: 5,
      content: '<p>댓글 내용</p>',
      nickName: '사용자',
      authorId: 1,
      isSecret: false,
      createdAt: new Date('2024-03-15'),
      parentId: null,
    };

    render(<CommentItem comment={comment} onReply={onReply} depth={0} />);

    const replyBtn = document.querySelector('button[data-testid="reply-btn"]') ??
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('답글'));
    expect(replyBtn).toBeTruthy();
    fireEvent.click(replyBtn!);
    expect(onReply).toHaveBeenCalledWith(5);
  });
});

// ---------------------------------------------------------------------------
// CI-5: "삭제" 버튼 — 작성자 본인에게만 표시
// ---------------------------------------------------------------------------

describe('CommentItem — CI-5: 삭제 버튼 표시 조건', () => {
  it('CI-5a: currentUserId === authorId → 삭제 버튼 표시', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const onDelete = vi.fn();
    const comment = {
      id: 6,
      content: '<p>댓글</p>',
      nickName: '나',
      authorId: 7,
      isSecret: false,
      createdAt: new Date('2024-03-15'),
      parentId: null,
    };

    render(<CommentItem comment={comment} currentUserId={7} isAdmin={false} onDelete={onDelete} />);

    const deleteBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('삭제'));
    expect(deleteBtn).toBeTruthy();
  });

  it('CI-5b: currentUserId !== authorId, 비admin → 삭제 버튼 없음', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const comment = {
      id: 7,
      content: '<p>댓글</p>',
      nickName: '타인',
      authorId: 7,
      isSecret: false,
      createdAt: new Date('2024-03-15'),
      parentId: null,
    };

    render(<CommentItem comment={comment} currentUserId={99} isAdmin={false} />);

    const deleteBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('삭제'));
    expect(deleteBtn).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// CI-6: depth=3 → padding-left: 72px (3 * 24)
// ---------------------------------------------------------------------------

describe('CommentItem — CI-6: depth indent 스타일', () => {
  it('CI-6: depth=3 → padding-left 72px', async () => {
    const { CommentItem } = await import('./CommentItem.js');
    const comment = {
      id: 8,
      content: '<p>들여쓰기 댓글</p>',
      nickName: '사용자',
      authorId: 1,
      isSecret: false,
      createdAt: new Date('2024-03-15'),
      parentId: 2,
    };

    const { container } = render(<CommentItem comment={comment} depth={3} />);

    // 루트 엘리먼트의 style 확인
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    // padding-left가 depth*24px 이어야 함
    const style = root.style.paddingLeft;
    expect(style).toBe('72px');
  });
});
