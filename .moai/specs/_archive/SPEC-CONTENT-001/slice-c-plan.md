# SPEC-CONTENT-001 — Slice C 플랜

**Status**: ready
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = c1f6a2d (CONTENT-001 Slice B 완료, 588 tests)
**Scope**: Cursor pagination + Notice 고정 + Category CRUD + Tag 검색 + Enhanced Search tRPC + BoardIndexPage UI 업데이트
**Spec source**: `.moai/specs/SPEC-CONTENT-001/spec.md` REQ-CONTENT-040~064, REQ-CONTENT-080~081

---

## 1. 목표 (What & Why)

Slice B 에서 기본 CRUD tRPC + Comment + 권한 + XSS + 단순 FTS 가 완성됐다.  
Slice C 의 임무:

1. **Cursor-based pagination** (REQ-CONTENT-080/081) — `listDocuments` 에 cursor 파라미터 추가, `isNotice` 문서를 일반 목록 위에 고정, page_count 만큼 페이지 링크.
2. **Category CRUD** (REQ-CONTENT-040~042) — `packages/board/src/category.ts` 도메인 함수, admin tRPC (`admin.category.*`), public tRPC (`content.category.tree`), `documentCount` 원자성 증가.
3. **Tag 검색** (REQ-CONTENT-050/051) — `search.tags` 자동완성 tRPC, `listDocuments` 에 `tags` 필터 추가.
4. **Enhanced search** (REQ-CONTENT-060~064) — `search.documents` tRPC (FTS + categoryId + tags + dateRange + countRange + sort).
5. **BoardIndexPage UI 업데이트** — 페이지네이션 컨트롤, 카테고리 필터 드롭다운, 태그 표시.

---

## 2. Pre-Flight Findings

### Q1 — cursor 기반 페이지네이션 커서 형태

**결정**: `(listOrder DESC, id DESC)` 복합 커서. 클라이언트에는 base64 로 인코딩된 `{ listOrder: string, id: number }` JSON 을 전달.  
- `listOrder` 가 같을 때 `id` 로 tiebreaking.
- `isNotice = true` 문서는 매 페이지 별도 쿼리로 고정 (REQ-CONTENT-081).
- `exceptNotice = true` 인 게시판은 page 1에서도 공지 숨김.

**BigInt 직렬화 처리** (필수):
```ts
// runtime 타입
type DocumentCursor = { listOrder: bigint; id: number };

// wire 타입 (JSON 직렬화 가능)
type DocumentCursorWire = { listOrder: string; id: number };

export function encodeCursor(c: DocumentCursor): string {
  // bigint → string 변환 후 JSON.stringify → base64url
  const wire: DocumentCursorWire = { listOrder: c.listOrder.toString(), id: c.id };
  return Buffer.from(JSON.stringify(wire), 'utf8').toString('base64url');
}

export function decodeCursor(token: string): DocumentCursor {
  const wire: DocumentCursorWire = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  return { listOrder: BigInt(wire.listOrder), id: wire.id };
}
```
- `JSON.stringify(bigint)` 는 TypeError 발생 → 반드시 `String()` 으로 직렬화, `BigInt()` 로 역직렬화.
- 첫 페이지: cursor 없음.
- 다음 페이지: 마지막 문서의 `(listOrder, id)` 를 위 방식으로 인코딩해 nextCursor 로 반환.

### Q2 — `documentCount` 전파 방식 (REQ-CONTENT-041)

**결정**: `incrementDocumentCount(categoryId, delta, prisma)` 유틸 함수 — **PostgreSQL recursive CTE** 단일 쿼리로 처리.  

**채택 사유**: N-쿼리(깊이 5 = 5 round-trip)보다 atomic, deadlock-free, 성능 우위.

```sql
WITH RECURSIVE ancestors AS (
  SELECT id, parent_id FROM document_categories WHERE id = $1
  UNION ALL
  SELECT c.id, c.parent_id
  FROM document_categories c
  JOIN ancestors a ON a.parent_id = c.id
)
UPDATE document_categories
SET document_count = GREATEST(0, document_count + $2)
WHERE id IN (SELECT id FROM ancestors);
```

```ts
export async function incrementDocumentCount(
  categoryId: number,
  delta: 1 | -1,
  prisma: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  await prisma.$executeRaw`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM document_categories WHERE id = ${categoryId}
      UNION ALL
      SELECT c.id, c.parent_id
      FROM document_categories c
      JOIN ancestors a ON a.parent_id = c.id
    )
    UPDATE document_categories
    SET document_count = GREATEST(0, document_count + ${delta})
    WHERE id IN (SELECT id FROM ancestors);
  `;
}
```

- Prisma `$transaction` 안에서 호출.
- `createDocument` 호출 시 `categoryId` 가 있으면 +1, `deleteDocument` (soft) 시 -1.
- `GREATEST(0, ...)` 로 음수 방지.

### Q3 — `search.documents` 의 커스텀 필드 검색 (REQ-CONTENT-063)

**결정**: Slice C 에서는 `extra_vars JSONB containment` 검색 **제외** — 커스텀 필드 (DocumentExtraKey/ExtraVars) 는 Slice D 에서 구현.  
Slice C 의 `search.documents` 는: FTS + categoryId + tags + dateRange + countRange + sort.

### Q4 — Board.listCount vs query limit

**결정**: `listDocuments` 의 `take` 는 `board.listCount` (default 20). cursor 기반 응답에 `nextCursor` 포함. tRPC 레이어에서 override 가능 (min 1, max 100).

### Q5 — Category tree 깊이 제한

**결정**: 제한 없음 (spec: 권장 max 5). `buildCategoryTree(categories)` 함수로 flat list → tree 변환.

### Q6 — search.tags 입력/출력 형태

**결정**: `search.tags({ boardId, prefix })` → `string[]` (매칭 태그 최대 20개, GIN index 사용).  
실제 쿼리: `SELECT DISTINCT unnest(tags) AS tag FROM documents WHERE boardId = $1 AND tag ILIKE $2 ORDER BY tag LIMIT 20`.  
(Prisma `$queryRaw` 사용)

### Q7 — GIN index 사전 확인 ✅

`packages/db/prisma/migrations/20260517100000_add_content_foundation_models/migration.sql:` 에 다음 인덱스가 **이미 존재**:
```sql
CREATE INDEX "documents_tags_idx" ON "documents" USING GIN ("tags");
```

→ Slice C 에서 **신규 migration 불필요**. `tags @> ARRAY[...]::text[]` 와 `unnest(tags) AS tag ... ILIKE` 모두 위 GIN index 활용 가능.

### Q8 — `COUNT(*) OVER()` 성능 임계값

**결정**: 본 슬라이스의 임계값은 **게시판당 50,000 문서 이하**.  
- 50K 이하: `COUNT(*) OVER()` 윈도우 함수로 total 반환 (단일 쿼리, ms 단위 응답)
- 50K~500K: total 을 별도 cached 컬럼 (`Board.documentCount`) 으로 분리 권장 (Slice D 검토)
- 500K+: Meilisearch 또는 Postgres tsvector 외부 인덱스 이주 (REQ-CONTENT-064)

본 슬라이스 구현에는 `COUNT(*) OVER()` 사용하되, `searchDocuments` 함수의 `@MX:NOTE` 에 임계값 명시.

---

## 3. 구현 파일 목록

### 3.1 packages/board/src/category.ts (신규)

도메인 함수:

```ts
// 입력 스키마
const CreateCategorySchema = z.object({
  boardId: z.number().int().positive(),
  title: z.string().min(1).max(100),
  parentId: z.number().int().positive().nullable().default(null),
  description: z.string().max(500).nullable().default(null),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().default(null),
  listOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  groupIds: z.array(z.number().int()).default([]),
});

// 함수 시그니처
export async function createCategory(input, ctx: { prisma: PrismaClient }): Promise<DocumentCategory>
export async function listCategoryTree(boardId: number, ctx: { prisma: PrismaClient }): Promise<CategoryNode[]>
export async function updateCategory(input, ctx: { prisma: PrismaClient }): Promise<DocumentCategory>
export async function deleteCategory(id: number, ctx: { prisma: PrismaClient }): Promise<void>
export async function incrementDocumentCount(
  categoryId: number, delta: 1 | -1, prisma: PrismaClient
): Promise<void>

// CategoryNode 타입 (트리 변환)
export interface CategoryNode extends DocumentCategory {
  children: CategoryNode[];
}

// buildCategoryTree(categories: DocumentCategory[]): CategoryNode[]
export function buildCategoryTree(categories: DocumentCategory[]): CategoryNode[]
```

`deleteCategory` 시 하위 카테고리가 있으면 `CategoryHasChildrenError` 를 던진다 (재귀 삭제 금지).

### 3.2 packages/board/src/category.test.ts (신규)

TDD 테스트 (C-1 ~ C-12):

- **C-1** `createCategory` — boardId + title 으로 카테고리 생성, DB row 확인.
- **C-2** `createCategory` — parentId 있는 서브카테고리 생성.
- **C-3** `createCategory` — 빈 title → ZodError.
- **C-4** `listCategoryTree` — flat list 가 children 트리로 변환됨 (2레벨).
- **C-5** `updateCategory` — title 변경, 반환 값 확인.
- **C-6** `deleteCategory` — 자식 없는 카테고리 삭제 성공.
- **C-7** `deleteCategory` — 자식 있는 카테고리 → `CategoryHasChildrenError`.
- **C-8** `incrementDocumentCount` — categoryId + parent 에 +1 반영.
- **C-9** `incrementDocumentCount` — delta -1 → documentCount 0 미만으로 내려가지 않음 (max(0, count-1)).
- **C-10** `buildCategoryTree` — orphan (존재하지 않는 parentId) 은 root 로 fallback.
- **C-11** `listCategoryTree` — boardId 없는 카테고리는 포함 안 됨.
- **C-12** `canPerformAction` category write — groupIds 검사 (있으면 해당 그룹만 write 가능; REQ-CONTENT-042 최소 검증).

### 3.3 packages/board/src/search.ts (신규)

도메인 함수:

```ts
// searchDocuments 입력 스키마
const SearchDocumentsSchema = z.object({
  boardId: z.number().int().positive(),
  query: z.string().min(1).max(500).optional(),          // FTS
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
  total: number;           // approximate, from COUNT(*) OVER()
}

export async function searchDocuments(
  input: SearchDocumentsInput,
  ctx: { prisma: PrismaClient }
): Promise<SearchDocumentsResult>

// searchTags 입력 스키마
const SearchTagsSchema = z.object({
  boardId: z.number().int().positive(),
  prefix: z.string().min(1).max(100),
});

export async function searchTags(
  input: z.infer<typeof SearchTagsSchema>,
  ctx: { prisma: PrismaClient }
): Promise<string[]>
```

`searchDocuments` 구현 전략:
- `query` 있으면: `WHERE search_vector @@ plainto_tsquery('simple', $query)` (Prisma `$queryRaw`)
- `categoryId` 있으면: `AND boardId = X AND categoryId = Y`
- `tags` 있으면: `AND tags @> ARRAY[...]::text[]`
- cursor 디코드: `AND (listOrder < cursor.listOrder OR (listOrder = cursor.listOrder AND id < cursor.id))`
- sort: `ORDER BY listOrder DESC, id DESC` (기본)
- `total` 은 `COUNT(*) OVER()` 윈도우 함수 사용

### 3.4 packages/board/src/search.test.ts (신규)

TDD 테스트 (S-1 ~ S-10):

- **S-1** `searchDocuments` — query 없이 boardId 만 → 전체 문서 반환 (삭제된 것 제외).
- **S-2** FTS query 검색 — 제목에 키워드 있는 문서만 반환.
- **S-3** categoryId 필터 — 해당 카테고리 문서만.
- **S-4** tags 필터 — `tags @> ['typescript']` 매칭.
- **S-5** dateFrom/dateTo 범위 필터.
- **S-6** minVoted 필터.
- **S-7** cursor pagination — nextCursor 디코딩 후 다음 페이지 정확히 반환.
- **S-8** searchTags — prefix 'type' → ['typescript', 'typeorm'] 반환.
- **S-9** searchTags — 게시판에 태그 없으면 `[]`.
- **S-10** `searchDocuments` sort update_order — regdate 대신 updateOrder 기준 정렬.

### 3.5 packages/board/src/document.ts (수정)

**`listDocuments` 확장** — 현재 시그니처:
```ts
listDocuments({ moduleInstanceId, status, search? })
```
→ 확장:
```ts
const ListDocumentsSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
  search: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),     // 추가
  tags: z.array(z.string()).max(10).optional(),           // 추가
  sort: z.enum(['list_order', 'update_order']).default('list_order'),  // 추가
  cursor: z.string().optional(),                          // 추가
  limit: z.number().int().min(1).max(100).optional(),     // 추가 (기본은 board.listCount)
});

export interface DocumentListResult {
  notices: Document[];        // isNotice = true 문서 (board.exceptNotice = false 일 때만)
  items: Document[];          // 일반 문서 (페이지네이션 적용)
  nextCursor: string | null;
}

export async function listDocuments(
  input: ListDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentListResult>
```

**`createDocument` 확장** — `categoryId` 파라미터 추가 + `incrementDocumentCount` 호출:
```ts
const CreateDocumentSchema = z.object({
  // 기존 필드 유지 +
  categoryId: z.number().int().positive().nullable().default(null),  // 추가
  tags: z.array(z.string().max(50)).max(20).default([]),             // 추가
});
```

`createDocument` 내에서 `categoryId != null` 이면 트랜잭션 내 `incrementDocumentCount(categoryId, 1, prisma)` 호출.

**`deleteDocument` 확장** — soft delete 시 `categoryId` 가 있으면 `incrementDocumentCount(categoryId, -1, prisma)` 호출.

**cursor 인코딩/디코딩 유틸**:
```ts
export function encodeCursor(listOrder: bigint, id: number): string
export function decodeCursor(cursor: string): { listOrder: bigint; id: number }
```
Base64 URL-safe encoding.

### 3.6 packages/board/src/document.test.ts (수정)

신규 테스트 (D-1 ~ D-8 + D-9~D-10 회귀):

- **D-1** `listDocuments` — cursor 없음: 첫 페이지 반환, `nextCursor` 있음.
- **D-2** `listDocuments` — cursor 있음: 다음 페이지 반환, 이전 페이지와 겹치지 않음.
- **D-3** `listDocuments` — `isNotice = true` 문서가 notices[] 에 분리.
- **D-4** `listDocuments` — `exceptNotice = true` 게시판: notices[] 비어있음.
- **D-5** `listDocuments` — categoryId 필터: 해당 카테고리 문서만.
- **D-6** `listDocuments` — tags 필터.
- **D-7** `createDocument` — categoryId 있으면 `documentCount` +1 확인 (CTE 단일 쿼리).
- **D-8** `deleteDocument` — soft delete 후 `documentCount` -1 확인.
- **D-9 (회귀)** `listDocuments` — Slice B 기존 호출 (`{ moduleInstanceId, status }` 만 전달) → `notices[]` 빈 배열 + `items[]` 정상 반환 + `nextCursor: null`. **Breaking change 호환성 보장**.
- **D-10 (회귀)** `encodeCursor` / `decodeCursor` round-trip — `{ listOrder: 100n, id: 5 }` → encode → decode → 원본과 deep equal (BigInt 보존).

### 3.7 packages/board/src/index.ts (수정)

신규 export 추가:
```ts
export {
  createCategory, listCategoryTree, updateCategory, deleteCategory,
  incrementDocumentCount, buildCategoryTree, CategoryHasChildrenError
} from './category.js';
export type { CategoryNode } from './category.js';

export {
  searchDocuments, searchTags,
} from './search.js';
export type { SearchDocumentsInput, SearchDocumentsResult } from './search.js';
```

### 3.8 apps/web/server/api/routers/admin/category.ts (신규)

```ts
export const adminCategoryRouter = router({
  list: protectedAdminProcedure.input(z.object({ boardId: z.number() }))
        .query(…),
  create: protectedAdminProcedure.input(CreateCategoryInput).mutation(…),
  update: protectedAdminProcedure.input(UpdateCategoryInput).mutation(…),
  delete: protectedAdminProcedure.input(z.object({ id: z.number() })).mutation(…),
});
```

### 3.9 apps/web/server/api/routers/admin/category.test.ts (신규)

테스트 (AC-1 ~ AC-6):

- **AC-1** `admin.category.list` — boardId 로 tree 반환.
- **AC-2** `admin.category.create` — 정상 생성.
- **AC-3** `admin.category.create` — 비관리자 → UNAUTHORIZED.
- **AC-4** `admin.category.update` — title 변경.
- **AC-5** `admin.category.delete` — 자식 없음 → 성공.
- **AC-6** `admin.category.delete` — 자식 있음 → CONFLICT (CategoryHasChildrenError → HTTP 409).

### 3.10 apps/web/server/api/routers/admin/index.ts (수정)

`adminCategoryRouter` 추가:
```ts
import { adminCategoryRouter } from './category';
// ...
export const adminRouter = router({
  // 기존 라우터들
  category: adminCategoryRouter,  // 추가
});
```

### 3.11 apps/web/server/api/routers/content/category.ts (신규)

```ts
export const contentCategoryRouter = router({
  tree: publicProcedure
    .input(z.object({ boardId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => listCategoryTree(input.boardId, { prisma: ctx.prisma })),
});
```

### 3.12 apps/web/server/api/routers/content/category.test.ts (신규)

- **CC-1** `content.category.tree` — 트리 반환.
- **CC-2** `content.category.tree` — 빈 게시판 → `[]`.

### 3.13 apps/web/server/api/routers/content/search.ts (신규)

```ts
export const contentSearchRouter = router({
  documents: publicProcedure
    .input(SearchDocumentsInputSchema)
    .query(async ({ ctx, input }) => searchDocuments(input, { prisma: ctx.prisma })),

  tags: publicProcedure
    .input(z.object({ boardId: z.number(), prefix: z.string().min(1) }))
    .query(async ({ ctx, input }) => searchTags(input, { prisma: ctx.prisma })),
});
```

### 3.14 apps/web/server/api/routers/content/search.test.ts (신규)

- **CS-1** `content.search.documents` — query + boardId → 결과 반환.
- **CS-2** `content.search.documents` — cursor pagination 연속 호출.
- **CS-3** `content.search.documents` — 없는 boardId → `{ items: [], nextCursor: null, total: 0 }`.
- **CS-4** `content.search.tags` — prefix 매칭.

### 3.15 apps/web/server/api/routers/content/document.ts (수정)

`list` 프로시저 입력 스키마 확장:
```ts
z.object({
  moduleInstanceId: z.number().int().positive(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
  search: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),  // 추가
  tags: z.array(z.string()).max(10).optional(),        // 추가
  sort: z.enum(['list_order', 'update_order']).default('list_order'),  // 추가
  cursor: z.string().optional(),                       // 추가
  limit: z.number().int().min(1).max(100).optional(),  // 추가
})
```

`create` 프로시저: `categoryId`, `tags` 파라미터 추가.

### 3.16 apps/web/server/api/routers/content/index.ts (수정)

`contentCategoryRouter`, `contentSearchRouter` 추가:
```ts
export const contentRouter = router({
  document: contentDocumentRouter,
  comment: contentCommentRouter,
  category: contentCategoryRouter,   // 추가
  search: contentSearchRouter,        // 추가
});
```

### 3.17 packages/board/src/routes/index-page.tsx (수정)

현재: `listDocuments({ moduleInstanceId, status })` 호출 후 단순 `<ul>` 렌더.

Slice C 변경:
- `searchParams` 에서 `cursor`, `categoryId`, `sort` 파라미터 읽기.
- `listDocuments` 호출 시 cursor/categoryId/sort 전달.
- 응답의 `notices[]` 를 상단에 `[공지]` 배지와 함께 렌더.
- `items[]` 를 렌더.
- 페이지네이션 컨트롤: 이전/다음 버튼 (Server Component 링크).
- 카테고리 필터: `listCategoryTree` 결과를 드롭다운으로 렌더 (간단한 `<select>` — Slice D 에서 UI 고도화).
- URL 파라미터: `?cursor=xxx&categoryId=1&sort=update_order`.

---

## 4. TDD 테스트 시나리오 (총 ~48개)

| 그룹 | 테스트 ID | 수 |
|------|-----------|----|
| Category domain | C-1 ~ C-12 | 12 |
| Search domain | S-1 ~ S-10 | 10 |
| Document pagination + 회귀 | D-1 ~ D-10 | 10 |
| Admin category tRPC | AC-1 ~ AC-6 | 6 |
| Content category tRPC | CC-1 ~ CC-2 | 2 |
| Content search tRPC | CS-1 ~ CS-4 | 4 |
| index-page UI (Slice C 변경분) | IP-1 ~ IP-6 | 6 |

**예상**: 588 → ~638 tests after Slice C

---

## 5. 팀 구성 (Team Mode)

| 역할 | 파일 소유 | 담당 |
|------|-----------|------|
| **backend-dev** | packages/board/src/{category,search,document}.ts, index.ts, routes/\*, apps/web/server/api/routers/\*\*/\*.ts | 도메인 함수 + tRPC 라우터 + TDD (C-1~C-12, S-1~S-10, D-1~D-8, AC-1~AC-6, CC-1~CC-2, CS-1~CS-4) |
| **frontend-dev** | packages/board/src/routes/index-page.tsx | BoardIndexPage pagination + category filter UI + IP-1~IP-6 테스트 |

---

## 6. 우선순위와 작업 순서

### backend-dev 작업 순서

**T-001**: `packages/board/src/category.ts` + `category.test.ts` (C-1~C-12)
**T-002**: `packages/board/src/search.ts` + `search.test.ts` (S-1~S-10)
**T-003**: `packages/board/src/document.ts` 확장 + `document.test.ts` 신규 (D-1~D-8)
**T-004**: `apps/web/server/api/routers/admin/category.ts` + test (AC-1~AC-6)
**T-005**: `apps/web/server/api/routers/content/category.ts` + test (CC-1~CC-2)
**T-006**: `apps/web/server/api/routers/content/search.ts` + test (CS-1~CS-4)
**T-007**: router index 파일들 + content/document.ts 스키마 확장
**T-008**: `packages/board/src/index.ts` re-export 업데이트
**T-009**: 전체 `pnpm -r test` + typecheck + build

T-001, T-002 는 독립적 → 병렬 가능.  
T-003 은 T-001 완료 후 시작 (incrementDocumentCount 의존).  
T-004, T-005, T-006 은 T-001/T-002 완료 후 병렬.

### frontend-dev 작업 순서

**F-001**: `packages/board/src/routes/index-page.tsx` 업데이트 (listDocuments 새 시그니처 기반)
**F-002**: IP-1~IP-6 테스트 작성

backend-dev 의 T-001 완료 신호 후 F-001 시작.

---

## 7. @MX 태그 후보

| 위치 | 태그 | 사유 |
|------|------|------|
| `category.ts` 의 `incrementDocumentCount` | `@MX:ANCHOR` | **단일 recursive CTE 쿼리**로 self + ancestors atomic 갱신. createDocument/deleteDocument 두 호출자에서 진입. `@MX:REASON: $executeRaw recursive CTE 로 N-쿼리 회피, GREATEST(0, ...) 로 음수 방지` |
| `document.ts` 의 `listDocuments` | `@MX:ANCHOR` | fan_in >= 4 (BoardIndexPage, tRPC list, search fallback, test). **Breaking change**: 반환 타입이 `Document[]` → `{ notices, items, nextCursor }`. |
| `document.ts` 의 `encodeCursor`/`decodeCursor` | `@MX:WARN` | BigInt 직렬화 시 반드시 `String()`/`BigInt()` 변환. 원본 bigint 를 `JSON.stringify` 에 그대로 넘기면 TypeError. |
| `search.ts` 의 `searchDocuments` | `@MX:NOTE` | Postgres FTS + COUNT(\*) OVER(). 50K 문서 이하 게시판 권장. 500K+ 시 Meilisearch 이주 (REQ-CONTENT-064). |
| `index-page.tsx` 의 cursor URL 파라미터 | `@MX:NOTE` | `searchParams.cursor` 는 opaque base64 — 클라이언트 쪽 파싱 금지. |

---

## 8. DoD (Definition of Done)

- [ ] `pnpm -r typecheck` 0 errors.
- [ ] `pnpm -r build` green.
- [ ] `pnpm -r test` ~638 tests pass (588 + ~50).
- [ ] `content.category.tree`, `search.documents`, `search.tags` tRPC 엔드포인트 노출.
- [ ] `admin.category.*` CRUD 동작.
- [ ] `listDocuments` cursor pagination + notice 고정 동작.
- [ ] `listDocuments` 기존 Slice B 호출 시그니처 **회귀 없음** (D-9 PASS).
- [ ] `encodeCursor`/`decodeCursor` BigInt round-trip 정확성 (D-10 PASS).
- [ ] `createDocument` categoryId/tags 저장 + `documentCount` 증가 (recursive CTE 단일 쿼리).
- [ ] BoardIndexPage: 페이지네이션 링크 + 카테고리 드롭다운 렌더.
- [ ] @MX:ANCHOR/@MX:WARN 태그 @MX:REASON sub-line 포함.

---

## 9. Heads-up for Slice D

- **Voting/Blame/Declare** (REQ-CONTENT-090/091) — DocumentVote tRPC.
- **Soft Delete/Restore** (REQ-CONTENT-100/101) — Trash flow.
- **Edit History** (REQ-CONTENT-110) — DocumentUpdateLog.
- **Custom Fields** (REQ-CONTENT-120/121) — DocumentExtraKey + 동적 Zod.
- **Rate Limiting** (REQ-CONTENT-140/141) — 미인증 IP per-hour limit.
- **File Attachments** (REQ-CONTENT-030/031) — S3 presign + virus scan.

---

**Plan version**: 1.1 (2026-05-19 검토 반영)
**Author**: MoAI orchestrator (SPEC-CONTENT-001 Slice C)
**Date**: 2026-05-18 (created), 2026-05-19 (revised)
**Base SHA**: c1f6a2d
**Revision notes**: BigInt 직렬화(Q1) 명시, recursive CTE 채택(Q2), GIN index 사전 확인(Q7), COUNT(*) 임계값(Q8), Breaking change 회귀 테스트 D-9/D-10 추가, @MX 태그 4건 강화
