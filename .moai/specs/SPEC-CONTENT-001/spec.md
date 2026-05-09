---
id: SPEC-CONTENT-001
title: Content & Board System
status: draft
priority: P0
created: 2026-05-10
domain: content
related: [SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-THEME-001]
---

# SPEC-CONTENT-001: Content & Board System

## Overview

본 SPEC은 Rhymix CMS의 핵심 기능인 게시판(Board), 문서(Document), 댓글(Comment), 첨부파일(File), 카테고리(Category), 태그(Tag), 검색(Search) 시스템을 Next.js 16 + PostgreSQL + Prisma 기반으로 그린필드(greenfield) 재설계한다.

레거시 Rhymix는 XE 기반 PHP/MySQL 위에서 `documents`, `comments`, `document_categories`, `document_extra_vars` 등 강하게 결합된 테이블 구조와 `extra_vars`라는 KV 기반 동적 필드 시스템을 통해 게시판마다 다른 스키마를 지원해왔다. 본 시스템은 이러한 도메인 의미는 보존하되, 다음과 같은 현대화를 적용한다.

핵심 현대화 원칙:

- **타입 안정성**: TypeScript 5.9+ + Prisma + Zod로 컴파일 타임 검증
- **JSONB + GIN**: 동적 필드(`extra_vars`)와 태그를 PostgreSQL JSONB로 저장하고 GIN 인덱스로 검색 최적화
- **Postgres FTS**: `tsvector` + `to_tsquery`로 full-text search 1차 구현 (Meilisearch는 향후 옵션)
- **App Router + tRPC**: Server Components 중심 + tRPC 라우터로 type-safe API
- **Server Actions**: 폼 제출(글쓰기, 댓글, 투표 등)은 Server Action으로 RSC 패턴 활용
- **Auth.js v5 통합**: 권한 매트릭스(per-board × group × action)는 SPEC-AUTH-001에서 제공하는 세션과 통합

비즈니스 가치:

- 운영자는 게시판마다 스킨/레이아웃/카테고리/필드/권한을 독립적으로 구성
- 작성자는 비밀글, 비밀댓글, 임시저장, 수정 이력, 첨부파일, 카테고리 분류, 태그를 활용
- 독자는 카테고리/태그/전문 검색/필터링/정렬을 통해 콘텐츠 탐색
- 관리자는 휴지통(Trash), 신고(Declare), 수정 이력으로 안전한 운영

## User Stories

### US-CONTENT-001: 게시판 생성 및 구성
관리자로서, 모듈 인스턴스 단위로 게시판을 생성하고 스킨/레이아웃/표시 옵션/제한/권한을 독립 구성하여, 사이트 내 다양한 목적의 게시판(공지, Q&A, 자료실 등)을 운영할 수 있어야 한다.

### US-CONTENT-002: 문서 작성/수정/삭제 (CRUD)
회원 또는 비회원으로서, 권한이 부여된 게시판에 제목/본문/카테고리/태그/첨부파일을 포함한 문서를 작성/수정/삭제할 수 있어야 하며, 보호 옵션(`protect_update_content`)이 활성화된 경우 댓글이 달린 후 본문 수정이 제한되어야 한다.

### US-CONTENT-003: 댓글 스레드 (Threading)
사용자로서, 문서에 댓글을 달고, 다른 댓글에 대댓글을 작성하여 인접 리스트(adjacency list) 구조의 트리 형태 토론을 형성할 수 있어야 하며, `list_order`로 시간순 정렬이 보장되어야 한다.

### US-CONTENT-004: 비밀글/비밀댓글
작성자로서, 문서/댓글을 비밀(SECRET) 상태로 저장하거나 비밀번호로 보호하여, 작성자/관리자/올바른 비밀번호 보유자만 열람 가능하도록 제한할 수 있어야 한다.

### US-CONTENT-005: 첨부파일 업로드
작성자로서, 문서/댓글에 이미지/동영상/일반 파일을 첨부하고, 본문 내 이미지 미리보기/직접 다운로드/커버 이미지 지정을 활용할 수 있어야 한다.

### US-CONTENT-006: 카테고리 트리
관리자로서, 계층형(parent-child) 카테고리 트리를 정의하고, 게시판 내 문서를 카테고리로 분류하며, 카테고리별 권한(group_srls)을 부여할 수 있어야 한다.

### US-CONTENT-007: 태그
작성자로서, 문서에 자유로운 태그를 부여하고, 독자는 태그를 클릭하여 동일 태그가 부착된 문서 목록을 조회할 수 있어야 한다.

### US-CONTENT-008: 전문 검색 (Full-Text Search)
독자로서, 제목/본문/작성자/태그/IP/기간/카운트 범위를 조합한 검색 쿼리를 수행하고, 정렬(list_order/update_order, asc/desc) 및 상태 필터링(PUBLIC/SECRET/TEMP)을 적용할 수 있어야 한다.

### US-CONTENT-009: 공지(Notice) 고정
관리자로서, 특정 문서를 공지로 지정하면 게시판 목록 상단에 항상 고정 노출되며, 일반 문서 정렬과 분리되어야 한다.

### US-CONTENT-010: 추천/비추천/신고 (Vote/Blame/Declare)
회원으로서, 문서 또는 댓글을 추천/비추천하거나 신고할 수 있어야 하며, 동일 사용자의 중복 투표는 차단되고 감사 로그(audit log)가 유지되어야 한다.

### US-CONTENT-011: 휴지통 (Soft Delete)
관리자로서, 삭제된 문서를 즉시 영구 삭제하지 않고 휴지통에 보관(soft delete)하며, 일정 기간 내 복구 가능하도록 운영할 수 있어야 한다.

### US-CONTENT-012: 수정 이력 (Update Log)
작성자/관리자로서, 문서가 수정될 때마다 이전 버전을 보관하고 변경 내역을 조회할 수 있어야 한다(`update_log` 옵션 활성화 시).

### US-CONTENT-013: 게시판별 커스텀 필드
관리자로서, 게시판마다 다른 추가 필드(예: 가격, 이벤트 일자, 별점)를 정의(`extra_keys`)하고, 작성자는 해당 필드 값(`extra_vars`)을 입력하며, 독자는 해당 필드로 검색/정렬할 수 있어야 한다.

### US-CONTENT-014: 임시저장 (Draft / TEMP)
작성자로서, 작성 중인 문서를 임시저장(TEMP) 상태로 보관하여 나중에 이어서 작성할 수 있어야 하며, 본인만 접근 가능해야 한다.

### US-CONTENT-015: 모바일/데스크탑 분리 스킨
관리자로서, 데스크탑 스킨(`skin`, `layout_srl`)과 모바일 스킨(`mskin`, `mlayout_srl`)을 독립 설정하여 디바이스별 최적 UI를 제공할 수 있어야 한다.

## EARS Requirements

### Board Configuration

**REQ-CONTENT-001 (Ubiquitous)**: The system shall persist each board as a unique module instance with independent configuration including skin, layout, list_count, page_count, order_target, except_notice, and feature flags (consultation, use_anonymous, update_log, trash_use, use_status, use_category).

**REQ-CONTENT-002 (Ubiquitous)**: The system shall enforce per-board document length limit (default 1024KB) and comment length limit (default 128KB) at validation time.

**REQ-CONTENT-003 (Event-Driven)**: WHEN an admin creates a new board THEN the system shall initialize default permissions (list, view, write_document, write_comment, vote_log_view, update_view, consultation_read) mapping each action to one or more user groups.

**REQ-CONTENT-004 (State-Driven)**: WHILE `protect_update_content` is enabled AND a document has at least one comment, the system shall reject content modification attempts by non-admin users.

### Document Lifecycle

**REQ-CONTENT-010 (Event-Driven)**: WHEN a user submits a document creation request THEN the system shall validate authorization, sanitize HTML content (XSS), enforce length limit, persist the document with status (PUBLIC/TEMP/SECRET), and emit a `document.created` event.

**REQ-CONTENT-011 (Event-Driven)**: WHEN a document is updated THEN the system shall record the previous content into `DocumentUpdateLog` IF `update_log` is enabled for the board.

**REQ-CONTENT-012 (Event-Driven)**: WHEN a document is deleted AND `trash_use` is enabled THEN the system shall move the document to the `Trash` table (soft delete) preserving all relations.

**REQ-CONTENT-013 (State-Driven)**: IF a document status is TEMP THEN the system shall make the document accessible only to the original author and administrators.

**REQ-CONTENT-014 (State-Driven)**: IF a document is password-protected THEN the system shall require correct password for viewing, with rate limiting (5 attempts per 10 minutes per IP).

**REQ-CONTENT-015 (Unwanted)**: The system shall not allow non-author non-admin users to view documents whose status is SECRET unless they possess valid authorization.

**REQ-CONTENT-016 (Event-Driven)**: WHEN `is_notice` is set to `Y` for a document THEN the system shall pin the document to the top of the board listing regardless of `list_order` sorting.

### Comment Threading

**REQ-CONTENT-020 (Ubiquitous)**: The system shall store comments in an adjacency-list structure where `parent_id = 0` indicates a top-level comment and `parent_id > 0` indicates a reply pointing to the parent comment.

**REQ-CONTENT-021 (Optional)**: WHERE comment depth exceeds 5 levels, the system shall provide an optional materialized path (`path` ltree column) for efficient subtree retrieval.

**REQ-CONTENT-022 (Event-Driven)**: WHEN a comment is created THEN the system shall increment the parent document's `comment_count` atomically.

**REQ-CONTENT-023 (State-Driven)**: IF a comment's `is_secret` flag is true THEN the system shall restrict visibility to the comment author, document author, and administrators.

**REQ-CONTENT-024 (State-Driven)**: WHILE `comment_status` of a document is DISABLE, the system shall reject new comment submissions.

### File Attachments

**REQ-CONTENT-030 (Event-Driven)**: WHEN a file is uploaded THEN the system shall validate MIME type allowlist, enforce per-file size limit, store the file in S3-compatible storage, and persist metadata (source_filename, uploaded_filename, file_size, mime_type, width, height, duration) in `FileAttachment`.

**REQ-CONTENT-031 (Event-Driven)**: WHEN a file upload completes THEN the system shall invoke a virus scan hook (pluggable interface; ClamAV adapter as default) and mark the file as `isvalid = false` upon detection.

**REQ-CONTENT-032 (Ubiquitous)**: The system shall associate each file with `upload_target_srl` and `upload_target_type` (DOCUMENT or COMMENT) to support attachments on both entities.

**REQ-CONTENT-033 (Event-Driven)**: WHEN `direct_download` is enabled for a file THEN the system shall serve a forced `Content-Disposition: attachment` response and increment `download_count`.

**REQ-CONTENT-034 (Optional)**: WHERE the attachment is an image, the system shall optionally allow designating it as `cover_image` for the parent document.

### Categorization

**REQ-CONTENT-040 (Ubiquitous)**: The system shall persist categories as a hierarchical tree with `parent_id` self-reference, supporting unlimited depth with a recommended max of 5 levels.

**REQ-CONTENT-041 (Event-Driven)**: WHEN a document is assigned to a category THEN the system shall increment the category's `document_count` atomically and propagate the count up the ancestor chain.

**REQ-CONTENT-042 (State-Driven)**: IF a category has `group_srls` configured THEN the system shall restrict document write access to members of those groups.

### Tags

**REQ-CONTENT-050 (Ubiquitous)**: The system shall store tags per document as a `text[]` array with a GIN index for efficient containment queries.

**REQ-CONTENT-051 (Event-Driven)**: WHEN a user clicks a tag THEN the system shall return all documents containing that tag, scoped to boards the user has read access to.

### Search

**REQ-CONTENT-060 (Ubiquitous)**: The system shall maintain a `tsvector` column (`search_vector`) on `Document` derived from `title` and `content`, updated via PostgreSQL trigger on insert/update.

**REQ-CONTENT-061 (Event-Driven)**: WHEN a search query is submitted THEN the system shall support combined filters: full-text (title/content via `tsvector`), user_id/nick_name/email (citext exact/prefix), tags (GIN), count ranges (readed_count, voted_count, comment_count), date ranges (regdate, last_update), and IP address.

**REQ-CONTENT-062 (Ubiquitous)**: The system shall support sorting by `list_order` or `update_order` in ascending or descending direction.

**REQ-CONTENT-063 (State-Driven)**: IF a custom field's `var_search` flag is true THEN the system shall include the field in the search predicate via JSONB containment (`extra_vars @> ...`) backed by GIN index.

**REQ-CONTENT-064 (Optional)**: WHERE the project scale exceeds 1M documents, the system shall optionally integrate Meilisearch as the primary search engine with PostgreSQL as fallback.

### Permissions Matrix

**REQ-CONTENT-070 (Ubiquitous)**: The system shall enforce a permission matrix of (board × group × action) where action ∈ {list, view, write_document, write_comment, vote, vote_log_view, update_view, consultation_read} resolved via Auth.js v5 session and Prisma middleware.

**REQ-CONTENT-071 (Unwanted)**: The system shall not allow any write or delete operation without re-validating the session at request time (no client-trusted authorization).

### Pagination & Sorting

**REQ-CONTENT-080 (Ubiquitous)**: The system shall paginate document listings using cursor-based pagination (preferred) or offset-based pagination, with default page size from `list_count` (default 20).

**REQ-CONTENT-081 (Ubiquitous)**: The system shall pre-render notice documents (where `is_notice = 'Y'`) above paginated regular documents on every page if `except_notice = false`, otherwise only on page 1.

### Voting / Blame / Declare

**REQ-CONTENT-090 (Event-Driven)**: WHEN a user submits a vote (up/down/blame) THEN the system shall enforce one-vote-per-user-per-target via unique constraint, atomically update the target's count, and persist an audit row in `DocumentVote`.

**REQ-CONTENT-091 (Event-Driven)**: WHEN a user reports a document or comment THEN the system shall persist a `DocumentReport` row with reason and notify moderators.

### Soft Delete & Restore

**REQ-CONTENT-100 (Event-Driven)**: WHEN a document is soft-deleted THEN the system shall move it to `Trash` retaining all relations (comments, files, votes), and an admin shall be able to restore it within the retention window (default 30 days).

**REQ-CONTENT-101 (Event-Driven)**: WHEN the retention window expires THEN a scheduled job shall purge trashed documents along with their attachments from storage.

### Edit History

**REQ-CONTENT-110 (Event-Driven)**: WHEN a document is updated AND `update_log` is enabled THEN the system shall append a `DocumentUpdateLog` row with the previous title, content, and editor identity.

### Custom Fields

**REQ-CONTENT-120 (Ubiquitous)**: The system shall persist board-specific field definitions in `DocumentExtraKey` (var_name, var_type, var_is_required, var_search, var_sort, var_options) and per-document values in `Document.extra_vars` (JSONB).

**REQ-CONTENT-121 (Event-Driven)**: WHEN a document is submitted THEN the system shall validate `extra_vars` against the board's `DocumentExtraKey` schema using a Zod schema generated at runtime.

### Rendering & XSS

**REQ-CONTENT-130 (Ubiquitous)**: The system shall render document content via a Tiptap or Lexical-based rich text editor on the client and store sanitized HTML on the server.

**REQ-CONTENT-131 (Unwanted)**: The system shall not store or render unsanitized HTML; all user-provided HTML shall pass through DOMPurify (server-side via `isomorphic-dompurify`) with an allowlist of tags and attributes.

### Rate Limiting

**REQ-CONTENT-140 (State-Driven)**: WHILE a user is unauthenticated, the system shall apply per-IP rate limits of 10 writes per hour to documents/comments.

**REQ-CONTENT-141 (Event-Driven)**: WHEN a user exceeds the rate limit THEN the system shall return HTTP 429 with `Retry-After` header.

## Acceptance Criteria

### AC-CONTENT-010 (REQ-CONTENT-010): Document creation
- **Given** an authenticated user with `write_document` permission on board `B`
- **When** the user submits a document with valid `title`, `content`, `category_id`, `tags[]`
- **Then** the system persists the document with status `PUBLIC`, returns `document_id`, increments `document_count` on the category, and emits a `document.created` event.

### AC-CONTENT-014 (REQ-CONTENT-014): Password-protected document
- **Given** a document with `password` set to a hashed value
- **When** an unauthorized user attempts to view it without the password
- **Then** the system returns HTTP 401 with a password prompt; after 5 incorrect attempts within 10 minutes, the IP is rate-limited.

### AC-CONTENT-020 (REQ-CONTENT-020): Comment threading
- **Given** a document `D` with top-level comment `C1` (parent_id = 0)
- **When** a user replies to `C1`
- **Then** the new comment has `parent_id = C1.id`, `list_order` is monotonically assigned, and the document's `comment_count` is incremented atomically.

### AC-CONTENT-030 (REQ-CONTENT-030): File upload
- **Given** an authenticated user uploading a 5MB PNG file
- **When** the upload completes
- **Then** the file is stored in S3, MIME type is verified as `image/png`, dimensions (width × height) are extracted, and a `FileAttachment` row is created with `isvalid = true`.

### AC-CONTENT-031 (REQ-CONTENT-031): Virus scan
- **Given** a virus scan hook is configured (ClamAV)
- **When** an EICAR test file is uploaded
- **Then** the file is marked `isvalid = false`, removed from public access, and an admin notification is emitted.

### AC-CONTENT-060 (REQ-CONTENT-060): Full-text search
- **Given** documents with diverse titles and content
- **When** a search query `"PostgreSQL tutorial"` is submitted
- **Then** the system returns documents ranked by `ts_rank` against `search_vector`, paginated, in ≤ 200ms p95.

### AC-CONTENT-063 (REQ-CONTENT-063): Custom field search
- **Given** a board with `DocumentExtraKey { var_name: "price", var_type: "number", var_search: true }`
- **When** a search filter `extra_vars.price BETWEEN 100 AND 500` is applied
- **Then** the query uses the GIN index on `extra_vars` and returns matching documents.

### AC-CONTENT-070 (REQ-CONTENT-070): Permission enforcement
- **Given** a user in group `G1` and a board where `write_document` is restricted to group `G2`
- **When** the user attempts to create a document
- **Then** the system returns HTTP 403 and logs the attempt.

### AC-CONTENT-090 (REQ-CONTENT-090): One-vote-per-user
- **Given** a user who has already voted up on document `D`
- **When** the user attempts to vote again
- **Then** the system rejects the duplicate vote (HTTP 409), and `voted_count` remains unchanged.

### AC-CONTENT-100 (REQ-CONTENT-100): Soft delete
- **Given** a document `D` with comments and files
- **When** an admin soft-deletes it
- **Then** `D` is moved to `Trash` with all relations preserved, and a `restore` API call within 30 days reinstates it.

### AC-CONTENT-110 (REQ-CONTENT-110): Edit history
- **Given** a board with `update_log = true`
- **When** an author edits a document's content
- **Then** a `DocumentUpdateLog` row is appended with the previous content and timestamp.

### AC-CONTENT-130 (REQ-CONTENT-130 / REQ-CONTENT-131): XSS sanitization
- **Given** a user submits content `<script>alert(1)</script><p>hello</p>`
- **When** the system stores and renders the content
- **Then** the `<script>` tag is removed, only `<p>hello</p>` is persisted, and rendering is safe.

### AC-CONTENT-140 (REQ-CONTENT-140): Rate limit
- **Given** an unauthenticated user submitting comments
- **When** the user exceeds 10 submissions in 1 hour
- **Then** subsequent submissions return HTTP 429 with `Retry-After` header.

## Domain Model

### Prisma Schema (excerpt)

```prisma
// =====================================================
// SPEC-CONTENT-001: Content & Board System
// =====================================================

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [citext, pg_trgm, ltree]
}

// ---------- Board (module instance) ----------
model Board {
  id                       String   @id @default(cuid())
  moduleSrl                BigInt   @unique // legacy mapping
  name                     String
  description              String?
  // Skins / Layouts
  skin                     String?
  layoutId                 String?
  mobileSkin               String?
  mobileLayoutId           String?
  // Display
  listCount                Int      @default(20)
  pageCount                Int      @default(10)
  orderTarget              String   @default("list_order") // list_order | update_order
  exceptNotice             Boolean  @default(false)
  // Features
  consultation             Boolean  @default(false)
  useAnonymous             Boolean  @default(false)
  updateLog                Boolean  @default(false)
  trashUse                 Boolean  @default(true)
  useStatus                String[] @default(["PUBLIC", "SECRET", "TEMP"])
  useCategory              Boolean  @default(false)
  // Limits (bytes)
  documentLengthLimit      Int      @default(1048576) // 1024 KB
  commentLengthLimit       Int      @default(131072)  // 128 KB
  // Protection flags
  protectDeleteContent     Int      @default(0) // role threshold
  protectUpdateContent     Int      @default(0)
  protectDeleteComment     Int      @default(0)
  protectUpdateComment     Int      @default(0)
  // Permissions: stored as JSON map { action: groupId[] }
  permissions              Json     @default("{}")
  // Relations
  documents                Document[]
  categories               DocumentCategory[]
  extraKeys                DocumentExtraKey[]
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([moduleSrl])
}

// ---------- Document ----------
enum DocumentStatus {
  PUBLIC
  SECRET
  TEMP
}

enum CommentStatus {
  ALLOW
  DISABLE
}

model Document {
  id              String         @id @default(cuid())
  documentSrl     BigInt         @unique // legacy mapping
  boardId         String
  board           Board          @relation(fields: [boardId], references: [id], onDelete: Cascade)
  categoryId      String?
  category        DocumentCategory? @relation(fields: [categoryId], references: [id])

  title           String
  titleBold       Boolean        @default(false)
  titleColor      String?
  content         String         // sanitized HTML
  contentText     String?        // plain-text projection for FTS

  // Author
  userId          String?        @db.Citext
  nickName        String?
  memberId        String?
  email           String?        @db.Citext
  ipAddress       String?        @db.Inet
  password        String?        // bcrypt hash for post-protected documents

  // Counts
  readedCount     Int            @default(0)
  votedCount      Int            @default(0)
  blamedCount     Int            @default(0)
  commentCount    Int            @default(0)
  trackbackCount  Int            @default(0)
  uploadedCount   Int            @default(0)

  // Status / flags
  status          DocumentStatus @default(PUBLIC)
  commentStatus   CommentStatus  @default(ALLOW)
  isNotice        Boolean        @default(false)
  langCode        String         @default("ko")
  allowTrackback  Boolean        @default(false)
  notifyMessage   Boolean        @default(false)

  // Tags & extras
  tags            String[]       @default([])
  extraVars       Json           @default("{}")

  // Sorting
  listOrder       BigInt
  updateOrder     BigInt

  // Timestamps
  regdate         DateTime       @default(now())
  lastUpdate      DateTime       @updatedAt

  // Relations
  comments        Comment[]
  files           FileAttachment[] @relation("DocumentFiles")
  updateLogs      DocumentUpdateLog[]
  votes           DocumentVote[]
  reports         DocumentReport[]
  trash           Trash?

  @@index([boardId, status, regdate(sort: Desc)])
  @@index([boardId, isNotice, listOrder(sort: Desc)])
  @@index([boardId, categoryId, listOrder(sort: Desc)])
  @@index([userId])
  @@index([tags], type: Gin)
  @@index([extraVars], type: Gin)
  // search_vector tsvector column managed by raw SQL trigger (not expressible in Prisma DSL)
}

// ---------- Comment ----------
model Comment {
  id              String        @id @default(cuid())
  commentSrl      BigInt        @unique
  documentId      String
  document        Document      @relation(fields: [documentId], references: [id], onDelete: Cascade)
  parentId        String?       // null = top-level
  parent          Comment?      @relation("CommentReplies", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  replies         Comment[]     @relation("CommentReplies")
  // Optional materialized path for deep threads (ltree); managed by raw SQL trigger
  // path         Unsupported("ltree")?
  boardId         String
  content         String
  isSecret        Boolean       @default(false)
  password        String?
  votedCount      Int           @default(0)
  blamedCount     Int           @default(0)
  userId          String?       @db.Citext
  nickName        String?
  memberId        String?
  email           String?       @db.Citext
  ipAddress       String?       @db.Inet
  status          Int           @default(1) // 1 = active, 0 = hidden
  listOrder       BigInt
  regdate         DateTime      @default(now())
  lastUpdate      DateTime      @updatedAt
  files           FileAttachment[] @relation("CommentFiles")

  @@index([documentId, listOrder])
  @@index([parentId])
  @@index([userId])
}

// ---------- DocumentCategory ----------
model DocumentCategory {
  id            String  @id @default(cuid())
  categorySrl   BigInt  @unique
  boardId       String
  board         Board   @relation(fields: [boardId], references: [id], onDelete: Cascade)
  parentId      String?
  parent        DocumentCategory? @relation("CategoryTree", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children      DocumentCategory[] @relation("CategoryTree")
  title         String
  description   String?
  color         String?
  expand        Boolean @default(true)
  isDefault     Boolean @default(false)
  groupIds      String[] @default([])
  documentCount Int     @default(0)
  listOrder     Int     @default(0)
  documents     Document[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([boardId, parentId, listOrder])
}

// ---------- DocumentExtraKey & ExtraVar (definition + values) ----------
model DocumentExtraKey {
  id            String  @id @default(cuid())
  boardId       String
  board         Board   @relation(fields: [boardId], references: [id], onDelete: Cascade)
  varIdx        Int
  varName       String
  varType       String  // text | number | select | checkbox | date | url | email
  varIsRequired Boolean @default(false)
  varSearch     Boolean @default(false)
  varSort       Boolean @default(false)
  varOptions    Json?   // for select/checkbox
  langCode      String  @default("ko")

  @@unique([boardId, varIdx, langCode])
  @@index([boardId])
}

// ---------- FileAttachment ----------
enum UploadTargetType {
  DOCUMENT
  COMMENT
}

model FileAttachment {
  id                String           @id @default(cuid())
  fileSrl           BigInt           @unique
  uploadTargetId    String
  uploadTargetType  UploadTargetType
  documentId        String?
  document          Document?        @relation("DocumentFiles", fields: [documentId], references: [id], onDelete: Cascade)
  commentId         String?
  comment           Comment?         @relation("CommentFiles", fields: [commentId], references: [id], onDelete: Cascade)

  sourceFilename    String
  uploadedFilename  String
  fileSize          BigInt
  mimeType          String
  width             Int?
  height            Int?
  duration          Int?    // seconds for audio/video
  directDownload    Boolean @default(false)
  downloadCount     Int     @default(0)
  coverImage        Boolean @default(false)
  isvalid           Boolean @default(true) // false on virus detected / pending scan
  memberId          String?
  storageKey        String  // S3 object key
  regdate           DateTime @default(now())

  @@index([uploadTargetId, uploadTargetType])
  @@index([documentId])
  @@index([commentId])
}

// ---------- DocumentUpdateLog ----------
model DocumentUpdateLog {
  id            String   @id @default(cuid())
  documentId    String
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  prevTitle     String
  prevContent   String
  prevExtraVars Json?
  editorId      String?
  editorIp      String?  @db.Inet
  regdate       DateTime @default(now())

  @@index([documentId, regdate(sort: Desc)])
}

// ---------- DocumentVote ----------
enum VoteType {
  UP
  DOWN
  BLAME
}

model DocumentVote {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  commentId   String?
  voterId     String   // member id or hashed IP for anon
  voteType    VoteType
  point       Int      @default(1)
  regdate     DateTime @default(now())

  @@unique([documentId, voterId, voteType])
  @@index([documentId])
  @@index([commentId])
}

// ---------- DocumentReport ----------
model DocumentReport {
  id          String   @id @default(cuid())
  documentId  String?
  document    Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)
  commentId   String?
  reporterId  String
  reporterIp  String?  @db.Inet
  reason      String
  resolved    Boolean  @default(false)
  regdate     DateTime @default(now())

  @@index([documentId])
  @@index([commentId])
  @@index([resolved])
}

// ---------- Trash ----------
model Trash {
  id           String   @id @default(cuid())
  documentId   String   @unique
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  deletedById  String?
  deletedAt    DateTime @default(now())
  expiresAt    DateTime // deletedAt + retention window

  @@index([expiresAt])
}
```

### Raw SQL: tsvector trigger and indexes

```sql
-- Postgres FTS column (added via migration after Prisma generate)
ALTER TABLE "Document"
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content_text, '')), 'B')
  ) STORED;

CREATE INDEX document_search_vector_idx ON "Document" USING GIN (search_vector);

-- Composite index for common board listing
CREATE INDEX document_board_status_regdate_idx
  ON "Document" (board_id, status, regdate DESC);
```

## API Surface

### tRPC Routers

```
appRouter
├── board
│   ├── list                    (query)   list boards visible to user
│   ├── byId                    (query)   board config + permissions
│   ├── create                  (mutation, admin)
│   ├── update                  (mutation, admin)
│   └── delete                  (mutation, admin)
├── document
│   ├── list                    (query)   { boardId, page, sort, filters } -> paginated
│   ├── byId                    (query)   resolves password / secret / temp
│   ├── create                  (mutation) [also exposed as Server Action]
│   ├── update                  (mutation)
│   ├── delete                  (mutation, soft-delete)
│   ├── restore                 (mutation, admin)  Trash -> Document
│   ├── pinNotice               (mutation, admin)
│   └── history                 (query)   update log
├── comment
│   ├── listByDocument          (query)   threaded
│   ├── create                  (mutation)
│   ├── update                  (mutation)
│   └── delete                  (mutation)
├── file
│   ├── presignUpload           (mutation) returns S3 presigned URL
│   ├── confirm                 (mutation) finalize after client upload
│   ├── delete                  (mutation)
│   └── markCover               (mutation)
├── category
│   ├── tree                    (query)
│   ├── create / update / delete (admin)
├── search
│   ├── documents               (query)   FTS + filters
│   └── tags                    (query)   tag autocomplete
└── moderation
    ├── reports                 (query, moderator)
    └── resolveReport           (mutation, moderator)
```

### Server Actions (forms)

- `createDocumentAction(formData)` — RSC form submission
- `updateDocumentAction(formData)`
- `createCommentAction(formData)`
- `voteAction(formData)` — up/down/blame
- `reportAction(formData)`

Server Actions internally invoke the corresponding tRPC procedure to share validation logic (Zod schemas).

## Search Strategy

### Phase 1: PostgreSQL Full-Text Search (default)

- `search_vector` generated tsvector column on `Document(title, content_text)`
- GIN index on `search_vector`, `tags`, and `extra_vars`
- Composite indexes on `(board_id, status, regdate)`, `(board_id, is_notice, list_order)`
- Query pattern: `WHERE search_vector @@ websearch_to_tsquery('simple', $1) AND ...`
- Ranking: `ts_rank_cd(search_vector, query)` with `list_order DESC` tiebreaker
- Custom field search: `extra_vars @> '{"price": ...}'::jsonb` with GIN
- Tag search: `tags && ARRAY[$1]::text[]` with GIN
- Pagination: cursor on `(list_order, id)` for stable ordering

### Phase 2 (Future, REQ-CONTENT-064): Meilisearch

- Triggered when document count > 1M or query latency p95 > 500ms
- Sync via outbox pattern (`document.created`, `document.updated`, `document.deleted`)
- Fallback to Postgres FTS if Meilisearch is unavailable

## Out of Scope

- **Trackbacks** — legacy XE feature; deprecated, not implemented in greenfield design.
- **RSS auto-publish & ping** — not in v1; a future SPEC-CONTENT-RSS will cover RSS/Atom feed generation if needed.
- **Real-time WebSocket comments** — out of scope; future `SPEC-CONTENT-REALTIME` may add subscriptions via SSE/WebSocket.
- **Multi-language content variants per document** — `lang_code` is stored but UI for switching variants is not in v1.
- **Rich e-commerce fields** — out of scope; covered by separate domain SPEC if needed.
- **AI-driven content moderation** — manual moderation only in v1.

## Open Questions

### OQ-CONTENT-001: Rich text editor — Tiptap vs Lexical
- **Tiptap** (ProseMirror-based): mature ecosystem, extension marketplace, simpler React integration via `@tiptap/react`.
- **Lexical** (Meta): newer, performance-focused, headless API, stronger schema control, but smaller ecosystem.
- **Decision criteria**: collaboration roadmap (Tiptap has Liveblocks/Y.js integrations), bundle size, accessibility, team familiarity.
- **Default recommendation**: Tiptap for v1 due to ecosystem maturity; revisit if collaborative editing becomes a P0 feature.

### OQ-CONTENT-002: File storage — S3 vs local filesystem
- **S3-compatible** (AWS S3, Cloudflare R2, MinIO): scalable, CDN-friendly, presigned uploads, cost-effective for cold storage.
- **Local filesystem**: simpler dev/self-hosting, no external dependency.
- **Default recommendation**: S3-compatible with a pluggable `StorageAdapter` interface; provide local filesystem adapter for self-hosters.
- **Open**: choose default cloud provider for managed deployment (R2 vs S3).

### OQ-CONTENT-003: Future search engine
- Should we plan Meilisearch integration in v1.x or defer to v2?
- Decision depends on expected catalog size and search latency SLOs from product.

### OQ-CONTENT-004: Comment depth handling
- Adjacency list only, or add ltree materialized path from day one?
- Recommendation: start with adjacency list, add ltree migration when production data shows depth > 5 frequently.

### OQ-CONTENT-005: Anonymous voting identity
- Hash IP only, or IP + UA, or require login for voting?
- Recommendation: require login by default; anonymous voting opt-in per board with IP+UA hash + bot mitigation.

## Dependencies & Risks

### Dependencies

- **SPEC-AUTH-001 (P0)**: Provides session, user identity, group membership, and permission resolution. The permission matrix in REQ-CONTENT-070 directly consumes Auth.js v5 session and group claims.
- **SPEC-ADMIN-001**: Provides admin UI for board configuration, category management, custom field definition, moderation queue.
- **SPEC-THEME-001**: Provides skin/layout rendering primitives consumed by board listing/detail pages.
- **Postgres extensions**: `citext`, `pg_trgm`, `ltree` (optional for deep threads).
- **External services**: S3-compatible object storage; ClamAV (optional virus scan).

### Risks

| Risk                                                         | Likelihood | Impact | Mitigation                                                                                                |
| ------------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| JSONB query performance degradation at scale                 | Medium     | High   | GIN indexes on `extra_vars` and `tags`; promote hot fields to columns when sustained slow queries observed. |
| Postgres FTS insufficient for >1M documents                  | Medium     | Medium | Plan Meilisearch fallback (REQ-CONTENT-064); design outbox events from day one.                            |
| XSS via rich-text content                                    | High       | High   | Server-side `isomorphic-dompurify` sanitization; CSP; client editor hardened; security review required.    |
| Permission misconfiguration leaks SECRET docs                | Medium     | High   | Centralize permission resolution in tRPC middleware; integration tests covering matrix; audit logging.     |
| Comment thread N+1 query on deep replies                     | Medium     | Medium | Use Prisma `include` with cursor or move to ltree path-based fetch when depth grows.                        |
| Rate limit bypass via authenticated bots                     | Medium     | Medium | Per-account rate limits + CAPTCHA on suspicious patterns; integrate with SPEC-AUTH-001 abuse signals.       |
| Soft-delete retention job fails silently                     | Low        | Medium | Scheduled job emits metrics; alert on consecutive failures; idempotent design.                              |
| File upload abuse (storage cost, illicit content)            | Medium     | High   | MIME allowlist, size limits, virus scan hook, per-user quota, signed URLs with expiry.                      |
| Tiptap/Lexical decision delay blocks UI work                 | Medium     | Low    | Time-box decision; provide editor adapter interface so swap is feasible if needed.                          |
| Migration from legacy Rhymix data (if required)              | Medium     | High   | Out of scope for v1 unless explicitly requested; plan separate `SPEC-CONTENT-MIGRATE` if so.                |

### Performance Targets (preliminary)

- Board listing p95 ≤ 150ms (cold cache), ≤ 50ms (warm)
- Document detail p95 ≤ 200ms including comments first page
- Search p95 ≤ 200ms for 100K-doc corpus, ≤ 500ms for 1M
- File upload presign ≤ 50ms

---

End of SPEC-CONTENT-001.
