/**
 * 첨부 다운로드 권한 — /api/files/[id]/download, /api/files/by-key/[key]/download 공용.
 *
 * 글 보기 화면과 같은 규칙(packages/board/src/document-access.ts)으로 판정한다.
 *  - 글에 붙은 첨부: 글 열람 규칙 (삭제·TEMP·게시판 view 권한·SECRET)
 *  - 댓글 첨부: 댓글이 속한 글의 규칙 + 삭제된 댓글 거부 + 비밀 댓글은 댓글·글 작성자·관리자만
 *  - 아직 어디에도 붙지 않은 첨부: 업로더(memberId) 또는 관리자만
 *
 * 거부 사유는 호출자에게 구분해 주지 않는다(불리언). 호출자는 모두 404 로 응답한다.
 */
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';
import {
  resolveDocumentAccess,
  type DocumentAccessBoard,
  type DocumentAccessSession,
} from '@rhymix-ts/board/document-access';

export interface AttachmentRef {
  documentId: number | null;
  commentId: number | null;
  memberId: string | null;
}

/** 현재 요청의 세션을 글 보기 화면과 같은 모양으로 만든다. 비로그인이면 null. */
export async function getAccessSession(): Promise<DocumentAccessSession | null> {
  const session = await auth();
  const u = session?.user as
    | { id?: string | number; isAdmin?: boolean; groups?: Array<{ id?: number }> }
    | null
    | undefined;
  if (u?.id == null) return null;
  const id = Number(u.id);
  if (!Number.isFinite(id)) return null;
  return { user: { id, isAdmin: !!u.isAdmin, groups: u.groups } };
}

async function canReadDocument(
  documentId: number,
  session: DocumentAccessSession | null,
): Promise<{ ok: boolean; authorId: number | null }> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false, authorId: null };
  const board = await prisma.board.findUnique({ where: { id: doc.boardId } });
  const access = resolveDocumentAccess({
    doc,
    board: board as DocumentAccessBoard | null,
    session,
  });
  return { ok: access === 'ok', authorId: doc.authorId ?? null };
}

export async function canReadAttachment(
  attachment: AttachmentRef,
  session: DocumentAccessSession | null,
): Promise<boolean> {
  if (attachment.documentId != null) {
    return (await canReadDocument(attachment.documentId, session)).ok;
  }

  if (attachment.commentId != null) {
    const comment = await prisma.comment.findUnique({ where: { id: attachment.commentId } });
    if (!comment || (comment.deletedAt !== null && comment.deletedAt !== undefined)) return false;
    const doc = await canReadDocument(comment.documentId, session);
    if (!doc.ok) return false;
    if (comment.isSecret) {
      if (session === null) return false;
      const uid = session.user.id;
      return session.user.isAdmin || uid === comment.authorId || uid === doc.authorId;
    }
    return true;
  }

  // 아직 글·댓글에 붙지 않은 첨부 (업로드 직후, 저장 전)
  if (session === null) return false;
  return session.user.isAdmin || attachment.memberId === String(session.user.id);
}
