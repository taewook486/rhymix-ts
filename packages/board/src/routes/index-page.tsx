/**
 * routes/index-page.tsx — SPEC-BOARD-UI-001 Slice A (목록 테이블 + 페이지네이션 + 공지 + 검색 + 정렬)
 *
 * 게시판 인덱스 페이지 — Document 목록을 렌더한다.
 * Slice A: 테이블 렌더, 공지 고정, offset pagination, 검색, 정렬, 뷰 토글, 글쓰기 버튼.
 *
 * @MX:NOTE [AUTO]: searchParams.page 가 있으면 offset 모드, 없으면 cursor 모드 (기존 호환성 유지)
 * @MX:SPEC: SPEC-BOARD-UI-001 REQ-BUI-001, REQ-BUI-002, REQ-BUI-003, REQ-BUI-004, REQ-BUI-005, REQ-BUI-008
 */
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { listDocuments } from '@rhymix-ts/document';
import { listCategoryTree } from '@rhymix-ts/document';
import type { CategoryNode } from '@rhymix-ts/document';
import { SortSelect } from '../components/SortSelect';

/**
 * 카테고리 목록을 flat하게 변환해 <select> 옵션을 생성하는 헬퍼.
 */
function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): Array<{ id: number; title: string; depth: number }> {
  const result: Array<{ id: number; title: string; depth: number }> = [];
  for (const node of nodes) {
    result.push({ id: node.id, title: node.title, depth });
    if (node.children.length > 0) {
      result.push(...flattenCategories(node.children, depth + 1));
    }
  }
  return result;
}

/**
 * 날짜 포맷팅 — 오늘이면 HH:MM, 아니면 YYYY-MM-DD
 */
function formatDate(date: Date): string {
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

export async function BoardIndexPage(props: ModuleRoutePageProps) {
  // searchParams 파싱
  const searchParams = (props.searchParams ?? {}) as Record<string, string | undefined>;
  const rawPage = searchParams['page'];
  const page = rawPage ? parseInt(rawPage, 10) : 1;
  const rawPageSize = searchParams['pageSize'];
  const pageSizeOption = rawPageSize ? parseInt(rawPageSize, 10) : undefined;

  const sort = (searchParams['sort'] === 'recommend' || searchParams['sort'] === 'views'
    ? searchParams['sort']
    : 'latest') as 'latest' | 'recommend' | 'views';

  const search = searchParams['search'] ?? undefined;
  const searchField = (searchParams['searchField'] === 'content' || searchParams['searchField'] === 'author'
    ? searchParams['searchField']
    : 'title') as 'title' | 'content' | 'author';

  const rawCategoryId = searchParams['categoryId'];
  const categoryId = rawCategoryId !== undefined ? parseInt(rawCategoryId, 10) : undefined;
  const view = (searchParams['view'] === 'card' ? 'card' : 'table') as 'table' | 'card';

  // pageSize 검증 (10, 20, 30, 50 중 하나여야 함)
  const pageSizeOptionValid = pageSizeOption !== undefined && [10, 20, 30, 50].includes(pageSizeOption)
    ? pageSizeOption
    : undefined;

  // 병렬로 Board config 로드 (listDocuments 호출 전에 필요)
  const [categoryTree, board] = await Promise.all([
    listCategoryTree(props.instance.id, { prisma: props.prisma }),
    props.prisma.board.findUnique({
      where: { moduleInstanceId: props.instance.id },
    }),
  ]);

  // Board config 기본값 결정 (searchParam 우선 > board.listCount > 20)
  const listCount = board?.listCount ?? 20;
  const pageCount = board?.pageCount ?? 10;
  const validPageSize = pageSizeOptionValid ?? listCount;

  // listDocuments 호출 (offset mode)
  const result = await listDocuments(
    {
      moduleInstanceId: props.instance.id,
      status: 'PUBLIC',
      page,
      pageSize: validPageSize,
      sort,
      search,
      searchField,
      categoryId: Number.isNaN(categoryId as number) ? undefined : categoryId,
    },
    { prisma: props.prisma },
  );

  const { notices, items, totalCount = 0, totalPages = 1, currentPage = page } = result;
  const flatCategories = flattenCategories(categoryTree);

  // 현재 URL base 구성 (sort, categoryId, pageSize, search, searchField, view 유지)
  function buildUrl(params: Record<string, string | number | undefined>): string {
    const baseParams: Record<string, string | number | undefined> = {
      sort: sort !== 'latest' ? sort : undefined,
      categoryId: rawCategoryId,
      pageSize: validPageSize !== listCount ? validPageSize : undefined,
      search,
      searchField: search,
      view: view !== 'table' ? view : undefined,
      ...params,
    };
    return `/${props.instance.mid}${buildQueryString(baseParams)}`;
  }

  // 페이지네이션 범위 계산 (sliding window)
  const pageWindowStart = Math.max(1, currentPage - Math.floor(pageCount / 2));
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + pageCount - 1);
  const adjustedStart = Math.max(1, pageWindowEnd - pageCount + 1);

  // 테이블형 뷰
  const tableView = (
    <table data-testid="board-table">
      <thead>
        <tr>
          <th>번호</th>
          <th>제목</th>
          <th>작성자</th>
          <th>작성일</th>
          <th>조회수</th>
          <th>추천수</th>
        </tr>
      </thead>
      <tbody>
        {/* 공지 목록 */}
        {notices.map((doc) => (
          <tr key={`notice-${doc.id}`} data-testid="notice-row" className="bg-gray-50 dark:bg-gray-800">
            <td>
              <span className="text-orange-600 font-semibold">공지</span>
            </td>
            <td>
              <a href={`/${props.instance.mid}/${doc.id}`} className="hover:underline">
                {doc.title}
              </a>
              {doc.commentCount > 0 && (
                <span className="text-gray-500 text-sm ml-1">[{doc.commentCount}]</span>
              )}
              {doc.uploadedCount > 0 && (
                <span className="ml-1" aria-label="첨부파일 있음">📎</span>
              )}
              {doc.status === 'SECRET' && (
                <span className="ml-1" aria-label="비밀글">🔒</span>
              )}
            </td>
            <td>{doc.nickName ?? '-'}</td>
            <td>{formatDate(new Date(doc.regdate))}</td>
            <td>{doc.readedCount}</td>
            <td>{doc.votedCount}</td>
          </tr>
        ))}

        {/* 일반 글 목록 */}
        {items.map((doc, index) => {
          const rowNumber = totalCount - ((currentPage - 1) * validPageSize + index);
          return (
            <tr key={`item-${doc.id}`} data-testid="board-row">
              <td>{rowNumber}</td>
              <td>
                <a href={`/${props.instance.mid}/${doc.id}`} className="hover:underline">
                  {doc.title}
                </a>
                {doc.commentCount > 0 && (
                  <span className="text-gray-500 text-sm ml-1">[{doc.commentCount}]</span>
                )}
                {doc.uploadedCount > 0 && (
                  <span className="ml-1" aria-label="첨부파일 있음">📎</span>
                )}
                {doc.status === 'SECRET' && (
                  <span className="ml-1" aria-label="비밀글">🔒</span>
                )}
              </td>
              <td>{doc.nickName ?? '-'}</td>
              <td>{formatDate(new Date(doc.regdate))}</td>
              <td>{doc.readedCount}</td>
              <td>{doc.votedCount}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // 카드형 뷰
  const cardView = (
    <div data-testid="board-cards">
      {/* 공지 목록 */}
      {notices.map((doc) => (
        <div key={`notice-${doc.id}`} className="bg-gray-50 dark:bg-gray-800 p-4 mb-2 rounded">
          <div className="flex items-center gap-2">
            <span className="text-orange-600 font-semibold text-sm">공지</span>
            <a href={`/${props.instance.mid}/${doc.id}`} className="hover:underline font-medium">
              {doc.title}
            </a>
            {doc.commentCount > 0 && (
              <span className="text-gray-500 text-sm">[{doc.commentCount}]</span>
            )}
            {doc.uploadedCount > 0 && (
              <span aria-label="첨부파일 있음">📎</span>
            )}
            {doc.status === 'SECRET' && (
              <span aria-label="비밀글">🔒</span>
            )}
          </div>
          <div className="text-gray-600 text-sm mt-1">
            {doc.nickName ?? '-'} | {formatDate(new Date(doc.regdate))} | 조회 {doc.readedCount} | 추천 {doc.votedCount}
          </div>
        </div>
      ))}

      {/* 일반 글 목록 */}
      {items.map((doc, index) => {
        const rowNumber = totalCount - ((currentPage - 1) * validPageSize + index);
        return (
          <div key={`item-${doc.id}`} className="border-b p-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-8">{rowNumber}</span>
              <a href={`/${props.instance.mid}/${doc.id}`} className="hover:underline font-medium">
                {doc.title}
              </a>
              {doc.commentCount > 0 && (
                <span className="text-gray-500 text-sm">[{doc.commentCount}]</span>
              )}
              {doc.uploadedCount > 0 && (
                <span aria-label="첨부파일 있음">📎</span>
              )}
              {doc.status === 'SECRET' && (
                <span aria-label="비밀글">🔒</span>
              )}
            </div>
            <div className="text-gray-600 text-sm mt-1 ml-10">
              {doc.nickName ?? '-'} | {formatDate(new Date(doc.regdate))} | 조회 {doc.readedCount} | 추천 {doc.votedCount}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <main>
      <h1>{props.instance.name}</h1>

      {/* 카테고리 필터 드롭다운 */}
      {flatCategories.length > 0 && (
        <form method="get" action={`/${props.instance.mid}`} className="mb-4">
          <select name="categoryId" defaultValue={rawCategoryId ?? ''} className="border rounded px-2 py-1">
            <option value="">전체 카테고리</option>
            {flatCategories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {'　'.repeat(cat.depth)}
                {cat.title}
              </option>
            ))}
          </select>
          {sort !== 'latest' && <input type="hidden" name="sort" value={sort} />}
          {search && <input type="hidden" name="search" value={search} />}
          {search && <input type="hidden" name="searchField" value={searchField} />}
          {validPageSize !== listCount && <input type="hidden" name="pageSize" value={String(validPageSize)} />}
          {view !== 'table' && <input type="hidden" name="view" value={view} />}
          <button type="submit" className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            필터
          </button>
        </form>
      )}

      {/* 검색 폼 + 정렬 + 뷰 토글 */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex gap-2">
          {/* 검색 폼 */}
          <form method="get" action={`/${props.instance.mid}`} data-testid="search-form" className="flex gap-2">
            <input type="hidden" name="sort" value={sort} />
            {rawCategoryId && <input type="hidden" name="categoryId" value={rawCategoryId} />}
            {validPageSize !== listCount && <input type="hidden" name="pageSize" value={String(validPageSize)} />}
            {view !== 'table' && <input type="hidden" name="view" value={view} />}

            <select name="searchField" defaultValue={searchField} className="border rounded px-2 py-1">
              <option value="title">제목</option>
              <option value="content">내용</option>
              <option value="author">작성자</option>
            </select>
            <input
              type="text"
              name="search"
              defaultValue={search ?? ''}
              placeholder="검색어 입력"
              className="border rounded px-2 py-1"
            />
            <button type="submit" className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
              검색
            </button>
          </form>
        </div>

        <div className="flex gap-2 items-center">
          {/* 정렬 선택 (드롭다운 — 클라이언트 컴포넌트로 분리, SortSelect 참고) */}
          <SortSelect
            value={sort}
            options={(
              [
                { value: 'latest', label: '최신순' },
                { value: 'recommend', label: '추천순' },
                { value: 'views', label: '조회순' },
              ] as const
            ).map((option) => ({
              value: option.value,
              label: option.label,
              href: buildUrl({ page: 1, sort: option.value === 'latest' ? undefined : option.value }),
            }))}
          />

          {/* 뷰 토글 */}
          <a
            href={buildUrl({ view: view === 'table' ? 'card' : 'table' })}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {view === 'table' ? '카드형' : '테이블형'}
          </a>
        </div>
      </div>

      {/* 검색 결과 메시지 */}
      {search && (
        <div className="mb-4 text-gray-600">
          검색 결과 <strong>{totalCount}</strong>건
        </div>
      )}

      {/* 목록 렌더 */}
      {notices.length === 0 && items.length === 0 ? (
        <p>등록된 게시글이 없습니다.</p>
      ) : (
        <>
          {view === 'table' ? tableView : cardView}
        </>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <nav data-testid="pagination" className="mt-4 flex justify-center gap-1">
          {/* 첫 페이지 */}
          {currentPage > 1 && (
            <a href={buildUrl({ page: 1 })} className="px-2 py-1 border rounded hover:bg-gray-100">
              {'<<'}
            </a>
          )}

          {/* 이전 페이지 */}
          {currentPage > 1 && (
            <a href={buildUrl({ page: currentPage - 1 })} className="px-2 py-1 border rounded hover:bg-gray-100">
              {'<'}
            </a>
          )}

          {/* 페이지 번호 (sliding window) */}
          {Array.from({ length: pageWindowEnd - adjustedStart + 1 }, (_, i) => {
            const pageNum = adjustedStart + i;
            return (
              <a
                key={pageNum}
                href={buildUrl({ page: pageNum === 1 ? undefined : pageNum })}
                className={`px-2 py-1 border rounded hover:bg-gray-100 ${
                  pageNum === currentPage ? 'bg-blue-500 text-white' : ''
                }`}
              >
                {pageNum}
              </a>
            );
          })}

          {/* 다음 페이지 */}
          {currentPage < totalPages && (
            <a href={buildUrl({ page: currentPage + 1 })} className="px-2 py-1 border rounded hover:bg-gray-100">
              {'>'}
            </a>
          )}

          {/* 마지막 페이지 */}
          {currentPage < totalPages && (
            <a href={buildUrl({ page: totalPages })} className="px-2 py-1 border rounded hover:bg-gray-100">
              {'>>'}
            </a>
          )}
        </nav>
      )}

      {/* 글쓰기 버튼 */}
      <div className="mt-4">
        <a
          href={`/${props.instance.mid}/write`}
          data-testid="write-btn"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          글쓰기
        </a>
      </div>
    </main>
  );
}
