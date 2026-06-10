/**
 * search.ts — SPEC-CONTENT-001 Slice C (T-002)
 *
 * Document 검색 도메인 함수.
 * - searchDocuments: FTS + categoryId + tags + dateRange + countRange + sort + cursor
 * - searchTags: GIN index 기반 prefix 자동완성
 *
 * REQ-CONTENT-050, REQ-CONTENT-060~064.
 *
 * @MX:NOTE [AUTO]: searchDocuments 는 Postgres FTS + COUNT(*) OVER() 단일 쿼리.
 *                 50K 이하 게시판 권장. 500K+ 시 Meilisearch 이주 (REQ-CONTENT-064).
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-060~064
 */
import { z } from 'zod';
import type { PrismaClient, Document } from '@prisma/client';
import { decodeCursor, encodeCursor } from './document';

// ---------------------------------------------------------------------------
// searchDocuments
// ---------------------------------------------------------------------------

const SearchDocumentsSchema = z.object({
  boardId: z.number().int().positive(),
  query: z.string().min(1).max(500).optional(),
  categoryId: z.number().int().positive().optional(),
  tags: z.array(z.string()).max(10).optional(),
  authorId: z.number().int().positive().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minVoted: z.number().int().min(0).optional(),
  minComment: z.number().int().min(0).optional(),
  sort: z.enum(['list_order', 'update_order']).default('list_order'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchDocumentsInput = z.input<typeof SearchDocumentsSchema>;

export interface SearchDocumentsResult {
  items: Document[];
  nextCursor: string | null;
  total: number;
}

/**
 * Raw 결과 행 타입 — DB 에서 반환되는 count 컬럼을 포함.
 */
interface RawDocumentRow extends Document {
  count: bigint;
}

export async function searchDocuments(
  input: SearchDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<SearchDocumentsResult> {
  const parsed = SearchDocumentsSchema.parse(input);

  // cursor 디코딩
  let cursorDecoded: { listOrder: bigint; id: number } | null = null;
  if (parsed.cursor) {
    cursorDecoded = decodeCursor(parsed.cursor);
  }

  // 동적 WHERE 조건 조각 구성 (SQL injection 방어: 숫자는 직접 삽입, 문자열은 이스케이프)
  const conditions: string[] = [
    `"board_id" = ${parsed.boardId}`,
    `"deleted_at" IS NULL`,
  ];

  if (parsed.query) {
    // plainto_tsquery 로 FTS 검색 — 단따옴표 이스케이프
    const safeQuery = parsed.query.replace(/'/g, "''");
    conditions.push(`"search_vector" @@ plainto_tsquery('simple', '${safeQuery}')`);
  }

  if (parsed.categoryId !== undefined) {
    conditions.push(`"category_id" = ${parsed.categoryId}`);
  }

  if (parsed.tags && parsed.tags.length > 0) {
    const tagArray = parsed.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`"tags" @> ARRAY[${tagArray}]::text[]`);
  }

  if (parsed.authorId !== undefined) {
    conditions.push(`"author_id" = ${parsed.authorId}`);
  }

  if (parsed.dateFrom !== undefined) {
    conditions.push(`"regdate" >= '${parsed.dateFrom.toISOString()}'`);
  }

  if (parsed.dateTo !== undefined) {
    conditions.push(`"regdate" <= '${parsed.dateTo.toISOString()}'`);
  }

  if (parsed.minVoted !== undefined) {
    conditions.push(`"voted_count" >= ${parsed.minVoted}`);
  }

  if (parsed.minComment !== undefined) {
    conditions.push(`"comment_count" >= ${parsed.minComment}`);
  }

  // cursor 조건 — (listOrder, id) 복합 커서
  const sortCol = parsed.sort === 'update_order' ? '"update_order"' : '"list_order"';
  if (cursorDecoded !== null) {
    const { listOrder, id } = cursorDecoded;
    conditions.push(
      `(${sortCol} < ${listOrder.toString()} OR (${sortCol} = ${listOrder.toString()} AND "id" < ${id}))`,
    );
  }

  const whereClause = conditions.join(' AND ');
  const sortDir = parsed.sortDir.toUpperCase();
  const orderClause = `${sortCol} ${sortDir}, "id" ${sortDir}`;
  const take = parsed.limit + 1; // 다음 페이지 존재 여부 확인용 +1

  const sql = `
    SELECT *, COUNT(*) OVER() AS count
    FROM "documents"
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ${take}
  `;

  const rows = await ctx.prisma.$queryRawUnsafe<RawDocumentRow[]>(sql);

  // total 추출
  const total = rows.length > 0 ? Number(rows[0]!.count) : 0;

  // nextCursor 판별
  const hasMore = rows.length > parsed.limit;
  const items = hasMore ? rows.slice(0, parsed.limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = encodeCursor(last.listOrder as bigint, last.id);
  }

  return { items: items as Document[], nextCursor, total };
}

// ---------------------------------------------------------------------------
// searchTags — GIN index 기반 prefix 자동완성
// ---------------------------------------------------------------------------

const SearchTagsSchema = z.object({
  boardId: z.number().int().positive(),
  prefix: z.string().min(1).max(100),
});

interface TagRow {
  tag: string;
}

export async function searchTags(
  input: z.infer<typeof SearchTagsSchema>,
  ctx: { prisma: PrismaClient },
): Promise<string[]> {
  const parsed = SearchTagsSchema.parse(input);
  const likePattern = `${parsed.prefix.replace(/'/g, "''")}%`;

  const rows = await ctx.prisma.$queryRaw<TagRow[]>`
    SELECT DISTINCT unnest(tags) AS tag
    FROM documents
    WHERE board_id = ${parsed.boardId}
      AND deleted_at IS NULL
      AND unnest(tags) ILIKE ${likePattern}
    ORDER BY tag
    LIMIT 20
  `;

  return rows.map((r) => r.tag);
}
