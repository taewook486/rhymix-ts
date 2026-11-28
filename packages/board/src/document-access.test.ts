import { describe, expect, it } from 'vitest';
import { resolveDocumentAccess, resolveViewerGroup } from './document-access';

const board = { id: 5, permissions: {} as Record<string, number[]> };
const doc = { boardId: 5, status: 'PUBLIC', authorId: 1, deletedAt: null as Date | null };
const member = (id: number, groups?: Array<{ id?: number }>) => ({ user: { id, isAdmin: false, groups } });
const admin = { user: { id: 9, isAdmin: true } };

describe('resolveDocumentAccess — 글 보기 화면과 첨부 다운로드의 단일 규칙', () => {
  it('공개 글은 비회원도 ok', () => {
    expect(resolveDocumentAccess({ doc, board, session: null })).toBe('ok');
  });

  it('삭제된 글은 not_found', () => {
    expect(resolveDocumentAccess({ doc: { ...doc, deletedAt: new Date() }, board, session: admin })).toBe('not_found');
  });

  it('게시판이 없거나 글의 게시판이 아니면 not_found', () => {
    expect(resolveDocumentAccess({ doc, board: null, session: null })).toBe('not_found');
    expect(resolveDocumentAccess({ doc: { ...doc, boardId: 6 }, board, session: null })).toBe('not_found');
  });

  it('expectedBoardId 가 다르면 not_found', () => {
    expect(resolveDocumentAccess({ doc, board, session: null, expectedBoardId: 7 })).toBe('not_found');
    expect(resolveDocumentAccess({ doc, board, session: null, expectedBoardId: 5 })).toBe('ok');
  });

  it('TEMP 글은 작성자·관리자만, 나머지는 not_found', () => {
    const temp = { ...doc, status: 'TEMP' };
    expect(resolveDocumentAccess({ doc: temp, board, session: null })).toBe('not_found');
    expect(resolveDocumentAccess({ doc: temp, board, session: member(2) })).toBe('not_found');
    expect(resolveDocumentAccess({ doc: temp, board, session: member(1) })).toBe('ok');
    expect(resolveDocumentAccess({ doc: temp, board, session: admin })).toBe('ok');
  });

  it('view 권한이 없으면 view_denied (TEMP 검사 뒤, SECRET 검사 앞)', () => {
    const restricted = { id: 5, permissions: { view: [3] } };
    expect(resolveDocumentAccess({ doc, board: restricted, session: null })).toBe('view_denied');
    expect(resolveDocumentAccess({ doc, board: restricted, session: member(2, [{ id: 2 }]) })).toBe('view_denied');
    expect(resolveDocumentAccess({ doc, board: restricted, session: member(2, [{ id: 3 }]) })).toBe('ok');
    // TEMP 이면 권한 검사 이전에 not_found
    expect(resolveDocumentAccess({ doc: { ...doc, status: 'TEMP' }, board: restricted, session: member(2) })).toBe('not_found');
  });

  it('SECRET 글은 작성자·관리자 외에는 secret_denied', () => {
    const secret = { ...doc, status: 'SECRET' };
    expect(resolveDocumentAccess({ doc: secret, board, session: null })).toBe('secret_denied');
    expect(resolveDocumentAccess({ doc: secret, board, session: member(2) })).toBe('secret_denied');
    expect(resolveDocumentAccess({ doc: secret, board, session: member(1) })).toBe('ok');
    expect(resolveDocumentAccess({ doc: secret, board, session: admin })).toBe('ok');
  });

  it('관리자는 view 권한과 무관하게 통과', () => {
    expect(resolveDocumentAccess({ doc, board: { id: 5, permissions: { view: [] } }, session: admin })).toBe('ok');
  });
});

describe('resolveViewerGroup', () => {
  it('비회원 0, 회원은 첫 그룹, 그룹이 없으면 1', () => {
    expect(resolveViewerGroup(null)).toBe(0);
    expect(resolveViewerGroup(member(2, [{ id: 4 }, { id: 5 }]))).toBe(4);
    expect(resolveViewerGroup(member(2))).toBe(1);
    expect(resolveViewerGroup(member(2, [{}]))).toBe(1);
  });
});
