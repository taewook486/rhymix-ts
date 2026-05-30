---
id: SPEC-FILE-001
title: 파일 업로드/관리 독립 패키지 (File Upload & Management Standalone Package)
version: 1.0.0
status: draft
created: 2026-05-27
updated: 2026-05-27
author: MoAI manager-spec
priority: P1
phase: 3
parent: MASTER-PLAN-002
depends-on: [SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001]
absorbs: [SPEC-CONTENT-001 attachment portion, packages/board/src/storage 전체]
issue_number: TBD
related-research: SPEC-FILE-001/research.md
language: ko
---

# SPEC-FILE-001 — 파일 업로드/관리 독립 패키지 (Phase 3 / P1)

## HISTORY

- 2026-05-27 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.7(line 311~318)의 직접 흡수. 현재 `packages/board/src/storage/`(8개 파일 — memory/s3/scanner/clamav/mime/upload-token/types)와 `packages/board/src/attachment.ts`(550+ LoC presigned upload 2-step protocol)는 SPEC-CONTENT-001 Slice E에서 board 패키지에 응집되어 있으나, 레거시 `modules/file`의 도메인 책임(MP-002 research Section 1.7 line 239~270)에 따르면 file은 board에 종속이 아닌 **cross-cutting cascading delete consumer**(`after document.deleteDocument`, `after comment.deleteComment`, `after editor.deleteSavedDoc`, `after module.deleteModule`) 역할이다. 본 SPEC은 storage + attachment 코드를 `packages/file/`로 독립화하여 cross-package cascading delete를 이벤트 버스 기반으로 정렬하고, 누락된 업로드 API 라우트 핸들러(`apps/web/app/api/files/upload/route.ts`)와 이미지 처리 파이프라인(sharp 기반 thumbnail/resize/exif strip)을 보강한다.

---

## 1. Goal & Audience

### 1.1 Goal

**Rhymix의 `modules/file` 도메인을 `packages/board`로부터 분리하여 독립 패키지 `packages/file/`로 승격하고, 누락된 업로드 endpoint + 이미지 처리 파이프라인을 추가한다.** 즉:

- 현재 `packages/board/src/storage/`(8개 파일, 약 1,200 LoC + 약 800 LoC 테스트)와 `packages/board/src/attachment.ts`(550+ LoC + 약 700 LoC 테스트)를 신규 `packages/file/`로 물리 이동한다.
- 신규 패키지는 `packages/board`에 의존하지 않으며, 반대로 `packages/document`/`packages/comment`(Phase 2 완료)가 file을 cascading delete 이벤트로 소비한다 (MASTER-PLAN-002 Section 5.7 line 313, 315).
- 누락 기능 보완: (a) `apps/web/app/api/files/upload/route.ts` multipart upload endpoint, (b) sharp 기반 이미지 처리 파이프라인 (썸네일 + small/medium/large variants + exif strip), (c) FileAttachment `coverImage` 플래그 자동 판정, (d) cascading delete의 이벤트 기반 통합 (SPEC-DOCUMENT-001 `document.deleted` 이벤트 + SPEC-COMMENT-001 `comment.deleted` 이벤트 subscribe).
- Storage backend는 `STORAGE_BACKEND` 환경변수로 선택 가능 (local disk vs S3-compatible), 양쪽 구현체는 이미 존재(`packages/board/src/storage/memory.ts`, `s3.ts`). MASTER-PLAN-002 Section 6.2 line 397, Section 9.1-6 결정 사항 채택.
- ClamAV virus scanner는 environment-flag 기반 opt-in (default: NoopScanner). 현재 `packages/board/src/storage/clamav.ts`는 stub 상태 → SPEC-FILE-001에서 실제 통합.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (packages 분리 + characterization tests 보존)
- expert-backend agent — Slice B 구현 (upload route handler + sharp pipeline + cascading delete event subscription)
- expert-frontend agent — Slice B 일부 (file upload 클라이언트 hook + 이미지 미리보기 UI 스캐폴드)
- 운영자/개발자 — board 외 다른 모듈(wiki, blog, page, comment)에서 file 첨부를 재사용 가능하도록 도메인 API를 검증하는 최종 사용자
- DevOps — S3 vs local 환경변수 전환, ClamAV daemon deployment 옵션, 이미지 storage 용량 모니터링

### 1.3 Non-Goals (본 SPEC 범위 외)

- WYSIWYG 에디터 통합(이미지 drag-and-drop, paste upload) — 후속 SPEC. 본 SPEC은 multipart endpoint + REST API만.
- CDN 통합 (CloudFront, Cloudflare R2 signed URL) — 백로그. 현재 presigned URL 메커니즘은 이미 지원.
- 첨부 파일 검색 (mime별, 사이즈별, 날짜별 admin 검색 UI) — Phase 5 SPEC-ADMIN-EXTRAS-001.
- 비디오 트랜스코딩 (ffmpeg pipeline) — 백로그. 본 SPEC은 정적 이미지(jpg/png/webp/gif)와 일반 파일(pdf/zip/문서)만.
- 파일별 ACL 매트릭스 (per-file read permission) — 본 SPEC은 첨부된 document/comment의 ACL을 상속만 함. 별도 file-level ACL은 백로그.
- 첨부 파일 OCR/메타데이터 추출 (PDF 내용 검색 등) — 백로그.
- 자동 cleanup cron (orphan FileAttachment 회수) — SPEC-INFRA-001 이월. 본 SPEC은 cascading delete 이벤트 기반 동기 정리만.
- 파일 이력 (`files_changelog` 레거시 테이블) — 현재 Prisma 모델 없음. 백로그.
- 외부 OAuth 기반 import (Google Drive, Dropbox) — 본 SPEC 범위 외.
- `editor.deleteSavedDoc` 이벤트 (임시저장 본문에 첨부된 파일 cleanup) — SPEC-DOCUMENT-001의 `document.deleted` 이벤트로 통합 처리 (TEMP 상태 문서 삭제 시 동일 경로). 별도 editor 모듈 cascading은 미구현.
- 데이터 마이그레이션 (PHP `files` 테이블 → TS `file_attachments`) — 별도 SPEC.

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. 8개 카테고리(Schema, Package Structure, Upload Protocol, Image Processing, Cascading Delete, Storage Backend, Virus Scan, tRPC/Route Handler)로 그룹화.

### 2.1 Schema 계층 (REQ-FILE-001 ~ 009)

**REQ-FILE-001 (Ubiquitous)**: The File system SHALL reuse the existing Prisma `FileAttachment` model (`packages/db/prisma/schema.prisma` line 753~780) without breaking changes. Additive migrations only; column rename or removal is forbidden in this SPEC.

**REQ-FILE-002 (Ubiquitous)**: The File system SHALL preserve all existing FileAttachment columns: `id`, `fileSrl` (legacy migration용 BigInt? Unique), `uploadTargetType` (`UploadTargetType` enum: DOCUMENT/COMMENT), `documentId`, `commentId`, `sourceFilename`, `uploadedFilename`, `fileSize` (BigInt), `mimeType`, `width`, `height`, `duration`, `directDownload` (Boolean), `downloadCount`, `coverImage` (Boolean), `isvalid` (Boolean), `memberId`, `storageKey`, `regdate`.

**REQ-FILE-003 (Ubiquitous)**: The File system SHALL preserve the existing `UploadTargetType` enum values (DOCUMENT, COMMENT). MASTER-PLAN-002 Section 5.7은 새 enum 값을 도입하지 않는다.

**REQ-FILE-004 (Ubiquitous)**: The File system SHALL preserve the existing relations: `FileAttachment.document → Document` (`onDelete: SetNull`, REQ-DOC-027 cascade와 일관), `FileAttachment.comment → Comment` (`onDelete: SetNull`). 본 SPEC은 onDelete SetNull을 그대로 유지하며, cascading "soft-delete"는 이벤트 버스로 별도 처리(REQ-FILE-040~049 참조).

**REQ-FILE-005 (Event-Driven)**: WHEN a Slice C migration (선택) adds image variant tracking, the File system MAY introduce additive columns `thumbnailKey`, `smallKey`, `mediumKey`, `largeKey` (all `String?` nullable). Slice A/B는 이러한 컬럼을 추가하지 않으며, 이미지 variant key는 `storageKey`로부터 derived(예: `{storageKey}.thumb.webp`)로 처리.

**REQ-FILE-006 (Ubiquitous)**: The File system SHALL preserve the existing `@@index([documentId])` and `@@index([commentId])` on FileAttachment. 신규 인덱스는 Slice C 선택 마이그레이션에서만 추가 (예: `@@index([memberId, regdate])` for member upload history).

**REQ-FILE-007 (Ubiquitous)**: The File system SHALL preserve the `isvalid` flag semantics — `isvalid: false`는 "업로드는 완료됐으나 본문에 연결되지 않은 orphan 후보"를 의미한다(레거시 `files.isvalid` Y/N 컬럼 직역, MP-002 research line 260). cleanup cron(SPEC-INFRA-001)이 이를 회수한다.

**REQ-FILE-008 (Ubiquitous)**: The File system SHALL NOT introduce new Prisma migrations in Slice A (package separation). 새 마이그레이션은 Slice B 끝부분에서만 선택적으로 발생하며 모두 additive(인덱스 추가, nullable 컬럼 추가)다.

**REQ-FILE-009 (Unwanted)**: The File system SHALL NOT modify FileAttachment.coverImage default(`@default(false)`). 이미지 업로드 시 coverImage 자동 판정 로직은 **service layer**에서 처리하며, DB 디폴트는 그대로다 (REQ-FILE-031 참조).

### 2.2 Package Structure 계층 (REQ-FILE-010 ~ 019)

**REQ-FILE-010 (Ubiquitous)**: The File system SHALL be packaged as `packages/file/` with a `package.json` declaring name `@rhymix-ts/file`, version `0.1.0`, dependencies on `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/auth` (Actor type), `zod`, `sharp` (이미지 처리), `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (S3 backend), 그리고 optional `clamscan` (ClamAV 통합 시).

**REQ-FILE-011 (Ubiquitous)**: The File system SHALL NOT depend on `@rhymix-ts/board`. 역방향 의존: `packages/board` MAY depend on `packages/file` (Slice A 종료 시 board의 기존 callsite는 file 패키지를 import). 그러나 보통의 caller는 `packages/document`, `packages/comment`, `apps/web`이며 board는 file을 거의 직접 호출하지 않는다.

**REQ-FILE-012 (Ubiquitous)**: The File system SHALL NOT depend on `@rhymix-ts/document` or `@rhymix-ts/comment` directly. cascading delete는 이벤트 버스(`document.deleted`, `comment.deleted`) 구독으로 약결합 (REQ-FILE-040~049). document/comment package 안의 lifecycle event emit hook(SPEC-DOCUMENT-001 REQ-DOC-132, SPEC-COMMENT-001 동등 REQ)이 file 패키지의 subscriber를 트리거한다.

**REQ-FILE-013 (Ubiquitous)**: The File system SHALL expose a top-level barrel export at `packages/file/src/index.ts` re-exporting: `requestUpload`, `completeUpload`, `deleteAttachment`, `listAttachments`, `getAttachment`, `setCoverImage`, `clearCoverImage`, `getAttachmentDownloadUrl`, plus storage interfaces (`FileStorage`, `VirusScanner`) 및 구현체 클래스 (`S3Storage`, `LocalDiskStorage`, `InMemoryStorage`, `NoopScanner`, `ClamAVScanner`), plus error classes (`UploadHeadMismatchError`, `VirusDetectedError`, `AttachmentOwnershipError`, `UnsupportedMimeTypeError`, `FileTooLargeError`, `InvalidUploadTokenError`, `StorageBackendError` (신규)).

**REQ-FILE-014 (Ubiquitous)**: The File system SHALL physically relocate the following source files from `packages/board/src/` to `packages/file/src/`: `attachment.ts`, `attachment.test.ts`, 그리고 `storage/` 디렉토리 전체(`memory.ts`, `s3.ts`, `scanner.ts`, `clamav.ts`, `clamav.test.ts`, `mime.ts`, `storage.test.ts`, `upload-token.ts`, `types.ts`).

**REQ-FILE-015 (Ubiquitous)**: The File system SHALL NOT relocate `packages/board/src/document.ts` (SPEC-DOCUMENT-001 Phase 2 처리), `packages/board/src/comment.ts` (SPEC-COMMENT-001 Phase 2 처리), or `packages/board/src/category.ts` (SPEC-DOCUMENT-001 Slice C 처리). 본 SPEC은 file 도메인만 다룬다.

**REQ-FILE-016 (Unwanted)**: The File system SHALL NOT import `@prisma/client` constructors directly. PrismaClient instances are passed via `ctx: { prisma: PrismaClient }` props (consistent with current `attachment.ts:148` convention).

**REQ-FILE-017 (Ubiquitous)**: The File system SHALL declare TypeScript strict mode. Zero `any` types are introduced; existing `PrismaWithFileAttachment` type cast (current `attachment.ts:189`)는 보존되며, 가능하면 정식 Prisma client 타입으로 정정(non-blocking).

**REQ-FILE-018 (Ubiquitous)**: The File system SHALL register itself with the module registry (`packages/core/src/modules/registry.ts`) with `moduleCode = 'file'` for symmetry with document/comment. 단, file은 사용자 마운트 가능한 모듈이 아니므로 (admin 관리 화면만 존재) registration은 idempotent + admin-only flag로 한다.

**REQ-FILE-019 (Ubiquitous)**: The File system SHALL provide a `LocalDiskStorage` implementation in addition to existing `InMemoryStorage`(test) and `S3Storage`(production). `LocalDiskStorage`는 `STORAGE_BACKEND=local` 시 사용되며 파일을 `process.env.RX_LOCAL_STORAGE_ROOT || './uploads'` 디렉토리에 저장한다. dev/소규모 환경 용도.

### 2.3 Upload Protocol 계층 (REQ-FILE-020 ~ 029)

**REQ-FILE-020 (Ubiquitous)**: The File system SHALL preserve the existing 2-step presigned upload protocol from SPEC-CONTENT-001 Slice E:
  - Step 1: `requestUpload({ sourceFilename, mimeType, fileSize, memberId }, ctx)` → `{ url, method:'PUT', headers, storageKey, uploadToken, expiresAt }` (10분 TTL HMAC token, DB row 미생성)
  - Step 2: 클라이언트가 presigned URL로 binary PUT
  - Step 3: `completeUpload({ uploadToken, uploadTargetType, uploadTargetId, ... }, ctx)` → token 검증 + storage.head + virus scan + DB row 생성

**REQ-FILE-021 (Ubiquitous)**: 본 SPEC은 추가로 **multipart upload route handler** (`apps/web/app/api/files/upload/route.ts`)를 제공한다 — 2-step 프로토콜이 부담스러운 소형 파일/server-side upload 시나리오용. 이 endpoint는 multipart/form-data POST를 받아 내부적으로 streaming → storage write → virus scan → DB row 생성을 한 번에 수행한다.

**REQ-FILE-022 (Event-Driven)**: WHEN `POST /api/files/upload` is invoked with `multipart/form-data` containing `file` field + optional `uploadTargetType` + `uploadTargetId`, the File system SHALL:
  - 인증: 세션 검증 (`getServerSession()` 또는 동등), 비인증 → 401
  - Content-Length 검증 (REQ-FILE-024 사이즈 한도)
  - MIME 검증 (REQ-FILE-024 allowlist)
  - storage.write 호출 (streaming, in-memory buffer 회피)
  - virus scan (ClamAV 활성화 시)
  - 이미지인 경우 sharp 파이프라인 호출 (REQ-FILE-030~037)
  - FileAttachment row 생성 (트랜잭션)
  - 응답: `{ id, storageKey, mimeType, fileSize, width?, height?, coverImage }` JSON (200) 또는 에러 (400/401/413/415/500)

**REQ-FILE-023 (Event-Driven)**: WHEN `completeUpload` 또는 `POST /api/files/upload` 가 호출되면, the File system SHALL bind the FileAttachment to its target via `documentId` OR `commentId` (mutually exclusive — both not null is invalid). target이 미지정인 경우 `isvalid: false` + 두 ID 모두 null로 저장 (orphan 후보, cleanup cron 대상).

**REQ-FILE-024 (Ubiquitous)**: The File system SHALL validate MIME type and file size via board-level config (REQ-FILE-025) 또는 system-wide default. 기본 allowlist는 현재 `packages/board/src/storage/mime.ts`의 정의를 보존:
  - 이미지: jpg, jpeg, png, gif, webp (최대 10 MB)
  - 문서: pdf (최대 20 MB), docx/xlsx/pptx (최대 20 MB), txt/md/csv (최대 5 MB)
  - 압축: zip (최대 50 MB)
  - 기타: 모두 거부 (`UnsupportedMimeTypeError`)
  - 사이즈 초과: `FileTooLargeError`

**REQ-FILE-025 (Event-Driven)**: WHEN a board-level upload config(`Board.uploadConfig` JSONB column — Slice B에서 board 도메인 협업이 필요한 경우) is present AND target은 document/comment 게시판인 경우, the File system SHALL prefer board-level MIME allowlist + size limits over system default. 현재 Board 모델에 uploadConfig 컬럼이 없으면 system default만 사용 (board-level config 도입은 백로그).

**REQ-FILE-026 (Unwanted)**: The File system SHALL NOT accept executable MIME types (`application/x-msdownload`, `application/x-executable`, `application/x-msi`, etc.) under any circumstance. system-wide blocklist는 mime.ts에 정의된 거부 패턴(`.exe`, `.bat`, `.sh`, `.cmd`, `.com`, `.dll`, etc.)을 사용한다.

**REQ-FILE-027 (Event-Driven)**: WHEN upload token이 만료되거나 변조된 경우 (HMAC mismatch), the File system SHALL throw `InvalidUploadTokenError`. token TTL은 기본 10분(`UPLOAD_TOKEN_TTL_SECONDS=600` env).

**REQ-FILE-028 (Event-Driven)**: WHEN `storage.head(storageKey)` returns null OR size mismatch in `completeUpload`, the File system SHALL throw `UploadHeadMismatchError` and NOT create the FileAttachment row. (현재 `attachment.ts:156~165` 동작 보존.)

**REQ-FILE-029 (Ubiquitous)**: The File system SHALL emit lifecycle events for cross-package integration:
  - `file.uploaded` (after completeUpload commits)
  - `file.attached` (when documentId/commentId is assigned)
  - `file.deleted` (when soft/hard delete commits)
  - `file.cover-image-changed` (when coverImage flag toggles)

이벤트 emitter는 SPEC-DOCUMENT-001 REQ-DOC-132와 동일 패턴 (in-process EventEmitter + Zod-typed payload).

### 2.4 Image Processing 계층 (REQ-FILE-030 ~ 039)

**REQ-FILE-030 (Event-Driven)**: WHEN an uploaded file has `mimeType` matching image whitelist (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), the File system SHALL invoke the sharp pipeline to:
  - 원본 metadata 추출 (`width`, `height`) → FileAttachment row 저장
  - thumbnail 생성 (변, longest side 200px, webp, q=80) → storage key `{storageKey}.thumb.webp`
  - exif strip (EXIF orientation 자동 회전 적용 후 메타데이터 제거 — 프라이버시)
  - **이미지 variants 생성** (REQ-FILE-031): small (longest side 480px), medium (1024px), large (2048px) — 모두 webp 변환, q=80

**REQ-FILE-031 (Event-Driven)**: WHEN a sharp-processed image's longest side exceeds 480px, the File system SHALL generate the `small` variant. WHEN exceeds 1024px → `medium`. WHEN exceeds 2048px → `large`. 원본이 작으면 작은 variants만 생성 (오버사이즈 회피). 모든 variant는 `{storageKey}.{variant}.webp` 키로 storage에 저장.

**REQ-FILE-032 (State-Driven)**: WHILE an image's mimeType is `image/gif` AND the gif is animated (multi-frame), the File system SHALL preserve the original (no webp 변환) AND skip variants generation (animated webp는 호환성 문제로 미지원). thumbnail은 첫 프레임에서 정적 webp 생성.

**REQ-FILE-033 (Event-Driven)**: WHEN an image upload is part of a document attachment AND no other attachment of that document has `coverImage: true` AND it is the first image in the upload batch, the File system SHALL automatically set `coverImage: true` on the new FileAttachment row. 이를 통해 첫 이미지가 기본 cover image candidate가 된다.

**REQ-FILE-034 (Event-Driven)**: WHEN `setCoverImage({ attachmentId, documentId, actor }, ctx)` is invoked by the document author or admin, the File system SHALL clear `coverImage` flag on all other FileAttachment rows of the same documentId AND set the target to `true`, in a single transaction. emit `file.cover-image-changed` event.

**REQ-FILE-035 (Unwanted)**: The File system SHALL NOT generate variants for non-image MIME types. PDF, zip, docx 등은 원본 파일만 저장.

**REQ-FILE-036 (Unwanted)**: The File system SHALL NOT process images larger than 50 MB (raw size). REQ-FILE-024의 10MB image limit을 초과하는 이미지는 애초에 거부되므로 본 제약은 추가 안전망.

**REQ-FILE-037 (Event-Driven)**: WHEN sharp 처리가 실패하면 (예: 손상된 이미지), the File system SHALL log the error, set `width: null, height: null, coverImage: false` on the FileAttachment row, skip variants 생성, but STILL persist the original file (사용자가 다운로드는 가능). 원본 자체가 의심되면(virus scan과 별개) FileAttachment.isvalid=false 로 표시.

**REQ-FILE-038 (Ubiquitous)**: The File system SHALL expose image variants via `getAttachmentDownloadUrl({ attachmentId, variant: 'thumb'|'small'|'medium'|'large'|'original' }, ctx)` returning a presigned GET URL. variant 미지정 시 'original'.

**REQ-FILE-039 (Unwanted)**: The File system SHALL NOT support arbitrary on-the-fly image resize (예: `/api/files/{id}?width=320`). 모든 variants는 upload 시점에 미리 생성. on-the-fly resize는 백로그.

### 2.5 Cascading Delete 계층 (REQ-FILE-040 ~ 049)

**REQ-FILE-040 (Event-Driven)**: WHEN a `document.deleted` event is received from SPEC-DOCUMENT-001's event bus, the File system SHALL soft-delete all FileAttachment rows where `documentId === event.documentId` AND set `isvalid: false`. **soft delete의 의미**: 본 SPEC은 FileAttachment에 deletedAt 컬럼을 추가하지 않으며, `isvalid: false`로 invalidation을 표시한다. 실제 storage 객체 삭제는 cleanup cron(SPEC-INFRA-001)이 수행.

**REQ-FILE-041 (Event-Driven)**: WHEN a `comment.deleted` event is received from SPEC-COMMENT-001's event bus, the File system SHALL soft-delete all FileAttachment rows where `commentId === event.commentId` (REQ-FILE-040와 동일 메커니즘).

**REQ-FILE-042 (Event-Driven)**: WHEN a `document.purged` event(hard delete) is received, the File system SHALL hard-delete all FileAttachment rows where `documentId === event.documentId` AND schedule storage object deletion (best-effort, async). FileAttachment 자체는 `Document` cascade에 의해 `onDelete: SetNull`로 documentId만 null이 될 수도 있으나, file 도메인은 명시적으로 row를 delete (orphan cleanup).

**REQ-FILE-043 (Event-Driven)**: WHEN a `document.restored` event is received, the File system SHALL revert `isvalid: true` for FileAttachment rows where `documentId === event.documentId` AND `isvalid: false`. 단, storage 객체가 이미 cleanup cron으로 삭제됐다면 (현재는 cron 없음) 복원 불가 — 이 경우 isvalid는 true로 유지하되 admin log에 경고.

**REQ-FILE-044 (Ubiquitous)**: The File system SHALL register event subscribers via a `registerFileEventSubscribers(emitter, ctx)` function at `packages/file/src/events.ts`. 이 함수는 `apps/web` boot 시점(`apps/web/lib/file-init.ts` 또는 next instrumentation)에 호출되어 document/comment event emitters에 subscriber를 등록한다.

**REQ-FILE-045 (Unwanted)**: The File system SHALL NOT directly call `prisma.document.findUnique` or any document/comment domain function. cascading은 오직 이벤트 payload(`{ documentId, boardId, ... }`)로만 처리된다.

**REQ-FILE-046 (Event-Driven)**: WHEN an event subscriber fails (예: prisma error), the File system SHALL log the failure AND NOT rethrow — emitter는 다른 subscriber를 계속 호출해야 한다. failed cascades는 별도 `file_cascading_failures` audit log(선택, Slice B 백로그)로 추적.

**REQ-FILE-047 (Ubiquitous)**: The File system SHALL also expose direct service functions for explicit cascading (호출자가 이벤트 버스를 사용할 수 없는 경우):
  - `cascadeDeleteByDocument({ documentId }, ctx)` — REQ-FILE-040 본문 직접 호출
  - `cascadeDeleteByComment({ commentId }, ctx)` — REQ-FILE-041 본문 직접 호출
  - `cascadeRestoreByDocument({ documentId }, ctx)` — REQ-FILE-043 본문 직접 호출

  Slice B에서는 이벤트 구독 + 직접 호출 둘 다 제공. 일반적인 production path는 이벤트 기반.

**REQ-FILE-048 (Ubiquitous)**: The File system SHALL update each Document/Comment's `uploadedCount` denormalized counter (Document.uploadedCount column이 이미 존재) WHEN FileAttachment is created or destroyed AND target은 valid. cascading delete 시 한 번에 N개 row를 invalidate하므로, counter는 0으로 set (re-count from scratch via subquery).

**REQ-FILE-049 (Unwanted)**: The File system SHALL NOT automatically purge orphan FileAttachment rows (`isvalid: false` AND `regdate < now() - 30 days`). 이는 cleanup cron(SPEC-INFRA-001)의 책임이며 본 SPEC은 그 hook point만 제공.

### 2.6 Storage Backend 계층 (REQ-FILE-050 ~ 059)

**REQ-FILE-050 (Ubiquitous)**: The File system SHALL select storage backend via `STORAGE_BACKEND` environment variable:
  - `STORAGE_BACKEND=local` → `LocalDiskStorage` (Slice A 신규)
  - `STORAGE_BACKEND=s3` → `S3Storage` (현재 존재)
  - `STORAGE_BACKEND=memory` → `InMemoryStorage` (test only)
  - missing → 기본 `local` (dev 친화)

**REQ-FILE-051 (Ubiquitous)**: The File system SHALL preserve the existing `FileStorage` interface (`packages/board/src/storage/types.ts`) exactly:
  - `getUploadPresignedUrl({ key, contentType, contentLength, expiresIn? })`
  - `getDownloadUrl({ key, expiresIn?, forceAttachment?, filename? })`
  - `delete({ key })`
  - `head(key)`
  - `write({ key, body, contentType })` — Slice B 신규 (multipart upload route에서 streaming write 용)
  - `read(key)` — Slice B 신규 (sharp 파이프라인이 원본 읽기 용)

  `write` + `read`는 existing memory/s3 구현체에도 추가됨 (presigned 방식만으로는 부족 — multipart route는 server에서 direct write 필요).

**REQ-FILE-052 (State-Driven)**: WHILE `STORAGE_BACKEND=local`, the File system SHALL store files under `process.env.RX_LOCAL_STORAGE_ROOT || './uploads'`. presigned URL은 발급하지 않고 (local에는 presign 개념 없음), 대신 download은 `apps/web/app/api/files/[id]/download/route.ts`(Slice B 신규)가 stream을 직접 반환.

**REQ-FILE-053 (State-Driven)**: WHILE `STORAGE_BACKEND=s3`, the File system SHALL require `AWS_S3_BUCKET`, `AWS_REGION`, AWS credentials (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or instance role). multipart upload threshold (parts size)는 환경변수 `RX_S3_MULTIPART_THRESHOLD_MB`(기본 5MB)로 조정 — Open Question Q2 참조.

**REQ-FILE-054 (Event-Driven)**: WHEN a storage operation fails(network error, S3 throttle, disk full), the File system SHALL wrap the underlying error in `StorageBackendError` with original cause preserved. 호출자가 retryable/non-retryable을 판단할 수 있도록.

**REQ-FILE-055 (Unwanted)**: The File system SHALL NOT store secret/token data in storage. 모든 storage 객체는 file content(이미지, 문서, 압축파일 등)만이며, upload token/session token은 별도(memory/JWT)에 보관.

**REQ-FILE-056 (Ubiquitous)**: The File system SHALL produce storage keys following the pattern `attachments/{yyyy}/{mm}/{uuid}.{ext}` (current `attachment.ts:88~94` 보존). 이미지 variants는 `{storageKey}.{variant}.webp` 형태.

**REQ-FILE-057 (Ubiquitous)**: The File system SHALL provide a `migrateStorage({ from: StorageBackend, to: StorageBackend, options })` admin function(Slice C 선택)로 backend 전환 시 객체 이전을 지원. 본 SPEC은 type signature만 정의 + 미구현 stub 가능 (`throw new Error('not implemented')`).

**REQ-FILE-058 (Unwanted)**: The File system SHALL NOT allow runtime backend switching per-request. backend는 process boot 시 한 번 결정되고 lifetime 동안 고정.

**REQ-FILE-059 (Ubiquitous)**: The File system SHALL preserve presigned URL TTL defaults: upload 300s (5분), download 600s (10분). 모두 environment overridable (`RX_PRESIGN_UPLOAD_TTL`, `RX_PRESIGN_DOWNLOAD_TTL`).

### 2.7 Virus Scan 계층 (REQ-FILE-060 ~ 067)

**REQ-FILE-060 (Ubiquitous)**: The File system SHALL select virus scanner via `VIRUS_SCAN_BACKEND` environment variable:
  - `VIRUS_SCAN_BACKEND=clamav` → `ClamAVScanner` (현재 stub → Slice B 구현)
  - `VIRUS_SCAN_BACKEND=noop` → `NoopScanner` (현재 존재, 항상 clean 반환)
  - missing → 기본 `noop` (Open Question Q1 — 기본 활성화 정책 결정)

**REQ-FILE-061 (Event-Driven)**: WHEN `ClamAVScanner.scan({ storageKey, storage, ... })` is invoked, the File system SHALL:
  - storage.read 또는 storage.getDownloadUrl 로 객체 fetch
  - clamscan 라이브러리 또는 `clamdscan` daemon TCP socket에 stream 전송
  - 응답: `{ clean: boolean, threats: string[] }`
  - timeout (기본 30s) 시 `{ clean: false, threats: ['scan_timeout'] }`

**REQ-FILE-062 (Event-Driven)**: WHEN virus is detected, the File system SHALL (현재 `attachment.ts:177~184` 보존):
  - storage.delete 호출 (감염 파일 제거, best-effort)
  - throw `VirusDetectedError(threats)`
  - FileAttachment row 미생성 (트랜잭션 시작 전)
  - emit `file.virus-detected` event (audit log + admin notification 용도, Slice B 백로그)

**REQ-FILE-063 (State-Driven)**: WHILE `VIRUS_SCAN_BACKEND=clamav`, the File system SHALL require `CLAMAV_HOST` (기본 `localhost`) + `CLAMAV_PORT` (기본 3310). daemon unavailability 시 scan은 `{ clean: false, threats: ['scanner_unavailable'] }`를 반환하고 업로드 거부(fail-closed default).

**REQ-FILE-064 (Ubiquitous)**: The File system SHALL allow `fail-open` mode via `CLAMAV_FAIL_OPEN=true` environment variable — scanner unavailable 시 upload는 허용하되 admin log에 경고. 기본은 fail-closed.

**REQ-FILE-065 (Unwanted)**: The File system SHALL NOT bypass virus scan based on file size or mime type. 모든 업로드는 동일하게 scan 적용 (성능 이슈는 ClamAV concurrency tuning으로 해결).

**REQ-FILE-066 (Ubiquitous)**: The File system SHALL preserve the `VirusScanner` interface (`packages/board/src/storage/types.ts` 또는 `scanner.ts`) exactly. NoopScanner 구현은 항상 `{ clean: true, threats: [] }` 반환 (테스트/소규모 환경 용).

**REQ-FILE-067 (Ubiquitous)**: The File system SHALL log all scan results (clean/infected) at debug level + infected results at warn level. log payload: `{ storageKey, scanBackend, durationMs, clean, threats }`.

### 2.8 tRPC Router + Route Handler 계층 (REQ-FILE-070 ~ 089)

**REQ-FILE-070 (Ubiquitous)**: The File system SHALL expose a tRPC router at `packages/file/src/server/router.ts` named `fileRouter` (exported). The router uses `publicProcedure`, `protectedProcedure`, and `adminProcedure` from the shared trpc init.

**REQ-FILE-071 (Ubiquitous)**: The `fileRouter` SHALL define the following public procedures (no auth required, ACL via injected actor):
  - `getDownloadUrl({ attachmentId, variant? })` → `{ url: string; expiresAt: Date }` (단, 첨부된 document/comment가 SECRET이거나 deletedAt set이면 FORBIDDEN)
  - `getMetadata({ attachmentId })` → `Pick<FileAttachment, 'id' | 'sourceFilename' | 'mimeType' | 'fileSize' | 'width' | 'height' | 'coverImage' | 'regdate'>` (storageKey, memberId는 노출하지 않음)

**REQ-FILE-072 (Ubiquitous)**: The `fileRouter` SHALL define the following protected procedures:
  - `requestUpload({ sourceFilename, mimeType, fileSize })` → `RequestUploadResult` (2-step protocol step 1)
  - `completeUpload({ uploadToken, uploadTargetType, uploadTargetId, width?, height?, duration?, directDownload?, coverImage? })` → `FileAttachment`
  - `delete({ attachmentId })` → `{ attachmentId }` (소유권 검증)
  - `setCoverImage({ attachmentId, documentId })` → updated FileAttachment
  - `clearCoverImage({ attachmentId, documentId })` → updated FileAttachment
  - `listMyAttachments({ cursor?, limit? })` → cursor list (회원 자신의 업로드 history)

**REQ-FILE-073 (Ubiquitous)**: The `fileRouter` SHALL define the following admin procedures (admin middleware):
  - `admin.listOrphans({ olderThanDays?, cursor?, limit? })` → orphan FileAttachment 목록
  - `admin.purgeOrphans({ olderThanDays })` → `{ deletedCount: number }`
  - `admin.cascadeRebuild({ documentId? | commentId? })` → recount/revalidate uploadedCount

**REQ-FILE-074 (Ubiquitous)**: 본 SPEC은 **Next.js Route Handler** 하나를 추가로 제공한다(REQ-FILE-021): `apps/web/app/api/files/upload/route.ts`. 이 핸들러는 tRPC와 별개이며, multipart/form-data 직접 처리 (tRPC는 multipart 미지원).

**REQ-FILE-075 (Event-Driven)**: WHEN `POST /api/files/upload` receives a multipart request, the route handler SHALL:
  - 인증 검증 (Auth.js session)
  - `formData.get('file')`로 File 객체 추출
  - File.stream() → storage.write (streaming)
  - virus scan
  - 이미지면 sharp 파이프라인
  - FileAttachment row 생성 (트랜잭션)
  - 응답 JSON

**REQ-FILE-076 (Event-Driven)**: WHEN `GET /api/files/[id]/download` is invoked (Slice B 신규), the route handler SHALL:
  - attachmentId 조회 + ACL 검증 (REQ-FILE-071과 동일 규칙)
  - `STORAGE_BACKEND=local`이면 fs.createReadStream → Response body
  - `STORAGE_BACKEND=s3`이면 presigned GET URL로 redirect (302) — 또는 streaming proxy (`directDownload` flag에 따라)

**REQ-FILE-077 (Ubiquitous)**: The File system SHALL provide Server Action wrappers at `packages/file/src/server/actions.ts` for: `requestUploadAction`, `completeUploadAction`, `deleteAttachmentAction`, `setCoverImageAction`. 각 액션 ActionResult discriminated union 반환 (SPEC-DOCUMENT-001 REQ-DOC-105와 동일 패턴).

**REQ-FILE-078 (Event-Driven)**: WHEN a tRPC procedure's actor lacks the required permission, the router SHALL convert `AttachmentOwnershipError`, `BoardPermissionDeniedError` to `TRPCError({ code: 'FORBIDDEN', cause })`. `UploadHeadMismatchError` → `BAD_REQUEST`. `VirusDetectedError` → `UNPROCESSABLE_CONTENT`. `UnsupportedMimeTypeError` → `BAD_REQUEST`. `FileTooLargeError` → `PAYLOAD_TOO_LARGE`.

**REQ-FILE-079 (Unwanted)**: The File system SHALL NOT expose `storageKey`, `uploadedFilename`, or `memberId` in `getMetadata` response — 이들은 admin-only 또는 internal field.

### 2.9 Quality 계층 (REQ-FILE-090 ~ 099)

**REQ-FILE-090 (Ubiquitous)**: All migrated test files SHALL pass without modification of assertions. Test relocation is mechanical (path-only, no behavior change). Total existing test count SHALL match the pre-move baseline (currently ~40 tests across `attachment.test.ts`, `storage.test.ts`, `clamav.test.ts`).

**REQ-FILE-091 (Ubiquitous)**: Slice B SHALL add at least the following NEW tests:
  - sharp image pipeline (REQ-FILE-030~037): 5+ tests (jpeg/png/webp/animated gif, exif strip, variants 생성, 작은 이미지 variants 스킵)
  - multipart upload route (REQ-FILE-022, 075): 3+ tests (happy path, oversize 413, unsupported MIME 415, unauthenticated 401)
  - cover image auto-flag (REQ-FILE-033, 034): 3+ tests
  - cascading delete event subscription (REQ-FILE-040, 041, 043): 4+ tests
  - storage backend selection (REQ-FILE-050, 052): 2+ tests
  - ClamAV scanner integration (REQ-FILE-061~064): 3+ tests (clean, infected, daemon unavailable fail-closed/open)
  - tRPC router happy paths + permission errors: 5+ tests
  - **Target NEW tests in Slice B: ~25**; 결합하여 ~40 (relocated) + ~25 (new) = ~65 total

**REQ-FILE-092 (Ubiquitous)**: Coverage for `packages/file/src/**` SHALL be at least 85% (statements + branches) per TRUST 5 Tested pillar.

**REQ-FILE-093 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL report 0 errors across `packages/file`, `packages/board`, `packages/document`, `packages/comment`, and `apps/web` after Slices A/B.

**REQ-FILE-094 (Ubiquitous)**: All new code SHALL respect `.moai/config/sections/language.yaml`: code comments in Korean (`code_comments: ko`), identifiers/strings/error codes in English. @MX tags SHALL use Korean descriptions per `mx-tag-protocol.md`.

**REQ-FILE-095 (Unwanted)**: The File system SHALL NOT introduce new global mutable state beyond the existing typed event emitter (REQ-FILE-029).

**REQ-FILE-096 (Ubiquitous)**: The `packages/board` package SHALL be updated to NO LONGER re-export file-related symbols once Slice A완료 (board는 attachment/storage를 더 이상 가지지 않으므로 자연스럽게 제거됨). `apps/web` callsite는 모두 `@rhymix-ts/file`로 import 경로 갱신.

**REQ-FILE-097 (Ubiquitous)**: `pnpm-workspace.yaml` SHALL include `packages/file` in its workspace globs (`packages/*` 자동 포함 검증).

**REQ-FILE-098 (Ubiquitous)**: The File system SHALL provide an instrumentation hook for cleanup cron consumers (`exportable orphanCleanupTask({ olderThanDays }, ctx)`) — Slice B에서 type 정의 + 기본 구현(`prisma.fileAttachment.findMany({ where: { isvalid: false, regdate: { lt: ... } } })` + storage.delete batch).

**REQ-FILE-099 (Ubiquitous)**: The File system SHALL preserve audit logging at key points: upload completion, virus detection, cover image change, cascading delete failure. log format은 structured JSON via `console.log` 또는 logger 추상화 (현재 attachment.ts는 console만 사용 — 그대로 보존).

---

## 3. Slices (high-level)

본 SPEC은 **2개 슬라이스**로 분해된다 (MASTER-PLAN-002 Section 5.7 line 318: "Slice count: 2"). 상세 작업 항목은 `plan.md` 참조.

### Slice A: 패키지 분리 (Package Separation)

**목표**: `packages/board/src/storage/` + `packages/board/src/attachment.ts` → `packages/file/src/` 물리 이동. **0 behavior change**. 기존 ~40 tests로 회귀 가드.

**산출물**:
- `packages/file/` 신규 패키지(골조 + 이동된 파일 11개 + 테스트 5개 정도)
- `packages/board/package.json`에 `@rhymix-ts/file` dependency 추가 (board 내부에서 file을 호출하는 callsite가 있다면)
- `apps/web/**` import 경로 업데이트 (`from '@rhymix-ts/board'` → `from '@rhymix-ts/file'` for file-related symbols)
- `pnpm-workspace.yaml` 검증
- `pnpm test` 전체 통과 (~40 tests no change)
- `pnpm tsc --noEmit` 0 error

**EARS coverage**: REQ-FILE-001~019, REQ-FILE-090, REQ-FILE-093, REQ-FILE-096, REQ-FILE-097

### Slice B: 업로드 API + 이미지 처리 + Cascading Delete

**목표**: 다음 4개 기능을 한 슬라이스에 통합 (모두 file 도메인의 신규 기능):
1. multipart upload route handler (`apps/web/app/api/files/upload/route.ts`)
2. sharp 이미지 처리 파이프라인 (thumbnail + variants + exif strip + auto cover image)
3. ClamAV 통합 (현재 stub → 실구현 또는 fail-closed 검증)
4. Cascading delete 이벤트 구독 (SPEC-DOCUMENT-001 + SPEC-COMMENT-001의 이벤트 버스에 등록)

**산출물**:
- `apps/web/app/api/files/upload/route.ts` (multipart POST)
- `apps/web/app/api/files/[id]/download/route.ts` (GET, local backend용 streaming)
- `packages/file/src/image-pipeline.ts` (sharp wrapper)
- `packages/file/src/local-disk.ts` (`LocalDiskStorage` 구현)
- `packages/file/src/storage/clamav.ts` (stub → 실구현)
- `packages/file/src/events.ts` (typed emitter + subscribe hooks)
- `packages/file/src/server/router.ts` (tRPC fileRouter)
- `packages/file/src/server/actions.ts` (Server Action wrappers)
- `apps/web/src/server/trpc/root.ts`에 `fileRouter` 마운트
- `apps/web/lib/file-init.ts` (boot 시 event subscriber 등록)
- 새 테스트 ~25개 (REQ-FILE-091)

**EARS coverage**: REQ-FILE-005, 020~029, 030~039, 040~049, 050~059(LocalDiskStorage 신규 부분), 060~067, 070~079, 091, 098

---

## 4. Acceptance Criteria (요약)

본 SPEC의 핵심 acceptance는 MASTER-PLAN-002 Section 5.7의 2개 headline을 충족한다. Given-When-Then 형식 핵심 5개:

1. **AC-FILE-A1 (Package Separation, REQ-FILE-001~019, REQ-FILE-090)**:
   GIVEN `packages/board/src/storage/` + `packages/board/src/attachment.ts`가 존재하고, WHEN Slice A 완료 후 `pnpm test` 실행, THEN (a) 모든 파일이 `packages/file/src/`에 존재하고 (b) 기존 ~40 tests가 100% 통과하며 (c) `packages/board/src/storage/` 디렉토리는 더 이상 존재하지 않고 (d) `apps/web/**`의 모든 import 경로가 `@rhymix-ts/file`로 갱신되었다.

2. **AC-FILE-B1 (Image Pipeline + Cover Image, REQ-FILE-030, REQ-FILE-033, MASTER-PLAN line 316)**:
   GIVEN 인증된 member + `write_document` 권한이 있는 board의 document(id=42, uploadedCount=0, 첨부 없음), WHEN `POST /api/files/upload` 로 1920x1080 jpeg(2MB)를 multipart 전송 (`uploadTargetType: DOCUMENT, uploadTargetId: 42`), THEN HTTP 200 + 응답에 `{ id, width: 1920, height: 1080, coverImage: true }` + DB 검증: FileAttachment row 1개 + `coverImage: true` + storage에 원본 + `.thumb.webp` + `.small.webp` + `.medium.webp` + `.large.webp` 5개 객체 존재 + Document.uploadedCount === 1.

3. **AC-FILE-B2 (Cascading Soft Delete on document.deleted, REQ-FILE-040, MASTER-PLAN line 315)**:
   GIVEN Document(id=42)에 첨부된 FileAttachment 3개(`isvalid: true`), WHEN SPEC-DOCUMENT-001의 `softDeleteDocument(42)`가 호출되고 `document.deleted` event가 발행, THEN (이벤트 구독 후) 3개 FileAttachment의 `isvalid`가 모두 `false`로 변경되고 storage 객체는 즉시 삭제되지 않음 (cleanup cron 대상). Document.uploadedCount는 그대로 (deletedAt 검증은 document 도메인 책임이며, file은 isvalid만 토글).

4. **AC-FILE-B3 (MIME Validation + Virus Scan, REQ-FILE-024, REQ-FILE-062)**:
   GIVEN ClamAV daemon이 활성화되고 EICAR test file을 multipart 업로드, WHEN POST /api/files/upload, THEN HTTP 422 (UNPROCESSABLE_CONTENT) + body에 `{ error: { code: 'VIRUS_DETECTED', threats: ['Eicar-Test-Signature'] } }` + storage에는 객체가 잠시 존재했다가 즉시 삭제됨 (storage.delete 호출 확인) + FileAttachment row 미생성.

5. **AC-FILE-B4 (Storage Backend Selectable, REQ-FILE-050, REQ-FILE-052)**:
   GIVEN `STORAGE_BACKEND=local` + `RX_LOCAL_STORAGE_ROOT=/tmp/test-uploads`, WHEN multipart upload + download flow를 실행, THEN 파일이 `/tmp/test-uploads/attachments/{yyyy}/{mm}/...`에 저장되고 `GET /api/files/[id]/download` 응답이 streaming binary로 정상 반환. (S3 mode는 별도 test에서 검증, 본 acceptance는 local mode 충분.)

상세 Given-When-Then scenarios + edge cases는 `plan.md` Section "Acceptance Gates per Slice" 참조.

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

신규 코드는 **`packages/file/`** 독립 패키지에 둔다 (MASTER-PLAN-002 Section 1 line 70 + Section 9.1-4 신규 패키지 5개 추가 결정). 패키지 의존성:
- 의존: `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/auth`(Actor type), `zod`, `sharp`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, optional `clamscan`
- 비의존: `@rhymix-ts/board`, `@rhymix-ts/document`, `@rhymix-ts/comment` (REQ-FILE-011, 012)
- 외부에서 의존됨: `apps/web` (직접 호출), `packages/board`(잔존 callsite 있다면), 이벤트 구독으로는 document/comment

### 5.2 Characterization Tests로 회귀 가드

Slice A는 behavior change zero. 보장 메커니즘 (SPEC-DOCUMENT-001 5.2와 동일 패턴):
- 기존 test 파일은 그대로 이동 (path만 변경)
- vitest workspace에서 자동으로 `packages/file/**/*.test.ts` 발견
- import 경로는 mechanical replace: `from '@rhymix-ts/board/...'` → `from '@rhymix-ts/file/...'`
- snapshot tests는 없음 (현재 codebase 확인 — storage/attachment는 plain assertion)

### 5.3 Sharp 파이프라인 (Slice B 신규)

**사용 시점**: `completeUpload` 또는 `POST /api/files/upload`에서 mimeType이 이미지일 때.

**파이프라인 단계**:
1. `sharp(buffer)` 인스턴스화
2. `.metadata()` → width, height, format, hasAnimation 확인
3. EXIF orientation 자동 회전: `.rotate()` (auto-orientation은 sharp 기본 동작)
4. exif strip: `.withMetadata({ exif: false })` (또는 전체 metadata 제거)
5. 원본 저장 (`storage.write({ key: storageKey, body: ... })`)
6. variants 병렬 생성 (Promise.all):
   - thumb: `.resize(200, 200, { fit: 'inside' }).webp({ quality: 80 })`
   - small (longest > 480): `.resize(480, 480, { fit: 'inside' }).webp({ quality: 80 })`
   - medium (longest > 1024): `.resize(1024, 1024, { fit: 'inside' }).webp({ quality: 80 })`
   - large (longest > 2048): `.resize(2048, 2048, { fit: 'inside' }).webp({ quality: 80 })`
7. 각 variant 결과를 `storage.write({ key: '{storageKey}.{variant}.webp', ... })`

**Animated GIF 처리**: `metadata.pages > 1`이면 variants 스킵, thumb는 첫 페이지만 (`.gif({ animated: false })`).

**오류 처리**: sharp가 throw하면 catch + log + 원본만 저장 (REQ-FILE-037).

### 5.4 Multipart Route Handler

**Next.js 16 App Router** Route Handler:
```typescript
// apps/web/app/api/files/upload/route.ts
export async function POST(req: NextRequest) {
  // 1) 세션 검증
  const session = await getServerSession();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  // 2) formData 파싱 (Next 자체 multipart)
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return new Response('No file', { status: 400 });

  // 3) MIME + size 검증
  assertMimeAllowed(file.type);
  assertSizeAllowed(file.type, file.size);

  // 4) storage write (streaming)
  const storage = getStorage();
  const storageKey = `attachments/.../${randomUUID()}.${ext}`;
  await storage.write({ key: storageKey, body: file.stream(), contentType: file.type });

  // 5) virus scan
  const scanner = getScanner();
  const scanResult = await scanner.scan({ storageKey, storage, knownContentType, knownSize });
  if (!scanResult.clean) {
    await storage.delete(storageKey);
    return Response.json({ error: 'VIRUS_DETECTED', threats: scanResult.threats }, { status: 422 });
  }

  // 6) image pipeline (if image)
  let width, height, coverImage = false;
  if (isImage(file.type)) {
    const result = await imagePipeline.process({ storage, storageKey, originalBuffer });
    width = result.width;
    height = result.height;
    coverImage = await autoDetectCoverImage(documentId, prisma);
  }

  // 7) DB 트랜잭션
  const attachment = await prisma.fileAttachment.create({ ... });
  documentEvents.emit('file.uploaded', { ... });

  return Response.json({ id: attachment.id, ... });
}
```

**Next 16 multipart 한계**: `formData()`는 메모리에 전체 buffer를 적재한다. 매우 큰 파일(>50MB)은 streaming 처리가 안 됨 → 큰 파일은 2-step presigned 프로토콜 권장. 본 endpoint는 ~10MB 미만 시나리오에 최적.

### 5.5 Cascading Delete 이벤트 구독

**부트스트랩**: `apps/web/lib/file-init.ts`:
```typescript
import { documentEvents } from '@rhymix-ts/document';
import { commentEvents } from '@rhymix-ts/comment';
import { registerFileEventSubscribers } from '@rhymix-ts/file';

registerFileEventSubscribers(
  { documentEvents, commentEvents },
  { prisma, storage: getStorage() },
);
```

**호출 위치**: Next.js `instrumentation.ts`(boot once) 또는 첫 request 시 idempotent 호출. (Slice B에서 정확한 위치 결정.)

**Subscriber 구현** (`packages/file/src/events.ts`):
```typescript
export function registerFileEventSubscribers(
  emitters: { documentEvents: DocumentEmitter; commentEvents: CommentEmitter },
  ctx: { prisma: PrismaClient; storage: FileStorage },
) {
  emitters.documentEvents.on('document.deleted', async ({ documentId }) => {
    await cascadeDeleteByDocument({ documentId }, ctx).catch(logFailure);
  });
  emitters.documentEvents.on('document.purged', async ({ documentId }) => {
    await cascadeHardDeleteByDocument({ documentId }, ctx).catch(logFailure);
  });
  emitters.documentEvents.on('document.restored', async ({ documentId }) => {
    await cascadeRestoreByDocument({ documentId }, ctx).catch(logFailure);
  });
  emitters.commentEvents.on('comment.deleted', async ({ commentId }) => {
    await cascadeDeleteByComment({ commentId }, ctx).catch(logFailure);
  });
}
```

**약결합 보장**: document/comment 패키지는 file을 import하지 않는다. file 패키지가 emitters를 외부에서 inject받아 subscribe. 이는 circular dependency 방지 + 테스트 격리에 도움.

### 5.6 ClamAV 통합 (Slice B)

**현재 stub**: `packages/board/src/storage/clamav.ts`가 존재하나 implementation은 비어있음(추정 — Slice A 이동 후 검증).

**선택지**:
- 옵션 (a): `clamscan` npm 패키지 (clamd TCP socket 통신)
- 옵션 (b): `node-clam` 패키지 (deprecated, 비권장)
- 옵션 (c): HTTP REST API wrapper (clamav-rest server) — extra deploy

**권고**: 옵션 (a) `clamscan` (Open Question Q1 결정 사항). dev/test는 NoopScanner, production은 ClamAVScanner.

**fail-closed default** (REQ-FILE-063, 064): daemon 없으면 업로드 거부. 명시적 `CLAMAV_FAIL_OPEN=true`로만 허용 (Open Question Q1).

### 5.7 cover_image 자동 판정

**알고리즘** (REQ-FILE-033):
1. 새 image가 업로드되고 documentId가 설정됨
2. `prisma.fileAttachment.count({ where: { documentId, coverImage: true, isvalid: true } })` → 0이면 자동 cover_image 후보
3. 같은 batch에서 첫 image만 자동 cover (batch upload 시 race 회피 — 순차 처리 또는 first-write-wins)

**명시적 변경**: 사용자가 admin UI에서 다른 첨부를 cover로 지정 시 `setCoverImage` 호출 → 트랜잭션 안에서 기존 cover clear + 신규 set.

### 5.8 LocalDiskStorage (Slice A 신규)

현재 `memory.ts`(test), `s3.ts`(production)만 존재. dev 친화를 위해 `LocalDiskStorage` 추가:

```typescript
export class LocalDiskStorage implements FileStorage {
  constructor(private readonly root: string) {}

  async getUploadPresignedUrl(input) {
    // local은 presign 미지원 → 클라이언트는 multipart route 사용 권장
    throw new Error('LocalDiskStorage does not support presigned upload');
  }

  async write({ key, body, contentType }) {
    const full = path.join(this.root, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    if (body instanceof ReadableStream) {
      await pipeline(Readable.fromWeb(body as any), fs.createWriteStream(full));
    } else {
      await fs.writeFile(full, body);
    }
  }

  async read(key) {
    return fs.readFile(path.join(this.root, key));
  }

  async head(key) {
    try {
      const stat = await fs.stat(path.join(this.root, key));
      return { size: stat.size, lastModified: stat.mtime };
    } catch {
      return null;
    }
  }

  async delete({ key }) {
    await fs.unlink(path.join(this.root, key)).catch(() => {}); // best-effort
  }

  async getDownloadUrl({ key }) {
    // local은 presign 없음 → app 내부 route handler를 가리키는 URL 반환
    return `/api/files/by-key/${encodeURIComponent(key)}/download`;
  }
}
```

**S3 대비 단순화**: presign 미지원, 대신 app route handler가 streaming.

### 5.9 이벤트 emit의 트랜잭션 경계

(SPEC-DOCUMENT-001 5.6과 동일 원칙) — emit은 **트랜잭션 commit 후**에 수행. file.uploaded는 prisma.$transaction 종료 후에 호출.

### 5.10 ID 타입 일관성

- FileAttachment.id: Int (autoincrement)
- FileAttachment.fileSrl: BigInt? (legacy migration)
- FileAttachment.documentId: Int? → Document.id (Int)
- FileAttachment.commentId: Int? → Comment.id (Int)
- FileAttachment.fileSize: BigInt (50MB+ 파일 대비)
- FileAttachment.memberId: String? (cuid)

cursor에 BigInt 사용 시 직렬화 주의 (SPEC-DOCUMENT-001 5.9 동일).

### 5.11 multipart vs presigned 의사결정 트리

| 시나리오 | 권장 프로토콜 | 이유 |
|---|---|---|
| <10MB, RSC form submit | multipart route | 단순, server-side에서 다 처리 |
| 10~50MB, browser drag-and-drop | 2-step presigned | client → S3 직접 PUT, server bandwidth 절약 |
| >50MB | 2-step + multipart S3 (REQ-FILE-053 threshold) | aws-sdk가 자동 chunk |
| local backend | multipart route only | local에는 presign 없음 |
| server-side server action | direct service function (requestUpload/completeUpload) | route handler 불필요 |

### 5.12 board → file 의존 정리

Slice A 종료 시점 `packages/board/package.json`에 `@rhymix-ts/file` dependency 추가 (board 내부에서 file을 호출하는 callsite는 거의 없으나, 만일 board service가 attachment를 함께 처리하는 코드가 있다면 file 패키지를 import). 일반적으로는 board는 file을 직접 호출하지 않으며, 호출자는 apps/web 또는 document/comment의 caller layer.

---

## 6. Risks & Mitigations

상세는 `research.md` 참조. 핵심 7가지:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| board → file import 경로 누락으로 apps/web 빌드 실패 | 중간 | 높음 | Slice A 종료 직전 `pnpm tsc --noEmit` + `pnpm build` 전체 통과 확인. file은 board re-export shim 없이도 동작해야 함(REQ-FILE-096). |
| sharp 네이티브 의존성으로 인한 monorepo install 실패 | 중간 | 높음 | `sharp`는 platform-specific binary 의존. pnpm-lock.yaml에 OS별 entry 포함 확인. CI에서 linux + windows 모두 테스트. |
| ClamAV daemon 없는 환경에서 업로드 막힘 | 중간 | 높음 | fail-open mode (REQ-FILE-064) opt-in 환경변수. CI/test는 NoopScanner 기본. |
| Cascading delete 이벤트 구독이 boot timing 이슈로 누락 | 중간 | 높음 | `registerFileEventSubscribers`를 instrumentation.ts(boot once)에서 호출 + idempotency 보장. Slice B에서 e2e test로 검증. |
| 이미지 variants 5배 storage 증가 | 낮음 | 중간 | webp + q=80으로 압축. 평균 variant 크기 원본의 30~50%. 총 storage는 원본의 ~2배. 이는 explicit trade-off. |
| 동시 업로드 시 cover_image race condition | 중간 | 낮음 | 자동 cover 판정은 batch 첫 image만. 명시적 setCoverImage는 트랜잭션. race 발생 시 마지막 write가 wins. |
| FileAttachment.coverImage 컬럼은 boolean이라 multiple cover 가능 | 낮음 | 중간 | setCoverImage 트랜잭션이 기존 cover를 clear 후 set. unique constraint는 적용 안 함 (multiple history 허용). |
| presigned URL 만료 후 client 재시도 부담 | 낮음 | 낮음 | URL TTL 기본 5분(upload), 10분(download). 클라이언트는 expiresAt를 받아 만료 전 재발급 가능. |

---

## 7. Open Questions

본 SPEC 작성 시점에 미해결인 4가지. 해결 없이 Slice A는 시작 가능 — 사용자가 `/moai run` 호출 전 결정 권장.

1. **Q1 — ClamAV opt-in 정책 (default: 활성 vs 비활성)**:
   - 옵션 (a) Default `noop` (현재 stub 동작과 동일) — dev/test 친화, production은 명시적 `VIRUS_SCAN_BACKEND=clamav` 설정 필요
   - 옵션 (b) Default `clamav` + `CLAMAV_FAIL_OPEN=true` — 보안 우선, 운영자가 daemon 설치를 잊어도 자연스레 fail-open
   - 옵션 (c) Default `clamav` + fail-closed — 가장 안전하나 onboarding 마찰
   - **권고: 옵션 (a)**. dev/test 친화 + 보안은 production 환경변수 명시 책임. README 가이드로 보강.

2. **Q2 — S3 multipart upload threshold**:
   - 옵션 (a) 5MB (AWS SDK 기본) — 작은 파일에도 multipart, low overhead
   - 옵션 (b) 50MB — 중간 크기까지 단일 PUT, 큰 파일만 chunk
   - 옵션 (c) 100MB — 거의 모든 시나리오를 single PUT으로
   - **권고: 옵션 (b) 50MB**. presigned single PUT은 5MB까지가 권장이지만, 본 SPEC의 use case(이미지/문서 위주)는 대부분 50MB 미만. multipart는 50MB 초과 시만.

3. **Q3 — 이미지 variant 사이즈 defaults (small/medium/large 픽셀)**:
   - 옵션 (a) **small=480, medium=1024, large=2048 (현재 spec.md 권고)** — 모바일/태블릿/데스크톱 표준
   - 옵션 (b) small=320, medium=768, large=1920 — 더 작은 cap
   - 옵션 (c) small=640, medium=1280, large=2560 — 더 큰 cap (Retina 친화)
   - **권고: 옵션 (a)**. board 게시판 UI의 일반적 reading width에 부합. Retina 시나리오는 medium도 충분.

4. **Q4 — 파일 사이즈 한도 defaults**:
   - 옵션 (a) **현재 mime.ts 정의 (image 10MB, pdf 20MB, docx 20MB, txt 5MB, zip 50MB)** — 보수적
   - 옵션 (b) 모두 100MB 통일 — 단순화
   - 옵션 (c) board-level config로 위임 (system default는 매우 큰 200MB) — 운영자 결정
   - **권고: 옵션 (a)**. 보수적 default + board-level override는 백로그(`Board.uploadConfig` JSON 추가는 별도 SPEC).

위 4개 모두 SPEC 합의가 강제되진 않으며, 구현 detail은 expert-backend가 Slice 진행 중 결정.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **WYSIWYG 에디터 통합(이미지 drag-and-drop, paste upload)** — 후속 SPEC. multipart endpoint + REST만.
2. **CDN 통합 (CloudFront, Cloudflare R2 signed URL)** — 백로그. 현재 presigned URL로 충분.
3. **첨부 파일 admin 검색 UI (mime/사이즈/날짜 필터)** — Phase 5 SPEC-ADMIN-EXTRAS-001.
4. **비디오 트랜스코딩 (ffmpeg pipeline)** — 백로그. 정적 이미지 + 일반 파일만.
5. **파일별 ACL 매트릭스 (per-file read permission)** — 첨부된 document/comment ACL 상속만. file-level ACL은 백로그.
6. **PDF/이미지 OCR / 메타데이터 추출** — 백로그.
7. **자동 cleanup cron (orphan FileAttachment 회수)** — SPEC-INFRA-001 이월. 본 SPEC은 hook point + admin manual purge만.
8. **`files_changelog` 레거시 테이블 (파일 변경 이력)** — 현재 Prisma 모델 없음. 백로그.
9. **외부 OAuth 기반 import (Google Drive, Dropbox)** — 본 SPEC 범위 외.
10. **`editor.deleteSavedDoc` 이벤트 cascading** — SPEC-DOCUMENT-001의 `document.deleted` (TEMP 상태 포함)로 통합 처리.
11. **데이터 마이그레이션 (PHP `files` → TS `file_attachments`)** — 별도 SPEC.
12. **board-level upload config (`Board.uploadConfig` JSON 컬럼)** — Open Question Q4 권고에 따라 백로그.
13. **이미지 on-the-fly resize (`/api/files/{id}?width=320` 형태)** — REQ-FILE-039. 모든 variants는 upload 시점 생성.
14. **animated webp 변환** — REQ-FILE-032. gif는 첫 프레임 thumb만.
15. **파일별 다운로드 카운트 dashboard** — `downloadCount` 컬럼은 존재하나 admin UI는 Phase 5.
16. **storage backend 간 자동 마이그레이션 (S3 ↔ local 이전 도구)** — REQ-FILE-057은 type signature만, 실구현은 백로그.
17. **첨부 파일 압축/암호화 (transparent encryption at rest)** — 백로그. S3 SSE 등 cloud-side encryption 권장.
18. **`packages/file/src/storage/clamav.ts`의 advanced features** (multi-engine, sandboxing) — 기본 clamd TCP 통신만.
19. **file embed widget (위젯 시스템에서 file 참조)** — SPEC-WIDGET-001 별도 처리.
20. **첨부 파일별 view permission audit log** — `file_attachment_views` 테이블 등은 미도입.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC 범위를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: ~65 total (~40 relocated + ~25 new in Slice B, MP-002 target ~20 — 이미지 + virus + cascading은 본질적으로 더 많은 테스트 필요)
Estimated Slice Count: 2 (A: packages 분리, B: upload API + image + cascading)
Dependencies (upstream): SPEC-AUTH-001 (Actor/session), SPEC-ADMIN-001 (module registry), SPEC-DOCUMENT-001 (document.deleted/purged/restored event 발행), SPEC-COMMENT-001 (comment.deleted event 발행)
Blocks (downstream): SPEC-POINT-001 (Phase 3 병행 — 별도), SPEC-ADDON-001 (Phase 4 photoswipe addon이 이미지 variants 소비), SPEC-ADMIN-EXTRAS-001 (Phase 5 file admin UI)
