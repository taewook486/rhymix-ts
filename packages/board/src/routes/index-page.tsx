/**
 * routes/index-page.tsx — SPEC-CONTENT-001 Slice B (T-012) + Slice C
 *
 * 게시판 인덱스 페이지 — Document 목록을 렌더한다.
 * Slice C: cursor pagination, 카테고리 드롭다운, notice 고정 렌더.
 *
 * @MX:NOTE [AUTO]: searchParams.cursor 는 opaque base64 — 클라이언트 쪽 파싱 금지.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-010, REQ-CONTENT-020, REQ-CONTENT-080, REQ-CONTENT-081
 */
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';
import { listDocuments } from '../document.js';
import { listCategoryTree } from '../category.js';
import type { CategoryNode } from '../category.js';

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

export async function BoardIndexPage(props: ModuleRoutePageProps) {
  // searchParams 에서 cursor / categoryId / sort 읽기
  const searchParams = (props.searchParams ?? {}) as Record<string, string | undefined>;
  const cursor = searchParams['cursor'] ?? undefined;
  const rawCategoryId = searchParams['categoryId'];
  const categoryId = rawCategoryId !== undefined ? parseInt(rawCategoryId, 10) : undefined;
  const sort = (searchParams['sort'] === 'update_order' ? 'update_order' : 'list_order') as
    | 'list_order'
    | 'update_order';

  // 병렬로 데이터 로드
  const [result, categoryTree] = await Promise.all([
    listDocuments(
      {
        moduleInstanceId: props.instance.id,
        status: 'PUBLIC',
        cursor,
        categoryId: Number.isNaN(categoryId as number) ? undefined : categoryId,
        sort,
      },
      { prisma: props.prisma },
    ),
    listCategoryTree(props.instance.id, { prisma: props.prisma }),
  ]);

  const { notices, items, nextCursor } = result;
  const flatCategories = flattenCategories(categoryTree);

  // 현재 URL base 구성 (sort, categoryId 유지)
  function buildUrl(params: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (params['sort'] && params['sort'] !== 'list_order') sp.set('sort', params['sort']);
    if (params['categoryId']) sp.set('categoryId', params['categoryId']);
    if (params['cursor']) sp.set('cursor', params['cursor']);
    const qs = sp.toString();
    return qs ? `/${props.instance.mid}?${qs}` : `/${props.instance.mid}`;
  }

  const nextUrl = nextCursor
    ? buildUrl({ sort: sort !== 'list_order' ? sort : undefined, categoryId: rawCategoryId, cursor: nextCursor })
    : null;

  return (
    <main>
      <h1>{props.instance.name}</h1>

      {/* 카테고리 필터 드롭다운 */}
      {flatCategories.length > 0 && (
        <form method="get" action={`/${props.instance.mid}`}>
          <select name="categoryId" defaultValue={rawCategoryId ?? ''}>
            <option value="">전체 카테고리</option>
            {flatCategories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {'　'.repeat(cat.depth)}
                {cat.title}
              </option>
            ))}
          </select>
          {sort !== 'list_order' && <input type="hidden" name="sort" value={sort} />}
          <button type="submit">필터</button>
        </form>
      )}

      {/* 공지 목록 */}
      {notices.length > 0 && (
        <ul data-testid="notices">
          {notices.map((doc) => (
            <li key={doc.id}>
              <span>[공지]</span>{' '}
              <a href={`/${props.instance.mid}/${doc.id}`}>{doc.title}</a>
            </li>
          ))}
        </ul>
      )}

      {/* 일반 글 목록 */}
      {notices.length === 0 && items.length === 0 ? (
        <p>등록된 게시글이 없습니다.</p>
      ) : (
        <ul data-testid="items">
          {items.map((doc) => (
            <li key={doc.id}>
              <a href={`/${props.instance.mid}/${doc.id}`}>{doc.title}</a>
            </li>
          ))}
        </ul>
      )}

      {/* 페이지네이션 */}
      <nav data-testid="pagination">
        {nextUrl && (
          <a href={nextUrl} data-testid="next-page">
            다음 페이지
          </a>
        )}
      </nav>

      <a href={`/${props.instance.mid}/write`}>글쓰기</a>
    </main>
  );
}
