/**
 * document-access.ts — 글(과 그 첨부)을 볼 수 있는지 판정하는 단일 규칙.
 *
 * 글 보기 화면(routes/view-page.tsx)과 첨부 다운로드 라우트
 * (apps/web/app/api/files/.../download)가 같은 함수를 쓴다. 규칙을 두 곳에
 * 복사하면 한쪽만 고쳐져 첨부가 화면보다 느슨해지는 결함이 다시 생긴다.
 *
 * 판정 순서는 화면의 기존 순서를 그대로 따른다.
 *   1. 삭제된 글                                  → not_found
 *   2. 이 화면의 게시판이 아닌 글(expectedBoardId) → not_found
 *   3. TEMP 글은 작성자·관리자만                    → not_found
 *   4. 게시판 view 권한                            → view_denied
 *   5. SECRET 글은 작성자·관리자만                  → secret_denied
 *
 * @MX:ANCHOR [AUTO]: 글 열람 규칙의 단일 관문 — view-page, 첨부 다운로드 라우트(id·by-key)가 사용.
 * @MX:REASON: fan_in >= 3. 규칙 변경은 화면과 다운로드에 동시에 반영되어야 한다.
 */
import { canPerformAction } from './permissions';

export interface DocumentAccessSession {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number }> };
}

export interface DocumentAccessDoc {
  boardId: number;
  status: string;
  authorId: number | null;
  deletedAt?: Date | null;
}

export interface DocumentAccessBoard {
  id: number;
  permissions?: Record<string, number[]> | null;
}

export type DocumentAccessResult = 'ok' | 'not_found' | 'view_denied' | 'secret_denied';

/** 게시판 권한 검사에 쓰는 그룹 번호: 비회원 0, 회원은 첫 그룹(없으면 1). tRPC buildActorWithId 와 같은 규칙. */
export function resolveViewerGroup(session: DocumentAccessSession | null): number {
  return session === null ? 0 : (session.user.groups?.[0]?.id ?? 1);
}

export function resolveDocumentAccess(input: {
  doc: DocumentAccessDoc;
  board: DocumentAccessBoard | null;
  session: DocumentAccessSession | null;
  /** 화면이 알고 있는 게시판 id. 다른 게시판의 글이면 존재하지 않는 글로 취급한다. */
  expectedBoardId?: number;
}): DocumentAccessResult {
  const { doc, board, session, expectedBoardId } = input;

  if (doc.deletedAt !== null && doc.deletedAt !== undefined) return 'not_found';
  if (!board || doc.boardId !== board.id) return 'not_found';
  if (expectedBoardId !== undefined && board.id !== expectedBoardId) return 'not_found';

  const isAuthorOrAdmin =
    session !== null && (session.user.id === doc.authorId || session.user.isAdmin);
  if (doc.status === 'TEMP' && !isAuthorOrAdmin) return 'not_found';

  const allowed = canPerformAction(
    { permissions: board.permissions },
    'view',
    { userGroupSrl: resolveViewerGroup(session), isAdmin: session?.user.isAdmin ?? false },
  );
  if (!allowed) return 'view_denied';

  if (doc.status === 'SECRET' && !isAuthorOrAdmin) return 'secret_denied';

  return 'ok';
}
