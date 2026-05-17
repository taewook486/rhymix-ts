# SPEC-CONTENT-001 — Slice A 플랜

**Status**: ready
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = 8956175 (ADMIN-001 Slice H 완료, 533 tests after Slice I PR)
**Scope**: Foundation 스키마 + `board` ModuleDefinition — Prisma 모델 신규 + board 모듈 도메인 레이어. **tRPC / UI / FTS trigger / 권한 매트릭스 평가 / Comment·File·Vote 도메인 함수 없음.**
**Spec source**: `.moai/specs/SPEC-CONTENT-001/spec.md` (Domain Model L273~610, REQ-CONTENT-001~140)

---

## 1. 목표 (What & Why)

ADMIN-001 Slice A 에서 모듈 시스템 (`ModuleDefinition`, `registerModule`, `createModuleInstance`, `onInstall` 트랜잭션) 이 완성되었지만, 실제 모듈 정의는 **하나도 등록되지 않았다**. `[mid]/page.tsx` 는 `instance.name` placeholder 만 렌더한다 (`@MX:TODO Slice C 에서 def.routes.index 위임 예정`).

CONTENT-001 Slice A 의 임무는:

1. **Prisma 스키마**에 SPEC-CONTENT-001 Domain Model 의 Board / Document / Comment / FileAttachment / DocumentCategory / DocumentExtraKey / DocumentUpdateLog / DocumentVote / DocumentReport / Trash 10개 모델을 신규 추가하고 단일 migration 으로 배포.
2. **board 모듈 패키지** (`packages/board`) 를 신설하고 `ModuleDefinition<BoardConfig>` 를 export — `onInstall` 훅에서 `Board` row 1건을 생성 (ModuleConfig 1:1 패턴 대신 별도 테이블).
3. **모듈 등록 부트스트랩** (`apps/web/lib/modules/register.ts`) 을 추가하여 HMR-safe singleton 으로 `boardModule` 을 process-scoped 레지스트리에 등록.
4. **`ModuleRouteMap.index` 타입을 구체화** — Server Component 함수 시그니처로 좁혀 Slice B 에서 `[mid]/page.tsx` 가 위임할 진입점을 정의.

Slice A 는 **도메인 모델 + 모듈 정의 + 빈 라우트 진입점** 까지만. 게시판 목록/글쓰기/댓글 UI 와 tRPC 라우터는 Slice B 이상에서 별도 진행.

---

## 2. Pre-Flight Findings

### Q1 — Board 설정: 별도 테이블 vs ModuleConfig.config JSON

**조사 결과**:
- ADMIN-001 의 `ModuleConfig` 는 `config Json @default("{}")` 1:1 패턴 (`packages/db/prisma/schema.prisma:131~142`). `configSchema` (Zod) 가 런타임 검증만 담당.
- SPEC-CONTENT-001 spec.md L294~334 의 `Board` 모델은 **18개 컬럼** — `skin`, `layoutId`, `listCount`, `pageCount`, `orderTarget`, `consultation`, `useAnonymous`, `updateLog`, `trashUse`, `useStatus String[]`, `useCategory`, `documentLengthLimit`, `commentLengthLimit`, 4개 protectXxx Int, `permissions Json`, `moduleSrl BigInt @unique` (legacy 매핑), 그리고 `documents`, `categories`, `extraKeys` 역참조.
- 즉 spec 의 Board 는 ModuleConfig.config JSON blob 으로 표현 가능하지만 **다른 모델 (Document, DocumentCategory, DocumentExtraKey) 이 `boardId` 로 FK 를 잡는다** — 단순 JSON 로는 FK 표현 불가.

**결정**: spec.md L294 의 **`Board` 별도 테이블 패턴을 채택**. 단, ADMIN-001 의 `ModuleInstance.id` (Int autoincrement) 와 정합성을 유지하기 위해 spec 의 `id String @id @default(cuid())` 대신 **`Board.moduleInstanceId Int @unique`** 를 PK 대체 키로 사용하고, `id` 는 cuid 유지하되 FK 컬럼은 정수 (`moduleInstanceId`) 로 연결. 결과적으로 ModuleInstance (1) ─ Board (1) 1:1 관계이며 ModuleConfig 와는 **공존**한다 (ModuleConfig 는 board-agnostic JSON, Board 는 board-only 정형 컬럼).

**spec.md 와의 deviation**:
- spec.md 의 `Board.moduleSrl BigInt @unique` (legacy XE module_srl 매핑용) 은 일단 보존하되 nullable 로. ADMIN-001 시점에는 legacy 매핑이 없으므로 신규 인스턴스는 null. Slice A 에서는 컬럼만 추가.
- spec.md 의 `documents Document[]` 역참조는 `boardId String` (FK) 로 연결되지만, 본 Slice 에서는 `boardId` 대신 **`moduleInstanceId Int` 를 Document FK 로 사용**한다. 이유: `Board.id` (cuid) 와 `ModuleInstance.id` (Int) 두 개의 식별자를 코드 전역에서 동시에 다루면 혼란 + 추가 JOIN 비용. 단일 진입점은 `ModuleInstance.id` 로 통일.

### Q2 — Full Text Search (FTS) tsvector 컬럼

**조사 결과**:
- spec.md L412 는 `search_vector tsvector` 컬럼을 Prisma 가 표현 못하므로 raw SQL 로 추가하라고 명시.
- spec.md L595~604 의 raw SQL: `ALTER TABLE "Document" ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (...) STORED;` + `CREATE INDEX document_search_vector_idx ON "Document" USING GIN (search_vector);`
- Prisma 의 `Unsupported("tsvector")?` 타입은 SELECT/INSERT 에서 무시되므로 컬럼만 추가하고 tsquery 검색은 Slice B 에서 `prisma.$queryRaw` 로 처리.

**결정**: Slice A 에서 **GENERATED ALWAYS AS STORED 컬럼 + GIN index 만 추가**. tsquery 기반 검색 함수는 Slice B 이상. Prisma 스키마에는 `searchVector Unsupported("tsvector")?` 만 선언. migration 끝부분에 raw SQL `ALTER TABLE` + `CREATE INDEX` 한 줄씩 직접 추가.

### Q3 — `ModuleRouteMap.index` 타입 구체화

**조사 결과**:
- 현재 `packages/core/src/modules/types.ts:31~38` 의 `ModuleRouteMap.index` 는 `unknown`.
- ADMIN-001 Slice B 의 `[mid]/page.tsx` 는 `instance` 객체를 받아 직접 JSX 를 렌더 (placeholder). Slice C 에서 `def.routes.index(props)` 위임으로 교체 예정.
- Next.js 16 App Router 의 Server Component 는 `async (props) => JSX | Promise<JSX>` 시그니처.

**결정**: `ModuleRouteMap.index` 타입을 다음과 같이 구체화:

```ts
export interface ModuleRoutePageProps {
  instance: ModuleInstance & { config: ModuleConfig | null };
  params: Record<string, string>;       // Next.js dynamic params (mid 외)
  searchParams: Record<string, string | string[] | undefined>;
}

export type ModuleRouteIndex =
  (props: ModuleRoutePageProps) => Promise<React.ReactNode> | React.ReactNode;

export interface ModuleRouteMap {
  index?: ModuleRouteIndex;
  catchAll?: ModuleRouteIndex;
  actions?: Record<string, unknown>;    // Server Action 등록은 Slice B+ 에서 별도 정의
}
```

- `React.ReactNode` 는 `packages/core` 의 peer dependency 로 `react@19` 를 추가하지 않고 type-only import (`import type { ReactNode } from 'react'`) 로 가져온다. `react` 의 타입은 `@types/react` 가 이미 monorepo 에 존재.
- `board` 모듈의 `routes.index` 는 Slice A 에서는 **빈 placeholder Server Component** 만 제공 (`async () => <p>board mid={...} (Slice B 에서 목록 페이지로 교체 예정)</p>`). 실제 Document 목록 렌더는 Slice B.

### Q4 — board 모듈 등록 시점 (HMR-safe)

**조사 결과**:
- ADMIN-001 의 `registry.ts` 는 process-scoped `Map<string, ModuleDefinition>` 으로 추정 (Slice A 에서 `registerModule` / `getModule` / `DuplicateModuleError` 시그니처 사용 중).
- Next.js 16 dev 모드의 HMR 은 모듈을 reload 하므로 top-level `registerModule(boardModule)` 호출은 중복 등록 → `DuplicateModuleError` 발생 위험.
- ADMIN-001 의 install seed 는 어디서 모듈을 등록하는지 미확인 — 본 Slice 에서는 별도 endpoint 가 없으므로 **request 진입 시점 lazy init** 이 안전.

**결정**:
- `apps/web/lib/modules/register.ts` 신규 생성. `let initialized = false` 모듈-스코프 flag.
- `initModules()` 함수: `if (initialized) return; registerModule(boardModule); initialized = true;` — singleton guard.
- `apps/web/instrumentation.ts` (Next.js 공식 부트스트랩 훅) 의 `register()` 에서 `initModules()` 호출. instrumentation.ts 가 이미 존재하면 추가, 없으면 신규 생성.
- HMR 에서 `registerModule` 이 중복 호출되어 `DuplicateModuleError` 가 던져지면 `initModules()` 에서 catch + warn — 단, **DuplicateModuleError 만 swallow**, 그 외는 throw.

### Q5 — `Document` 도메인 함수의 Slice A 포함 범위

**Pre-Flight 사용자 지시**: "Document 도메인 (도메인 레이어 - tRPC 없이)" 으로 표현됨. 즉 `createDocument` / `listDocuments` / `getDocument` 셋만 함수로 구현, tRPC 라우터 등록은 안 함.

**조사 결과 & 결정**:
- spec.md REQ-CONTENT-010 (게시물 목록), REQ-CONTENT-020 (글쓰기), REQ-CONTENT-100 (소프트 삭제) 등 대부분의 REQ 는 Slice B+ 에 속함.
- Slice A 의 도메인 함수 3개는 **EARS-style minimum viable kernel** 만 — 인자 검증 (Zod), Prisma 조작, 권한 평가 / 감사 로그 / FTS / 익명 / 비밀번호 해시 / 통계 갱신 **모두 제외**. 즉:
  - `createDocument(input, ctx)`: `{ moduleInstanceId, authorId, title, content }` 받고 `status: TEMP` 로 저장. 비밀번호 / extraVars / tags / isNotice / langCode 등은 기본값.
  - `listDocuments({ moduleInstanceId, status })`: 단순 `findMany({ where: { moduleInstanceId, status }, orderBy: regdate desc, take: 20 })`. 페이징 / 카테고리 / 검색 없음.
  - `getDocument(id, ctx)`: `findUniqueOrThrow({ where: { id }, include: { author: true } })`. 비밀번호 검사 / 시크릿 가시성 / 조회수 증가 없음 (Slice B+).
- 권한 / sanitization / FTS / 통계 / 카테고리 / 첨부 / 익명 / Trash 는 모두 Slice B 이상.

### Q6 — `Document.id` 타입 (BigInt vs cuid)

**조사 결과**:
- spec.md L349 는 `id String @id @default(cuid())` + 별도 `documentSrl BigInt @unique` (legacy XE 매핑) 두 컬럼.
- ADMIN-001 의 `User.id` 는 `Int @default(autoincrement())` 로 spec 의 cuid 와 다름 (deviation 명시됨).
- 본 Slice 도 ADMIN-001 정신을 따라 `Document.id Int @default(autoincrement())` + `documentSrl BigInt? @unique` (nullable, legacy 매핑) 로 채택.

**결정**: 모든 신규 모델의 PK 는 `id Int @id @default(autoincrement())`. legacy 매핑 컬럼 (`documentSrl`, `commentSrl`, `fileSrl`, `categorySrl` 등) 은 모두 `BigInt? @unique` (nullable). 신규 인스턴스 생성 시 null.

### Q7 — `Document.userId` 타입 (Int vs Citext String)

**조사 결과**:
- spec.md L363 는 `userId String? @db.Citext` — XE 의 user_id (login id) 문자열.
- ADMIN-001 의 `User.id Int` 와 `User.userId String @unique @db.Citext` 가 동시 존재. 즉 spec 의 `Document.userId` 는 `User.userId` 와 매칭 (login id), `User.id` 와는 다름.
- 무엇을 FK 로 잡아야 하는가? Prisma 관계는 PK 권장. `User.id` (Int) 를 FK 로 잡고, `userId` (String) 는 denormalized 표시 컬럼으로 두는 것이 자연스러움.

**결정**:
- `Document.authorId Int?` — `User.id` 참조 (nullable: 익명 작성자 지원). FK relation 정의.
- `Document.userIdSnapshot String? @db.Citext` — 작성 당시 user.userId 스냅샷 (nick, member_id 변경 추적용). Slice A 에서는 컬럼만, 값 채움은 Slice B 의 createDocument 에서.
- spec.md 의 다른 `userId` 컬럼들 (Comment, FileAttachment) 도 같은 패턴 적용.

### Q8 — Migration 단일/분할

**결정**: 단일 migration `add_content_foundation_models` — 10개 모델 + 1개 raw SQL block (FTS 컬럼/인덱스). 분할하지 않는다. 이유: 모든 테이블이 같은 도메인이고 FK 가 서로 참조 (Document → Board, Comment → Document, FileAttachment → Document/Comment 등). 분할 시 일관성 깨짐.

---

## 3. 구현 파일 목록

### 3.1 Prisma 스키마 변경 (`packages/db/prisma/schema.prisma`)

기존 파일 L500 의 `// SPEC-CONTENT-001 / SPEC-THEME-001 models DEFERRED to their own slices.` 주석을 제거하고 다음 모델 10개 + enum 4개 추가:

**enum**:
- `DocumentStatus { PUBLIC, SECRET, TEMP }` (spec.md L337)
- `CommentStatus { ALLOW, DISABLE }` (spec.md L343)
- `UploadTargetType { DOCUMENT, COMMENT }` (spec.md L491)
- `VoteType { UP, DOWN, BLAME }` (spec.md L542)

**model**:

1. **`Board`** (테이블명 `boards`):
   ```
   id Int @id @default(autoincrement())
   moduleInstanceId Int @unique           // FK → ModuleInstance.id
   moduleSrl BigInt? @unique              // legacy XE module_srl
   name String
   description String?
   skin String?
   layoutId Int?
   mobileSkin String?
   mobileLayoutId Int?
   listCount Int @default(20)
   pageCount Int @default(10)
   orderTarget String @default("list_order")  // list_order | update_order
   exceptNotice Boolean @default(false)
   consultation Boolean @default(false)
   useAnonymous Boolean @default(false)
   updateLog Boolean @default(false)
   trashUse Boolean @default(true)
   useStatus DocumentStatus[] @default([PUBLIC, SECRET, TEMP])
   useCategory Boolean @default(false)
   documentLengthLimit Int @default(1048576)
   commentLengthLimit Int @default(131072)
   protectDeleteContent Int @default(0)
   protectUpdateContent Int @default(0)
   protectDeleteComment Int @default(0)
   protectUpdateComment Int @default(0)
   permissions Json @default("{}")
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
   moduleInstance ModuleInstance @relation(fields: [moduleInstanceId], references: [id], onDelete: Cascade)
   documents Document[]
   categories DocumentCategory[]
   extraKeys DocumentExtraKey[]
   @@index([moduleSrl])
   @@map("boards")
   ```

   `ModuleInstance` 모델에 `board Board?` 역참조 추가 (1:1).

2. **`Document`** (테이블명 `documents`):
   - PK `id Int @id @default(autoincrement())`
   - `documentSrl BigInt? @unique` (legacy)
   - `boardId Int` FK → `Board.id`, onDelete: Cascade
   - `categoryId Int?` FK → `DocumentCategory.id`, onDelete: SetNull
   - `title String`, `titleBold Boolean @default(false)`, `titleColor String?`
   - `content String` (sanitized HTML, Slice A 에선 그대로 저장)
   - `contentText String?` (plain-text projection for FTS)
   - **Author**: `authorId Int?` FK → `User.id` (nullable for anonymous), `userIdSnapshot String? @db.Citext`, `nickName String?`, `memberId String?` (XE legacy), `email String? @db.Citext`, `ipAddress String?` (citext 아님, plain), `password String?` (bcrypt hash for protected posts)
   - **Counts** (all Int @default(0)): `readedCount`, `votedCount`, `blamedCount`, `commentCount`, `trackbackCount`, `uploadedCount`
   - **Status / flags**: `status DocumentStatus @default(PUBLIC)`, `commentStatus CommentStatus @default(ALLOW)`, `isNotice Boolean @default(false)`, `langCode String @default("ko")`, `allowTrackback Boolean @default(false)`, `notifyMessage Boolean @default(false)`
   - **Tags & extras**: `tags String[] @default([])`, `extraVars Json @default("{}")`
   - **Sorting**: `listOrder BigInt @default(0)`, `updateOrder BigInt @default(0)` (Slice B 에서 트리거)
   - **Timestamps**: `regdate DateTime @default(now()) @db.Timestamptz`, `lastUpdate DateTime @updatedAt @db.Timestamptz`, `deletedAt DateTime? @db.Timestamptz` (soft delete)
   - **FTS**: `searchVector Unsupported("tsvector")?` — 컬럼만 선언. 실제 GENERATED ALWAYS AS 는 raw SQL.
   - **Relations**: `board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)`, `category DocumentCategory? @relation(...)`, `author User? @relation("DocumentAuthor", fields: [authorId], references: [id], onDelete: SetNull)`, `comments Comment[]`, `files FileAttachment[] @relation("DocumentFiles")`, `updateLogs DocumentUpdateLog[]`, `votes DocumentVote[]`, `reports DocumentReport[]`, `trash Trash?`
   - **Indexes**:
     ```
     @@index([boardId, status, regdate(sort: Desc)])
     @@index([boardId, isNotice, listOrder(sort: Desc)])
     @@index([boardId, categoryId, listOrder(sort: Desc)])
     @@index([authorId])
     @@index([tags], type: Gin)
     @@index([extraVars], type: Gin)
     @@map("documents")
     ```
   - `User` 모델에 `documentsAuthored Document[] @relation("DocumentAuthor")` 역참조 추가.

3. **`Comment`** (테이블명 `comments`):
   - PK `id Int @id @default(autoincrement())`
   - `commentSrl BigInt? @unique` (legacy)
   - `documentId Int` FK → `Document.id`, onDelete: Cascade
   - `parentId Int?` self-ref FK → `Comment.id`, onDelete: NoAction, onUpdate: NoAction
   - `boardId Int` (denormalized for fast board-scoped queries; spec.md L426)
   - `content String`
   - `isSecret Boolean @default(false)`, `password String?`
   - `votedCount Int @default(0)`, `blamedCount Int @default(0)`
   - **Author**: 동일 패턴 (`authorId Int?` FK User, `userIdSnapshot String? @db.Citext`, `nickName String?`, `memberId String?`, `email String? @db.Citext`, `ipAddress String?`)
   - `status Int @default(1)` (1=active, 0=hidden — spec.md L437)
   - `listOrder BigInt @default(0)`
   - `regdate DateTime @default(now()) @db.Timestamptz`, `lastUpdate DateTime @updatedAt @db.Timestamptz`, `deletedAt DateTime? @db.Timestamptz`
   - **Relations**: `document Document @relation(...)`, `parent Comment? @relation("CommentReplies", ...)`, `replies Comment[] @relation("CommentReplies")`, `author User? @relation("CommentAuthor", ...)`, `files FileAttachment[] @relation("CommentFiles")`
   - **Indexes**: `@@index([documentId, listOrder])`, `@@index([parentId])`, `@@index([authorId])`, `@@map("comments")`
   - `User` 모델에 `commentsAuthored Comment[] @relation("CommentAuthor")` 추가.

4. **`DocumentCategory`** (테이블명 `document_categories`):
   - `id Int @id @default(autoincrement())`, `categorySrl BigInt? @unique`
   - `boardId Int` FK → `Board.id`, onDelete: Cascade
   - `parentId Int?` self-ref FK → `DocumentCategory.id`, onDelete: NoAction, onUpdate: NoAction
   - `title String`, `description String?`, `color String?`
   - `expand Boolean @default(true)`, `isDefault Boolean @default(false)`
   - `groupIds Int[] @default([])` (ACL — Slice B 에서 평가)
   - `documentCount Int @default(0)` (denormalized; Slice B 트리거)
   - `listOrder Int @default(0)`
   - `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
   - Relations: `board Board @relation(...)`, `parent DocumentCategory? @relation("CategoryTree", ...)`, `children DocumentCategory[] @relation("CategoryTree")`, `documents Document[]`
   - `@@index([boardId, parentId, listOrder])`, `@@map("document_categories")`

5. **`DocumentExtraKey`** (테이블명 `document_extra_keys`):
   - `id Int @id @default(autoincrement())`
   - `boardId Int` FK, `varIdx Int`, `varName String`, `varType String` (text|number|select|checkbox|date|url|email)
   - `varIsRequired Boolean @default(false)`, `varSearch Boolean @default(false)`, `varSort Boolean @default(false)`
   - `varOptions Json?`
   - `langCode String @default("ko")`
   - `board Board @relation(...)`
   - `@@unique([boardId, varIdx, langCode])`, `@@index([boardId])`, `@@map("document_extra_keys")`

6. **`FileAttachment`** (테이블명 `file_attachments`):
   - `id Int @id @default(autoincrement())`, `fileSrl BigInt? @unique`
   - `uploadTargetType UploadTargetType`
   - `documentId Int?` FK → `Document.id`, `commentId Int?` FK → `Comment.id`
   - `sourceFilename String`, `uploadedFilename String`
   - `fileSize BigInt`, `mimeType String`
   - `width Int?`, `height Int?`, `duration Int?`
   - `directDownload Boolean @default(false)`, `downloadCount Int @default(0)`, `coverImage Boolean @default(false)`
   - `isvalid Boolean @default(true)` (false on virus detected / pending scan — spec.md L516)
   - `memberId String?`
   - `storageKey String` (S3 object key)
   - `regdate DateTime @default(now()) @db.Timestamptz`
   - Relations: `document Document? @relation("DocumentFiles", ...)`, `comment Comment? @relation("CommentFiles", ...)`
   - `@@index([documentId])`, `@@index([commentId])`, `@@map("file_attachments")`

7. **`DocumentUpdateLog`** (테이블명 `document_update_logs`):
   - `id Int @id @default(autoincrement())`
   - `documentId Int` FK → `Document.id`, onDelete: Cascade
   - `prevTitle String`, `prevContent String`, `prevExtraVars Json?`
   - `editorId Int?` FK → `User.id`, `editorIp String?`
   - `regdate DateTime @default(now()) @db.Timestamptz`
   - `document Document @relation(...)`
   - `@@index([documentId, regdate(sort: Desc)])`, `@@map("document_update_logs")`

8. **`DocumentVote`** (테이블명 `document_votes`):
   - `id Int @id @default(autoincrement())`
   - `documentId Int` FK, `commentId Int?` (vote can target comment too)
   - `voterId String` (User.id stringified or hashed IP for anon)
   - `voteType VoteType`
   - `point Int @default(1)`
   - `regdate DateTime @default(now()) @db.Timestamptz`
   - `document Document @relation(...)`
   - `@@unique([documentId, voterId, voteType])`, `@@index([documentId])`, `@@index([commentId])`, `@@map("document_votes")`

9. **`DocumentReport`** (테이블명 `document_reports`):
   - `id Int @id @default(autoincrement())`
   - `documentId Int?`, `commentId Int?`
   - `reporterId String`, `reporterIp String?`
   - `reason String`, `resolved Boolean @default(false)`
   - `regdate DateTime @default(now()) @db.Timestamptz`
   - `document Document? @relation(...)`
   - `@@index([documentId])`, `@@index([commentId])`, `@@index([resolved])`, `@@map("document_reports")`

10. **`Trash`** (테이블명 `document_trash`):
    - `id Int @id @default(autoincrement())`
    - `documentId Int @unique` FK → `Document.id`, onDelete: Cascade
    - `deletedById Int?` FK → `User.id`
    - `deletedAt DateTime @default(now()) @db.Timestamptz`
    - `expiresAt DateTime @db.Timestamptz` (deletedAt + retention window; Slice B 에서 채움)
    - `document Document @relation(...)`
    - `@@index([expiresAt])`, `@@map("document_trash")`

**참고**: `User` 모델 (L270~314) 에 다음 역참조 3개 추가:
```
documentsAuthored Document[] @relation("DocumentAuthor")
commentsAuthored  Comment[]  @relation("CommentAuthor")
documentUpdates   DocumentUpdateLog[]
```

**참고**: `ModuleInstance` 모델 (L97~129) 에 다음 역참조 1개 추가:
```
board Board?
```

### 3.2 Migration

```
pnpm --filter @rhymix-ts/db prisma migrate dev --name add_content_foundation_models
```

migration SQL 끝부분에 raw SQL 직접 append (Prisma 가 `Unsupported("tsvector")` 컬럼을 빈 컬럼으로 만들면 그 위에 ALTER 로 GENERATED 표현 덧붙임):

```sql
-- FTS column (overrides Prisma's plain tsvector? with generated)
ALTER TABLE "documents" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "documents"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("contentText", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS "documents_search_vector_idx"
  ON "documents" USING GIN ("searchVector");
```

migration 적용 후 `prisma db pull` 로 검증하지 않는다 (생성형 컬럼은 round-trip 깨짐). 대신 `pnpm --filter @rhymix-ts/db prisma generate` 만 실행.

### 3.3 `packages/board` 패키지 신설

**`packages/board/package.json`**:
```json
{
  "name": "@rhymix-ts/board",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@rhymix-ts/core": "workspace:*",
    "@rhymix-ts/db": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "*",
    "typescript": "*",
    "vitest": "*"
  }
}
```

**`packages/board/tsconfig.json`**: monorepo extends pattern (ADMIN-001 의 `packages/core/tsconfig.json` 과 동일 형식).

**`packages/board/src/config.ts`** — `BoardConfig` Zod 스키마:

```ts
import { z } from 'zod';

export const BoardConfigSchema = z.object({
  skin: z.string().nullable().default(null),
  layoutId: z.number().int().nullable().default(null),
  mobileSkin: z.string().nullable().default(null),
  mobileLayoutId: z.number().int().nullable().default(null),
  listCount: z.number().int().min(1).max(200).default(20),
  pageCount: z.number().int().min(1).max(50).default(10),
  orderTarget: z.enum(['list_order', 'update_order']).default('list_order'),
  exceptNotice: z.boolean().default(false),
  consultation: z.boolean().default(false),
  useAnonymous: z.boolean().default(false),
  updateLog: z.boolean().default(false),
  trashUse: z.boolean().default(true),
  useCategory: z.boolean().default(false),
  documentLengthLimit: z.number().int().min(1024).default(1_048_576),
  commentLengthLimit: z.number().int().min(256).default(131_072),
});

export type BoardConfig = z.infer<typeof BoardConfigSchema>;
export const defaultBoardConfig: BoardConfig = BoardConfigSchema.parse({});
```

권한 매트릭스 (`permissions Json`) 는 Slice A 의 `BoardConfig` 스코프 밖 — `Board.permissions` 컬럼에 직접 저장되고 ModuleConfig.config 에는 포함하지 않는다 (이중 source of truth 회피).

**`packages/board/src/on-install.ts`** — `onInstall` 훅:

```ts
import type { ModuleLifecycleContext } from '@rhymix-ts/core/modules';
import { defaultBoardConfig } from './config';

export async function onInstallBoard(ctx: ModuleLifecycleContext): Promise<void> {
  await ctx.tx.board.create({
    data: {
      moduleInstanceId: ctx.instance.id,
      name: ctx.instance.name,
      // BoardConfig 기본값을 컬럼에 펼침
      skin: defaultBoardConfig.skin,
      layoutId: defaultBoardConfig.layoutId,
      mobileSkin: defaultBoardConfig.mobileSkin,
      mobileLayoutId: defaultBoardConfig.mobileLayoutId,
      listCount: defaultBoardConfig.listCount,
      pageCount: defaultBoardConfig.pageCount,
      orderTarget: defaultBoardConfig.orderTarget,
      exceptNotice: defaultBoardConfig.exceptNotice,
      consultation: defaultBoardConfig.consultation,
      useAnonymous: defaultBoardConfig.useAnonymous,
      updateLog: defaultBoardConfig.updateLog,
      trashUse: defaultBoardConfig.trashUse,
      useCategory: defaultBoardConfig.useCategory,
      documentLengthLimit: defaultBoardConfig.documentLengthLimit,
      commentLengthLimit: defaultBoardConfig.commentLengthLimit,
      // permissions, useStatus 는 모델 default 사용
    },
  });
}
```

**`packages/board/src/routes/index-page.tsx`** — placeholder Server Component:

```tsx
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules';

// @MX:NOTE [AUTO]: Slice A placeholder. Slice B 에서 listDocuments + 게시판 목록 UI 로 교체.
export async function BoardIndexPage(props: ModuleRoutePageProps) {
  return (
    <main>
      <h1>{props.instance.name}</h1>
      <p>board mid={props.instance.mid} (Slice A placeholder)</p>
    </main>
  );
}
```

**`packages/board/src/index.ts`** — board 모듈 정의:

```ts
import type { ModuleDefinition } from '@rhymix-ts/core/modules';
import { BoardConfigSchema, defaultBoardConfig, type BoardConfig } from './config';
import { onInstallBoard } from './on-install';
import { BoardIndexPage } from './routes/index-page';

// @MX:ANCHOR [AUTO]: board 모듈의 단일 진입점.
// @MX:REASON: getModule('board'), [mid]/page.tsx, admin.module.create 가 모두 이 정의를 참조한다.
// @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
export const boardModule: ModuleDefinition<BoardConfig> = {
  code: 'board',
  displayName: 'Board',
  description: '게시판 — 글쓰기, 댓글, 첨부, 카테고리, 검색을 지원하는 표준 모듈',
  configSchema: BoardConfigSchema,
  defaultConfig: defaultBoardConfig,
  onInstall: onInstallBoard,
  routes: {
    index: BoardIndexPage,
  },
  cacheTags: (instanceId) => [
    `board:${instanceId}`,
    `documents:board:${instanceId}`,
  ],
};
```

**`packages/board/src/document.ts`** — 도메인 함수 3개 (REQ-CONTENT-001 의 minimum viable kernel):

```ts
import { z } from 'zod';
import type { PrismaClient, Document, DocumentStatus } from '@prisma/client';

const CreateDocumentSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  authorId: z.number().int().positive().nullable(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  nickName: z.string().min(1).max(80).nullable().default(null),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export async function createDocument(
  input: CreateDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<Document> {
  const parsed = CreateDocumentSchema.parse(input);
  const board = await ctx.prisma.board.findUniqueOrThrow({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });
  return ctx.prisma.document.create({
    data: {
      boardId: board.id,
      authorId: parsed.authorId,
      nickName: parsed.nickName,
      title: parsed.title,
      content: parsed.content,
      contentText: parsed.content, // Slice A: HTML sanitize 미적용, content == contentText
      status: 'TEMP',
    },
  });
}

const ListDocumentsSchema = z.object({
  moduleInstanceId: z.number().int().positive(),
  status: z.enum(['PUBLIC', 'SECRET', 'TEMP']).default('PUBLIC'),
});

export async function listDocuments(
  input: z.infer<typeof ListDocumentsSchema>,
  ctx: { prisma: PrismaClient },
): Promise<Document[]> {
  const parsed = ListDocumentsSchema.parse(input);
  const board = await ctx.prisma.board.findUnique({
    where: { moduleInstanceId: parsed.moduleInstanceId },
  });
  if (!board) return [];
  return ctx.prisma.document.findMany({
    where: { boardId: board.id, status: parsed.status, deletedAt: null },
    orderBy: { regdate: 'desc' },
    take: 20,
  });
}

export async function getDocument(
  id: number,
  ctx: { prisma: PrismaClient },
): Promise<Document & { author: { id: number; userId: string; nickName: string } | null }> {
  return ctx.prisma.document.findUniqueOrThrow({
    where: { id },
    include: {
      author: { select: { id: true, userId: true, nickName: true } },
    },
  });
}
```

### 3.4 `ModuleRouteMap.index` 타입 확장 (`packages/core/src/modules/types.ts`)

기존 L31~38 의 `ModuleRouteMap` 와 그 위 import 를 다음과 같이 교체:

```ts
import type { ReactNode } from 'react';
// ... 기존 import 유지

export interface ModuleRoutePageProps {
  instance: ModuleInstance & { config: ModuleConfig | null };
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
}

export type ModuleRouteIndex =
  (props: ModuleRoutePageProps) => Promise<ReactNode> | ReactNode;

export interface ModuleRouteMap {
  /** GET /[mid] — 모듈 인스턴스의 인덱스 페이지 */
  index?: ModuleRouteIndex;
  /** GET /[mid]/[...slug] — 모듈 내부 라우트 */
  catchAll?: ModuleRouteIndex;
  /** Server Actions / API endpoints (Slice B+ 에서 별도 타입화) */
  actions?: Record<string, unknown>;
}

// 기존 ModuleConfig 임포트가 없으면 추가
import type { ModuleConfig } from '@prisma/client';
```

기존 `unknown` 타입을 받던 코드 (`adminPages` 등) 는 그대로 둔다. `packages/core` 가 react peer dependency 를 갖지 않도록 `import type { ReactNode }` 만 사용. `package.json` 의 `devDependencies` 에 `@types/react` 가 없으면 추가 (확률 높지만 확인 필요).

### 3.5 모듈 등록 부트스트랩 (`apps/web/lib/modules/register.ts`)

```ts
import { registerModule, DuplicateModuleError } from '@rhymix-ts/core/modules';
import { boardModule } from '@rhymix-ts/board';

// @MX:NOTE [AUTO]: HMR-safe singleton. Next.js dev 모드에서 모듈이 reload 되어도 한 번만 등록.
let initialized = false;

export function initModules(): void {
  if (initialized) return;
  try {
    registerModule(boardModule);
  } catch (err) {
    if (err instanceof DuplicateModuleError) {
      // HMR reload — already registered. Safe to ignore.
    } else {
      throw err;
    }
  }
  initialized = true;
}
```

**`apps/web/instrumentation.ts`** — Next.js 16 instrumentation hook:

```ts
// Next.js 가 서버 시작 시 한 번 호출 (Edge / Node 양쪽).
// HMR 에서도 process 가 살아있는 한 module-scope 캐시는 유지된다.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initModules } = await import('./lib/modules/register');
    initModules();
  }
}
```

기존 `instrumentation.ts` 가 이미 존재하면 `register()` 함수 안에 위 dynamic import 만 추가하고, 없으면 신규 생성. Edge runtime 에서는 prisma 사용 불가하므로 nodejs 분기만.

`apps/web/package.json` 의 `dependencies` 에 `@rhymix-ts/board: workspace:*` 추가.

**pnpm-workspace.yaml** 은 이미 `packages/*` 를 포함하고 있을 것으로 추정 — `packages/board` 자동 인식됨. 확인 후 누락 시 추가.

### 3.6 영향받지 않는 파일

- `apps/web/app/[mid]/page.tsx` 는 **Slice A 에서 건드리지 않는다**. ModuleRouteMap.index 위임 교체는 Slice B 의 범위. 기존 `@MX:TODO` 태그 유지.
- ADMIN-001 의 `createModuleInstance`, `registerModule`, `module-instance-service.ts` 는 변경 없음. 기존 인터페이스 그대로 사용.
- `apps/web/server/api/routers/admin/*` 는 변경 없음. board 모듈 등록만 부트스트랩 단에서.

---

## 4. TDD 테스트 시나리오 (12개)

### `packages/board/src/index.test.ts` (5개)

- **A-1** `boardModule.code === 'board'`, `displayName === 'Board'`.
- **A-2** `boardModule.configSchema.parse(defaultBoardConfig)` 가 throw 없이 동일 객체 반환.
- **A-3** `boardModule.configSchema.parse({ orderTarget: 'invalid' })` → `ZodError` 던짐.
- **A-4** `boardModule.cacheTags(42)` → `['board:42', 'documents:board:42']`.
- **A-5** `boardModule.routes.index` 가 정의되어 있고, 호출 시 `instance.name` 을 포함한 ReactNode 를 반환 (jsdom 또는 string match).

### `packages/board/src/on-install.test.ts` (3개) — Prisma testcontainers 또는 vitest mock

ADMIN-001 의 service 테스트 패턴 (`packages/core/src/modules/module-instance-service.test.ts` 추정) 을 따른다. Prisma client mock 가 이미 있다면 재사용, 없으면 vitest-mock-extended 로 `tx.board.create` 만 mock.

- **A-6** `onInstallBoard({ tx, instance, actor })` 호출 시 `tx.board.create` 가 `{ data: { moduleInstanceId: instance.id, name: instance.name, ...defaultBoardConfig 의 펼친 필드 } }` 로 정확히 1회 호출됨.
- **A-7** `tx.board.create` 가 throw 하면 `onInstallBoard` 가 그 에러를 propagate (swallow 금지).
- **A-8** `createModuleInstance({ moduleCode: 'board', ... })` 통합 — registerModule(boardModule) 후 createModuleInstance 호출 시 ModuleInstance + ModuleConfig + Board 3개 row 가 같은 트랜잭션 안에서 생성. `tx.board.create` mock 이 throw 하면 ModuleInstance / ModuleConfig 도 0건 (롤백).

### `packages/board/src/document.test.ts` (4개)

- **A-9** `createDocument({ moduleInstanceId: existingId, authorId: 1, title: 'hi', content: '<p>x</p>' })` → Document row 생성, `status === 'TEMP'`, `boardId` 가 해당 인스턴스의 Board.id 와 일치, `contentText` 가 content 와 동일.
- **A-10** `createDocument({ ..., title: '' })` → Zod 검증 실패 (`ZodError`).
- **A-11** `listDocuments({ moduleInstanceId: x, status: 'PUBLIC' })` 가 `deletedAt: null` + `status: 'PUBLIC'` 필터, regdate desc, limit 20 으로 호출됨. Board 없으면 `[]` 반환.
- **A-12** `getDocument(id)` → Document + `author: { id, userId, nickName }` 셀렉트 포함. 존재하지 않으면 `NotFoundError` (Prisma `findUniqueOrThrow`).

**테스트 인프라**:
- Prisma client mock: ADMIN-001 의 기존 mock 패턴 재사용. 없으면 `vitest-mock-extended` (이미 monorepo 에 있을 가능성 높음 — 확인 필요. 없으면 `packages/board/package.json` 의 devDependencies 에 추가).
- A-9, A-11, A-12 는 실제 Prisma migration 적용된 testcontainers PostgreSQL 가 있으면 통합 테스트, 없으면 mock. ADMIN-001 의 admin router 테스트가 어떤 패턴인지 (`apps/web/server/api/routers/admin/log.test.ts` 등) 확인 후 일치시킨다.

**예상 신규 테스트 수**: 12개. 533 tests → 545 tests after Slice A.

---

## 5. 우선순위와 작업 순서

### Priority High (PR 차단 요소)
1. Prisma schema 변경 + migration 생성 + raw SQL FTS block.
2. `packages/board/src/index.ts` + `config.ts` + `on-install.ts` — boardModule 정의.
3. `ModuleRouteMap.index` 타입 구체화 (`packages/core/src/modules/types.ts`).
4. `apps/web/lib/modules/register.ts` + instrumentation hook.
5. TDD 테스트 12개 (RED 작성 → GREEN 구현 순서로).

### Priority Medium (Slice 내 완결성)
6. `packages/board/src/document.ts` 의 3개 도메인 함수.
7. `User`, `ModuleInstance` 모델에 역참조 relation 추가.
8. `packages/board/package.json` + tsconfig + pnpm-workspace.yaml 확인.

### Priority Low (선택적)
9. JSDoc + @MX:ANCHOR/@MX:NOTE 태그 추가 (boardModule, ModuleRouteMap, register.ts).
10. spec.md 의 HISTORY 섹션에 Slice A 진행 기록 1줄 추가.

### 단계 순서 (RED → GREEN → REFACTOR)

**Step 1**: schema.prisma 변경 + `prisma migrate dev` 실행. 생성된 SQL 끝에 FTS raw block 수동 append. `prisma generate` 후 `pnpm build` 로 타입 에러 0 확인.

**Step 2**: `packages/core/src/modules/types.ts` 의 `ModuleRouteMap` 타입 확장. 기존 코드에서 `unknown` 받던 곳이 깨지면 그 자리에서 cast 또는 type-narrow.

**Step 3**: `packages/board` 패키지 부트스트랩 (package.json, tsconfig, src 디렉터리). `pnpm install` 로 workspace link.

**Step 4 (RED)**: A-1 ~ A-5 (정의 5개) 테스트 작성, 모두 fail 확인.

**Step 5 (GREEN)**: `config.ts`, `on-install.ts`, `routes/index-page.tsx`, `index.ts` 구현 → A-1 ~ A-5 pass.

**Step 6 (RED)**: A-6 ~ A-8 (onInstall + 통합) 테스트 작성, fail.

**Step 7 (GREEN)**: ADMIN-001 의 createModuleInstance mock 재사용 + onInstall 호출 흐름 검증 → pass.

**Step 8 (RED)**: A-9 ~ A-12 (Document 도메인) 테스트 작성, fail.

**Step 9 (GREEN)**: `document.ts` 구현 → pass.

**Step 10**: `apps/web/lib/modules/register.ts` + `instrumentation.ts` 작성. dev 서버 띄워 HMR 에서 `DuplicateModuleError` 가 swallow 되는지 수동 확인.

**Step 11 (REFACTOR)**: 중복 제거, JSDoc 정리, @MX 태그 추가. 전체 테스트 (`pnpm -r test`) 재실행 — 545 tests pass 확인.

**Step 12**: `pnpm -r build` + `pnpm -r typecheck` + lint. 모두 green 이면 commit.

---

## 6. 위험 및 완화책

| 위험 | 발생 가능성 | 영향 | 완화책 |
|------|-------------|------|--------|
| Prisma `Unsupported("tsvector")` 가 migration generate 시 ALTER TABLE 으로 plain `tsvector` 컬럼을 만들고, 수동 GENERATED 추가가 conflict | 중 | 중 | migration SQL 에서 먼저 `DROP COLUMN IF EXISTS "searchVector"` 후 `ADD COLUMN ... GENERATED ALWAYS AS ... STORED` — Step 1 의 raw SQL 블록 참조. |
| `@types/react` 가 packages/core 에 없어서 `ReactNode` import 가 안 됨 | 중 | 저 | `packages/core/package.json` 의 devDependencies 에 `@types/react` 추가 (peer 가 아닌 dev). React 자체는 runtime dep 으로 들이지 않음. |
| HMR 에서 module-scope `initialized` flag 가 reset 되어 매 reload 마다 `DuplicateModuleError` swallow 가 일어남 (warn log spam) | 중 | 저 | `console.warn` 대신 silent swallow. `initialized = true` 가 `try` 블록 밖이라 throw 발생해도 idempotent. |
| spec.md 의 `Board.id String cuid` 와 본 Slice 의 `Int autoincrement` deviation 이 Slice B 의 tRPC 라우터 타입과 충돌 | 저 | 중 | spec.md HISTORY 에 deviation 명시 + ADMIN-001 의 User.id 와 동일 정책임을 주석에 기록. |
| ADMIN-001 의 `createModuleInstance` 가 `onInstall` 안에서 `tx.board.create` 를 호출하지만 board 가 ModuleInstance 의 외래 키이므로 ModuleInstance row 가 아직 commit 안 됨 → FK 위반 | 중 | 중 | Prisma 의 `$transaction` 내부에서는 ModuleInstance.create 가 SQL 단계에서는 이미 INSERT 된 상태 (커밋만 안 됨). 같은 트랜잭션 안의 후속 INSERT 는 FK 참조 가능. ADMIN-001 의 ModuleConfig 생성이 같은 패턴이므로 검증됨. |
| `Document.boardId Int` FK (Board.id 참조) 와 spec.md 의 `boardId String` 차이 — Slice B 에서 tRPC 입력이 cuid string 으로 잘못 가는 경우 | 저 | 저 | Slice A 의 도메인 함수 (`createDocument`) 는 `moduleInstanceId` 만 받고 내부에서 `board.findUnique({ where: { moduleInstanceId } })` 로 `board.id` 를 얻음 — 외부는 항상 moduleInstanceId 만 노출. |
| `pnpm-workspace.yaml` 에 `packages/*` glob 가 없어서 board 패키지가 install 안 됨 | 저 | 중 | Step 3 에서 명시적 확인. 누락 시 추가. |

---

## 7. @MX 태그 후보

| 위치 | 태그 | 사유 |
|------|------|------|
| `packages/board/src/index.ts` 의 `boardModule` | `@MX:ANCHOR` | fan_in: registerModule + createModuleInstance + [mid]/page.tsx (Slice B) + admin.module.create + lib/modules/register.ts — 5개 호출 지점. SPEC-CONTENT-001 REQ-CONTENT-001 의 진입점. |
| `packages/core/src/modules/types.ts` 의 `ModuleRouteMap` | `@MX:NOTE` | Slice B 에서 actions 타입 구체화 예정. index/catchAll 시그니처 변경 주의. |
| `apps/web/lib/modules/register.ts` 의 `initModules` | `@MX:NOTE` | HMR-safe singleton. `initialized` flag 의 module-scope semantics 가 Next.js 의 process 모델에 의존. |
| `packages/board/src/on-install.ts` 의 `onInstallBoard` | `@MX:WARN` | 후보 — `tx.board.create` 가 ModuleInstance commit 전에 실행됨. 같은 트랜잭션 안에서만 안전. `@MX:REASON: 외부 tx 컨텍스트 밖에서 호출 금지` 첨부. |
| `apps/web/instrumentation.ts` 의 `register` | `@MX:NOTE` | Edge runtime 분기 주의. Prisma 는 nodejs 전용. |

`@MX:ANCHOR` 와 `@MX:WARN` 은 `@MX:REASON` sub-line 필수.

---

## 8. Heads-up for Slice B

Slice A 완료 후 Slice B 에서 다음을 진행:

1. **`apps/web/app/[mid]/page.tsx`** 의 placeholder 를 `def.routes.index(props)` 위임으로 교체:
   ```tsx
   const def = getModule(instance.moduleCode);
   if (!def.routes.index) notFound();
   return def.routes.index({ instance, params, searchParams });
   ```
   기존 `@MX:TODO` 태그 제거.

2. **`packages/board/src/routes/index-page.tsx`** 를 실제 게시판 목록 페이지로 교체 — `listDocuments` 호출 + DocumentList 컴포넌트 렌더.

3. **tRPC 라우터** `apps/web/server/api/routers/board/document.ts` 추가:
   - `list` (query)
   - `byId` (query)
   - `create` (mutation, also as Server Action)
   - `update` (mutation)
   - `delete` (mutation, soft delete)

4. **글쓰기 페이지** `apps/web/app/[mid]/write/page.tsx` — Server Action 기반 폼.

5. **Comment 도메인 + tRPC** — `packages/board/src/comment.ts` + `apps/web/server/api/routers/board/comment.ts`.

6. **FTS tsquery 검색 함수** — `prisma.$queryRaw<Document[]>\`SELECT * FROM documents WHERE search_vector @@ to_tsquery('simple', ${query}) ORDER BY ts_rank(search_vector, ...) DESC\`\``.

7. **XSS sanitization** — content 저장 전 `sanitize-html` 또는 `DOMPurify` 적용. REQ-CONTENT-130/131.

8. **권한 매트릭스 평가** — `Board.permissions` JSON 을 사용자 그룹과 비교하는 checker 함수. REQ-CONTENT-070.

9. **Trash retention** — soft delete 시 `Trash` row 생성, `expiresAt = now() + 30 days`. cron 또는 admin 작업으로 영구 삭제.

10. **FileAttachment presigned upload** — S3 presign + virus scan flag. REQ-CONTENT-080.

Slice A 의 `BoardConfigSchema` 는 Slice B 에서 admin UI 의 board 설정 폼과 직접 연결된다 (Zod → react-hook-form).

---

## 9. 완료 정의 (DoD)

- [ ] `pnpm --filter @rhymix-ts/db prisma migrate dev --name add_content_foundation_models` 성공.
- [ ] migration SQL 에 FTS GENERATED 컬럼 + GIN index raw block 포함.
- [ ] `pnpm -r typecheck` 0 errors.
- [ ] `pnpm -r build` green.
- [ ] `pnpm -r test` 545 tests pass (533 + 12).
- [ ] `packages/board` 패키지가 pnpm-workspace 에 인식됨 (`pnpm list @rhymix-ts/board` 출력 확인).
- [ ] `apps/web/instrumentation.ts` 가 dev 서버 부팅 시 `initModules()` 호출 — 로그로 1회 등록 확인.
- [ ] dev 서버에서 admin UI 의 module 추가 다이얼로그에 'board' 옵션이 노출됨 (수동 smoke; Slice E의 admin.moduleDefinition.list 가 registry 를 읽는다면).
- [ ] `git diff --stat main..HEAD` 로 변경 범위 확인 — Document/Comment 등의 tRPC 라우터, UI 페이지는 변경 없음.
- [ ] @MX:ANCHOR + @MX:WARN 태그에 `@MX:REASON` sub-line 포함됨.
- [ ] 새 SQL migration 의 down 경로 (`prisma migrate reset`) 가 깨끗하게 동작함 (수동 검증).

---

## 10. 커밋 메시지 (예상)

```
feat(content): SPEC-CONTENT-001 Slice A — Foundation 스키마 + board ModuleDefinition TDD 완결

- Prisma: Board / Document / Comment / FileAttachment / DocumentCategory /
  DocumentExtraKey / DocumentUpdateLog / DocumentVote / DocumentReport / Trash
  10개 모델 + 4개 enum + FTS GENERATED tsvector 컬럼 + GIN index
- @rhymix-ts/board 패키지 신설: ModuleDefinition<BoardConfig> + onInstall +
  routes.index placeholder + createDocument/listDocuments/getDocument 3개 도메인 함수
- ModuleRouteMap.index 타입을 (props: ModuleRoutePageProps) => Promise<ReactNode> 로 구체화
- apps/web/instrumentation.ts + lib/modules/register.ts: HMR-safe singleton 부트스트랩
- TDD 12개 신규 (533 → 545 tests, 모두 pass)
- Slice B 진입점: [mid]/page.tsx → def.routes.index 위임 교체 예정 (@MX:TODO 유지)

REQ-CONTENT-001 (board 모듈 정의)
REQ-CONTENT-010 (Document foundation)
REQ-CONTENT-020 (Document author/anonymous 컬럼 준비)
```

---

**Plan version**: 1.0
**Author**: manager-spec (SPEC-CONTENT-001 Slice A)
**Date**: 2026-05-17
**Base SHA**: 8956175
