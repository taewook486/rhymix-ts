/**
 * routes/view-page.tsx — SPEC-CONTENT-001 View Page
 *
 * 게시판 문서 상세 보기 RSC 컴포넌트.
 * prisma 는 apps/web 레이어에서 주입됨 — 직접 import 금지.
 *
 * @MX:NOTE [AUTO]: BoardViewPage는 BoardIndexPage 와 동일한 prisma 주입 패턴을 따름.
 * @MX:SPEC: SPEC-CONTENT-001
 */
import React from 'react';
import type { PrismaClient } from '@prisma/client';
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { getDocument } from '@rhymix-ts/document';
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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * 게시판 문서 상세 보기 페이지.
 *
 * @MX:ANCHOR [AUTO]: 문서 상세 보기 — apps/web 라우터 + boardModule.routes.view 에서 호출.
 * @MX:REASON: fan_in >= 3 (apps/web/app/[mid]/[id]/page.tsx, boardModule.routes, 테스트).
 * @MX:SPEC: SPEC-CONTENT-001
 */
export async function BoardViewPage(props: BoardViewPageProps): Promise<React.ReactElement> {
  const { instance, documentId, prisma, session } = props;
  const mid = instance.mid;

  // 병렬 데이터 로드 — 문서/댓글/첨부파일
  const [doc, comments, attachments] = await Promise.all([
    getDocument(documentId, { prisma }),
    listComments({ documentId }, { prisma }),
    listAttachments({ documentId }, { prisma }),
  ]);

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

  return (
    <main className="max-w-3xl mx-auto p-4">
      {/* 문서 제목 */}
      <h1 className="text-2xl font-bold mb-2">{doc.title}</h1>

      {/* 메타 정보: 작성자, 날짜, 댓글 수 */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>{doc.nickName ?? (doc.author?.nickName ?? '익명')}</span>
        <span>{createdDateStr}</span>
        <span>댓글 {doc.commentCount}</span>
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

      {/* 댓글 섹션 — CommentList는 apps/web 레이어에서 주입됨 */}
      <div id="comments" className="mb-8">
        <h2 className="text-lg font-semibold mb-4">댓글 {comments.length}개</h2>
        {/* CommentList injected by apps/web */}
      </div>

      {/* 액션 바 */}
      <div className="flex items-center gap-4">
        <a href={`/${mid}`} className="text-sm text-blue-600 hover:underline">
          글 목록
        </a>
        {canEdit && (
          <a
            href={`/${mid}/write?id=${documentId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            수정
          </a>
        )}
      </div>
    </main>
  );
}
