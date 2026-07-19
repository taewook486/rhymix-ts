/**
 * routes/view-page.tsx — SPEC-CONTENT-001 View Page
 *
 * 게시판 문서 상세 보기 RSC 컴포넌트.
 * prisma 는 apps/web 레이어에서 주입됨 — 직접 import 금지.
 *
 * @MX:NOTE [AUTO]: BoardViewPage는 BoardIndexPage 와 동일한 prisma 주입 패턴을 따름.
 * @MX:SPEC: SPEC-CONTENT-001, SPEC-BOARD-UI-001 REQ-BUI-006, REQ-BUI-007
 */
import React from 'react';
import type { PrismaClient } from '@prisma/client';
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { getDocument, getAdjacentDocuments } from '@rhymix-ts/document';
import { listComments } from '@rhymix-ts/comment';
import { listAttachments } from '@rhymix-ts/file';
import { sanitize } from '../components/sanitize';

/** 바이트 크기를 사람이 읽기 쉬운 문자열로 변환 (예: 2048 → "2 KB") */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || Number.isInteger(size) ? 0 : 1)} ${units[unitIndex]}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BoardViewPageProps extends ModuleRoutePageProps {
  /** 조회할 문서 ID */
  documentId: number;
  /** apps/web 에서 주입되는 Prisma 클라이언트 */
  prisma: PrismaClient;
  /** 현재 세션 — null이면 비로그인 */
  session: { user: { id: number; isAdmin: boolean } } | null;
  /**
   * SPEC-MESSAGE-001 REQ-MSG-001: 작성자 닉네임 옆에 표시할 "쪽지 보내기" 액션.
   * apps/web 레이어에서 주입되는 render-prop — packages/board 는 실제 발송 로직을
   * 알지 못하고, 상위(apps/web)에서 렌더링을 위임받아 표시만 한다.
   */
  renderSendMessageAction?: (receiverId: number, receiverNickname: string) => React.ReactNode;
  /**
   * SPEC-POLL-001 REQ-POLL-001~003: 게시물에 연결된 설문(있을 때만)을 표시할 슬롯.
   * apps/web 레이어가 문서에 연결된 설문 존재 여부를 조회해 주입한다.
   */
  renderPoll?: () => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * 게시판 문서 상세 보기 페이지.
 *
 * @MX:ANCHOR [AUTO]: 문서 상세 보기 — apps/web 라우터 + boardModule.routes.view 에서 호출.
 * @MX:REASON: fan_in >= 3 (apps/web/app/[mid]/[id]/page.tsx, boardModule.routes, 테스트).
 * @MX:SPEC: SPEC-CONTENT-001, SPEC-BOARD-UI-001 REQ-BUI-006, REQ-BUI-007
 */
export async function BoardViewPage(props: BoardViewPageProps): Promise<React.ReactElement> {
  const { instance, documentId, prisma, session, renderSendMessageAction, renderPoll } = props;
  const mid = instance.mid;

  // 병렬 데이터 로드 — 문서/댓글/첨부파일
  const [doc, comments, attachments, adjacent] = await Promise.all([
    getDocument(documentId, { prisma }),
    listComments({ documentId }, { prisma }),
    listAttachments({ documentId }, { prisma }),
    getAdjacentDocuments(
      { documentId, boardId: instance.id, sort: 'list_order' },
      { prisma },
    ),
  ]);

  // 비밀글 접근 권한 판단 (REQ-BUI-006)
  const canViewSecret =
    doc.status !== 'SECRET' ||
    (session !== null && (session.user.id === doc.authorId || session.user.isAdmin));

  // 수정 권한 판단: 작성자 본인 또는 admin
  const canEdit =
    session !== null &&
    (session.user.id === doc.authorId || session.user.isAdmin);

  // 작성일 포맷 (한국어 기준) — Prisma 스키마 필드명은 regdate
  const regdate = (doc as unknown as { regdate?: Date; createdAt?: Date }).regdate
    ?? (doc as unknown as { createdAt?: Date }).createdAt;
  const createdDateStr = regdate instanceof Date
    ? regdate.toLocaleDateString('ko-KR')
    : String(regdate ?? '');

  // 비밀글 접근 거부 메시지 (REQ-BUI-006)
  if (!canViewSecret) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">비밀글입니다</p>
          <p className="text-yellow-600 text-sm mt-2">
            이 글은 작성자와 관리자만 볼 수 있습니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-4">
      {/* 문서 제목 */}
      <h1 className="text-2xl font-bold mb-2">{doc.title}</h1>

      {/* 메타 정보: 작성자, 날짜, 댓글 수, 조회수, 추천수 (REQ-BUI-007) */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span className="inline-flex items-center gap-2">
          {doc.nickName ?? (doc.author?.nickName ?? '익명')}
          {/* SPEC-MESSAGE-001 REQ-MSG-001: 닉네임 옆 쪽지 보내기 액션 */}
          {doc.author?.id != null &&
            renderSendMessageAction?.(doc.author.id, doc.nickName ?? doc.author.nickName ?? '익명')}
        </span>
        <span>{createdDateStr}</span>
        <span>댓글 {doc.commentCount}</span>
        <span>조회수 {doc.readedCount}</span>
        <span>추천수 {doc.votedCount}</span>
      </div>

      {/* 태그 */}
      {Array.isArray(doc.tags) && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(doc.tags as string[]).map((tag) => (
            <a
              key={tag}
              href={`/${mid}?tag=${tag}`}
              className="px-2 py-0.5 bg-gray-100 rounded text-sm hover:bg-gray-200"
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {/* 문서 본문 — 렌더 직전 DOMPurify 로 sanitize (SPEC-EDITOR-001 REQ-EDITOR-004) */}
      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="prose max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: sanitize(doc.content) }}
      />

      {/* 첨부파일 다운로드 목록 (SPEC-EDITOR-001 REQ-EDITOR-003, AC-EDITOR-006) */}
      {attachments.length > 0 && (
        <div className="attachments mb-8 border-t pt-4">
          <h2 className="text-sm font-semibold mb-2 text-gray-700">
            첨부파일 {attachments.length}개
          </h2>
          <ul className="space-y-1">
            {attachments.map((file) => (
              <li key={file.id} className="flex items-center gap-2 text-sm">
                <a
                  href={`/api/files/${file.id}/download`}
                  className="text-blue-600 hover:underline"
                >
                  {file.sourceFilename}
                </a>
                <span className="text-gray-400">
                  ({formatFileSize(Number(file.fileSize))})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SPEC-POLL-001 REQ-POLL-001~003: 게시물에 연결된 설문 (있을 때만) */}
      {renderPoll?.()}

      {/* 댓글 섹션 — CommentList는 apps/web 레이어에서 주입됨 */}
      <div id="comments" className="mb-8">
        <h2 className="text-lg font-semibold mb-4">댓글 {comments.length}개</h2>
        {/* CommentList injected by apps/web */}
      </div>

      {/* 투표 버튼 (REQ-BUI-007) — 로그인 사용자에게만 표시 */}
      {session !== null && (
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            추천
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            비추천
          </button>
        </div>
      )}

      {/* 이전글/다음글 링크 (REQ-BUI-007) */}
      <div className="flex items-center justify-between mb-4 text-sm">
        {adjacent.prev && (
          <a
            href={`/${mid}/${adjacent.prev.id}`}
            className="text-blue-600 hover:underline"
          >
            이전글: {adjacent.prev.title}
          </a>
        )}
        <span />
        {adjacent.next && (
          <a
            href={`/${mid}/${adjacent.next.id}`}
            className="text-blue-600 hover:underline"
          >
            다음글: {adjacent.next.title}
          </a>
        )}
      </div>

      {/* 액션 바 */}
      <div className="flex items-center gap-4">
        <a href={`/${mid}`} className="text-sm text-blue-600 hover:underline">
          글 목록
        </a>
        {canEdit && (
          <>
            <a
              href={`/${mid}/write?id=${documentId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              수정
            </a>
            <button
              type="button"
              className="text-sm text-red-600 hover:underline"
            >
              삭제
            </button>
          </>
        )}
      </div>
    </main>
  );
}
