/**
 * /search page — SPEC-SEARCH-001 통합 검색 결과 페이지
 *
 * Server Component for displaying search results grouped by board.
 */
import type { Metadata } from 'next';
import type React from 'react';
import { createCallerFactory } from '@/server/api/trpc';
import { contentSearchRouter } from '@/server/api/routers/content/search';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { InMemoryStorage } from '@rhymix-ts/file';
import { NoopScanner } from '@rhymix-ts/file';
import Link from 'next/link';
import type { Context } from '@/server/api/context';

interface SearchPageProps {
  /** Next 15 부터 searchParams 는 Promise 다 — 반드시 await 해서 읽는다. */
  searchParams: Promise<{
    q?: string;
    mid?: string;
    field?: 'title' | 'content' | 'author';
    sort?: 'relevance' | 'latest';
    page?: string;
  }>;
}

/**
 * SPEC-SEO-001 REQ-SEO-001: 검색 결과 title="'{검색어}' 검색 결과 | {사이트명}"
 * (title.template이 layout.tsx에서 "%s | Rhymix-TS"를 자동으로 붙인다)
 */
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q = '' } = await searchParams;
  if (!q) {
    return {};
  }
  return {
    title: `'${q}' 검색 결과`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '', mid, field, sort = 'relevance', page = '1' } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  // 검색어가 없으면 라우터를 부르지 않는다. integrated 의 입력 스키마가
  // q.min(1) 이라 빈 문자열은 ZodError → 500 이 된다.
  if (q.trim().length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">검색</h1>
        <p className="mt-4 text-gray-600">검색어를 입력하세요.</p>
      </div>
    );
  }

  const session = await auth();

  const createCaller = createCallerFactory(contentSearchRouter);
  const caller = createCaller({
    session,
    prisma,
    storage: new InMemoryStorage(),
    scanner: new NoopScanner(),
    uploadTokenSecret: process.env.UPLOAD_TOKEN_SECRET ?? 'dev-secret',
  } as Context);

  const result = await caller.integrated({
    q,
    mid,
    field,
    sort,
    page: pageNum,
  });

  // Group results by board
  const groupedResults = result.results.reduce(
    (acc, item) => {
      if (!acc[item.boardId]) {
        acc[item.boardId] = {
          boardName: item.boardName,
          boardMid: item.boardMid,
          items: [],
        };
      }
      acc[item.boardId]!.items.push(item);
      return acc;
    },
    {} as Record<number, { boardName: string; boardMid: string; items: typeof result.results }>,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">검색 결과</h1>
        {q && (
          <p className="mt-2 text-gray-600">
            검색어: <span className="font-semibold">{q}</span>
            {result.totalCount > 0 && (
              <span className="ml-2">
                (총 {result.totalCount}건)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Empty State */}
      {result.results.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p className="text-lg">검색 결과가 없습니다</p>
        </div>
      )}

      {/* Results Grouped by Board */}
      {Object.entries(groupedResults).map(([boardId, group]) => (
        <div key={boardId} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold">{group.boardName}</h2>
            <Link
              href={`/search?q=${encodeURIComponent(q)}&mid=${group.boardMid}`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              (이 게시판에서만 검색)
            </Link>
          </div>
          <div className="space-y-4">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="rounded border bg-white p-4 shadow-sm"
              >
                <Link
                  href={`/${group.boardMid}/${item.id}`}
                  className="block"
                >
                  <h3 className="mb-2 text-lg font-medium text-blue-600 hover:text-blue-700">
                    {highlightTerm(item.title, q)}
                  </h3>
                  <p className="mb-2 line-clamp-2 text-gray-600">
                    {highlightTerm(item.content, q)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{item.nickName}</span>
                    <span>·</span>
                    <time>{new Date(item.regdate).toLocaleDateString('ko-KR')}</time>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Link
                key={pageNum}
                href={`/search?q=${encodeURIComponent(q)}&mid=${mid || ''}&field=${field || ''}&sort=${sort}&page=${pageNum}`}
                className={`rounded px-3 py-2 ${
                  pageNum === result.page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {pageNum}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 하이라이팅 유틸 — 검색어에 해당하는 구간만 <mark> 로 감싼 React 노드를 만든다.
 *
 * 예전에는 '<mark>...</mark>' 문자열을 반환했는데, React 가 이스케이프하므로
 * 화면에는 태그가 그대로 보인다. dangerouslySetInnerHTML 로 되돌리는 대신
 * 노드를 만들어 주입 위험 없이 강조한다.
 */
function highlightTerm(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 캡처 그룹이 하나뿐이라 split 결과의 홀수 인덱스가 곧 일치 구간이다.
  // (전역 정규식의 test() 는 lastIndex 상태를 갖고 있어 여기서 쓰면 안 된다.)
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}
