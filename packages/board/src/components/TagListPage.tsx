/**
 * TagListPage — SPEC-TAG-001 (REQ-TAG-004)
 *
 * 태그별 게시물 목록 페이지
 * /tag/[tagName] 라우트에서 해당 태그가 붙은 게시물을 최신순으로 표시
 * SPEC-BOARD-UI-001과 동일한 목록 테이블을 사용, 페이지네이션 지원
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-004
 */
import React from 'react';
import Link from 'next/link';

interface Document {
  id: number;
  title: string;
  nickName?: string | null;
  author?: { nickName?: string } | null;
  regdate?: Date;
  createdAt?: Date;
  readedCount: number;
  votedCount: number;
  commentCount: number;
  uploadedCount?: number;
  status?: string;
}

export interface TagListPageProps {
  /** 태그 이름 */
  tagName: string;
  /** 게시물 목록 */
  documents: Document[];
  /** 총 게시물 수 */
  totalCount: number;
  /** 현재 페이지 */
  currentPage: number;
  /** 총 페이지 수 */
  totalPages: number;
  /** 페이지 크기 */
  pageSize: number;
  /** 게시판 MID (게시물 링크용) */
  mid: string;
}

/**
 * REQ-TAG-004: 태그별 게시물 목록 표시
 * - /tag/[tagName] 라우트
 * - 최신순 정렬
 * - SPEC-BOARD-UI-001과 동일한 목록 테이블 사용
 * - 페이지네이션 지원
 */
export function TagListPage({
  tagName,
  documents,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  mid,
}: TagListPageProps) {
  /**
   * 날짜 포맷팅 — 오늘이면 HH:MM, 아니면 YYYY-MM-DD
   */
  function formatDate(date: Date | undefined): string {
    if (!date) return '-';

    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * URL 쿼리 파라미터 구성 헬퍼
   */
  function buildQueryString(params: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        sp.set(key, String(value));
      }
    }
    const qs = sp.toString();
    return qs ? `?${qs}` : '';
  }

  // 현재 URL base 구성 (page 유지)
  function buildUrl(params: Record<string, string | number | undefined>): string {
    const baseParams: Record<string, string | number | undefined> = {
      page: currentPage > 1 ? currentPage : undefined,
      ...params,
    };
    return `/tag/${encodeURIComponent(tagName)}${buildQueryString(baseParams)}`;
  }

  // 페이지네이션 범위 계산 (sliding window)
  const pageCount = 10; // 고정값
  const pageWindowStart = Math.max(1, currentPage - Math.floor(pageCount / 2));
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + pageCount - 1);
  const adjustedStart = Math.max(1, pageWindowEnd - pageCount + 1);

  return (
    <main className="max-w-4xl mx-auto p-4">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          태그: <span className="text-blue-600">#{tagName}</span>
        </h1>
        <p className="text-gray-600 text-sm">
          총 <strong>{totalCount}</strong>개의 게시물
        </p>
      </div>

      {/* 목록 렌더 */}
      {documents.length === 0 ? (
        <p>등록된 게시물이 없습니다.</p>
      ) : (
        <>
          <table data-testid="tag-document-table" className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">번호</th>
                <th className="px-4 py-2 text-left">제목</th>
                <th className="px-4 py-2 text-left">작성자</th>
                <th className="px-4 py-2 text-left">작성일</th>
                <th className="px-4 py-2 text-left">조회수</th>
                <th className="px-4 py-2 text-left">추천수</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => {
                const rowNumber = totalCount - ((currentPage - 1) * pageSize + index);
                return (
                  <tr key={doc.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">{rowNumber}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${mid}/${doc.id}`}
                        className="hover:underline font-medium"
                      >
                        {doc.title}
                      </Link>
                      {doc.commentCount > 0 && (
                        <span className="text-gray-500 text-sm ml-1">[{doc.commentCount}]</span>
                      )}
                      {doc.uploadedCount && doc.uploadedCount > 0 && (
                        <span className="ml-1" aria-label="첨부파일 있음">📎</span>
                      )}
                      {doc.status === 'SECRET' && (
                        <span className="ml-1" aria-label="비밀글">🔒</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.nickName ?? (doc.author?.nickName ?? '-')}
                    </td>
                    <td className="px-4 py-3">{formatDate(doc.regdate ?? doc.createdAt)}</td>
                    <td className="px-4 py-3">{doc.readedCount}</td>
                    <td className="px-4 py-3">{doc.votedCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <nav data-testid="pagination" className="mt-4 flex justify-center gap-1">
              {/* 첫 페이지 */}
              {currentPage > 1 && (
                <Link
                  href={buildUrl({ page: 1 })}
                  className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {'<<'}
                </Link>
              )}

              {/* 이전 페이지 */}
              {currentPage > 1 && (
                <Link
                  href={buildUrl({ page: currentPage - 1 })}
                  className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {'<'}
                </Link>
              )}

              {/* 페이지 번호 (sliding window) */}
              {Array.from({ length: pageWindowEnd - adjustedStart + 1 }, (_, i) => {
                const pageNum = adjustedStart + i;
                return (
                  <Link
                    key={pageNum}
                    href={buildUrl({ page: pageNum === 1 ? undefined : pageNum })}
                    className={`px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      pageNum === currentPage ? 'bg-blue-500 text-white' : ''
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}

              {/* 다음 페이지 */}
              {currentPage < totalPages && (
                <Link
                  href={buildUrl({ page: currentPage + 1 })}
                  className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {'>'}
                </Link>
              )}

              {/* 마지막 페이지 */}
              {currentPage < totalPages && (
                <Link
                  href={buildUrl({ page: totalPages })}
                  className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {'>>'}
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      {/* 태그 목록으로 돌아가기 */}
      <div className="mt-6">
        <Link href="/tags" className="text-sm text-blue-600 hover:underline">
          ← 태그 목록
        </Link>
      </div>
    </main>
  );
}
