---
spec: SPEC-FILE-001
phase: 3
parent-research: MASTER-PLAN-002/research.md
created: 2026-05-27
language: ko
---

# Research — SPEC-FILE-001 (File Upload & Management Domain)

본 research는 MASTER-PLAN-002/research.md Section 1.7 (line 239~270) 를 단일 진실 공급원으로 인용하고, 본 SPEC 범위에 한정해 **레거시 schemas/files.xml 컬럼 매핑**, **module.xml 액션 → tRPC procedure 매핑**, **cross-module 이벤트 핸들러 인벤토리**, **MIME + virus scan 전략 결정**, **storage backend 선택 정당화**를 보강한다. 중복 서술은 금지하며 인용으로 갈음한다.

---

## 1. 인용 (Single Source of Truth)

다음 항목은 MP-002/research.md에서 이미 정리되었으므로 본 문서에서는 반복하지 않는다.

- 레거시 file 모듈 경로 및 핵심 테이블: MP-002/research.md line 239~246
- module.xml 액션 + 이벤트 핸들러 인벤토리: MP-002/research.md line 247~253
- 도메인 책임 (업로드/리사이즈/cover image/isvalid): MP-002/research.md line 254~261
- 현재 Rhymix-TS 매핑 현황 (`FileAttachment` Prisma 모델, `packages/board/src/storage` 위치): MP-002/research.md line 262~270

본 SPEC은 위 사실을 전제로 한다. 본 research는 보강만 한다.

---

## 2. Legacy 스키마 → Prisma 모델 매핑 표 (보강)

D:\project\rhymix\modules\file\schemas\ 의 2개 XML 스키마를 Prisma `FileAttachment` 모델과 1:1 매핑한다.

### 2.1 files.xml → FileAttachment

| Legacy 컬럼 (files.xml) | Prisma 모델 (현재) | 상태 | SPEC-FILE-001 처리 |
|---|---|---|---|
| `file_srl` (BigInt, PK) | `id Int @id @default(autoincrement())` + `fileSrl BigInt? @unique` | 이중 매핑 — id는 신규 PK, fileSrl은 legacy migration용 | 그대로 보존 (REQ-FILE-002) |
| `upload_target_srl` (BigInt) + `upload_target_type` (varchar) | `uploadTargetType UploadTargetType` enum + `documentId Int?` OR `commentId Int?` | 정규화 (target type별 분리) | 그대로 보존 (REQ-FILE-003, 004) |
| `module_srl` (BigInt) | (직접 컬럼 없음 — Document/Comment의 boardId/moduleInstanceId로 derived) | derived | 그대로 보존 — file은 document/comment의 boardId 간접 참조 |
| `member_srl` (BigInt) | `memberId String?` (cuid) | 타입 변환 (BigInt → String) | 그대로 보존 |
| `direct_download` (char Y/N) | `directDownload Boolean @default(false)` | enum → boolean | 그대로 보존 |
| `source_filename` (varchar) | `sourceFilename String` | 동일 | 그대로 보존 (REQ-FILE-002) |
| `uploaded_filename` (varchar) | `uploadedFilename String` | 동일 | 그대로 보존 |
| `download_count` (int) | `downloadCount Int @default(0)` | 동일 | 그대로 보존 |
| `file_size` (BigInt) | `fileSize BigInt` | 동일 | 그대로 보존 |
| `comment_count` (int) | (없음) | **GAP** — legacy는 파일별 댓글 카운트 보유, 현재는 미구현 | 백로그 — 파일별 댓글 기능은 미포팅 (`document_comment.count` 자체가 미흡한 상황) |
| `sympathy_count` (int) | (없음) | **GAP** — 파일별 추천 카운트 | 백로그 |
| `mime_type` (varchar) | `mimeType String` | 동일 | 그대로 보존 |
| `width` (int) | `width Int?` | nullable화 | 그대로 보존 |
| `height` (int) | `height Int?` | nullable화 | 그대로 보존 |
| `duration` (int, 동영상) | `duration Int?` | 그대로 | 그대로 보존 (비디오는 본 SPEC 범위 외이나 컬럼은 유지) |
| `cover_image` (char Y/N) | `coverImage Boolean @default(false)` | enum → boolean | 그대로 보존 (REQ-FILE-009) — 단 service layer에서 자동 판정 (REQ-FILE-033) |
| `isvalid` (char Y/N) | `isvalid Boolean @default(true)` | enum → boolean | 그대로 보존 (REQ-FILE-007) |
| `ipaddress` (varchar) | (없음) | **GAP** — 업로더 IP 추적 | 백로그 — 보안 감사 용 |
| `regdate` (datetime) | `regdate DateTime @default(now()) @db.Timestamptz` | 동일 | 그대로 보존 |

추가 컬럼 (Prisma에만 존재):
- `storageKey String` — S3-style object key. 레거시는 `uploaded_filename`이 곧 경로였으나 분리됨.

### 2.2 files_changelog.xml → (없음)

| Legacy 컬럼 | Prisma 모델 | 상태 | SPEC-FILE-001 처리 |
|---|---|---|---|
| files_changelog (전체) | (없음) | **GAP** — 파일별 변경 이력 | 백로그 (SPEC Exclusions #8) |

레거시 `files_changelog`는 파일별 변경 이력 (이름/위치/소유자 변경). 본 SPEC은 immutable upload + cascade delete만 지원 → changelog 미구현.

### 2.3 GAP 우선순위 정리

- P2 (Phase 5+ 백로그): files_changelog, cover_image 자동 판정 정교화
- P3 (별도 SPEC): ipaddress 추적, comment_count/sympathy_count
- P3 (미포팅 확정): 파일별 댓글/추천 (file을 별도 entity로 분리하는 시나리오 — 본 SPEC은 첨부 모델만)

---

## 3. Legacy 액션 → tRPC 라우터 매핑

레거시 `modules/file/conf/module.xml`의 action을 tRPC procedure로 매핑한다.

| Legacy action | HTTP method | tRPC procedure (proposed) | Slice |
|---|---|---|---|
| `procFileUpload` | POST (multipart) | (tRPC X) → `POST /api/files/upload` Route Handler | B (REQ-FILE-021, 022) |
| `procFileIframeUpload` | POST (multipart legacy iframe) | (미포팅 — 모던 fetch API로 대체) | — |
| `procFileImageResize` | POST | (자동 — image-pipeline.ts가 upload 시 모두 생성) | B (REQ-FILE-030~037) |
| `procFileDelete` | POST | `file.delete` (protected) | B (REQ-FILE-072) |
| `procFileSetCoverImage` | POST | `file.setCoverImage` (protected) | B (REQ-FILE-034, 072) |
| `procFileDownload` | GET/POST | `GET /api/files/[id]/download` Route Handler | B (REQ-FILE-076) |
| `procFileOutput` | GET/POST | (자동 — same as download) | B |
| `procFileGetList` | (admin only) | `file.admin.listOrphans` | B (REQ-FILE-073) |
| `dispFileAdminList` | GET (admin view) | (UI는 Phase 5 SPEC-ADMIN-EXTRAS-001) | (Phase 5) |
| `dispFileAdminEdit` | GET | (Phase 5) | (Phase 5) |
| `dispFileAdminUploadConfig` | GET | (Phase 5 — Board.uploadConfig 도입 시) | (백로그) |
| `procFileAdminDeleteChecked` | POST | `file.admin.purgeOrphans` (batch) | B (REQ-FILE-073) |
| `procFileAdminInsertModuleConfig` | POST | (Board.uploadConfig 백로그) | (백로그) |

본 SPEC Slice B에서 위 매핑에 따라 `packages/file/src/server/router.ts` 작성. legacy action 32개 중 본 SPEC 범위는 ~10개, 나머지는 Phase 5 또는 백로그.

---

## 4. Cross-module 이벤트 핸들러 인벤토리 (Cascading Delete)

레거시 modules/file가 다른 모듈로부터 수신하는 이벤트 (D:\project\rhymix\modules\file\conf\module.xml `<eventHandlers>` 직접 인용):

수신 이벤트 (cascading 동작):

| Legacy 이벤트 | 레거시 핸들러 | 본 SPEC 매핑 | REQ |
|---|---|---|---|
| `after document.deleteDocument` | `file.controller.triggerDeleteAttached` | `document.deleted` event subscribe → `cascadeDeleteByDocument` | REQ-FILE-040 |
| `after comment.deleteComment` | `file.controller.triggerCommentDeleteAttached` | `comment.deleted` event subscribe → `cascadeDeleteByComment` | REQ-FILE-041 |
| `after editor.deleteSavedDoc` | `file.controller.triggerDeleteAttached` (동일 메서드 재사용) | `document.deleted` (TEMP status 포함)로 통합 — Exclusions #10 | (미구현) |
| `after module.deleteModule` | `file.controller.triggerDeleteModuleFiles` | 별도 hook 미제공 — 모듈 삭제는 admin 작업 → admin 도구가 명시적 cascade 호출 | (백로그) |
| `after module.procModuleAdminCopyModule` | `file.controller.triggerCopyModule` | 모듈 복제 시 첨부 복제 — 본 SPEC 범위 외 | (백로그) |
| `after document.moveDocumentModule` | `file.controller.triggerMoveDocument` | 문서 이동 시 첨부 이동 — 본 SPEC 범위 외 | (백로그) |
| `before document.copyDocumentModule.each` | `file.controller.triggerAddCopyDocument` | 문서 복제 시 첨부 복제 | (백로그) |
| `before comment.copyCommentByDocument.each` | `file.controller.triggerAddCopyCommentByDocument` | 댓글 복제 시 첨부 | (백로그) |
| `before module.dispAdditionSetup` | `file.view.triggerDispFileAdditionSetup` | admin UI 주입 (모듈 추가 설정에 file 탭) | (Phase 5) |

본 SPEC은 위 9개 중 **3개만 구현** (document.deleted, document.purged, document.restored, comment.deleted — REQ-FILE-040~043). 나머지는 운영 도구 또는 백로그.

발신 이벤트 (file이 emit, 향후 subscriber용):

| 본 SPEC 이벤트 | Payload | 용도 |
|---|---|---|
| `file.uploaded` | `{ attachmentId, documentId?, commentId?, memberId?, fileSize, mimeType }` | point award (Phase 3 SPEC-POINT-001), audit log |
| `file.attached` | `{ attachmentId, documentId? OR commentId? }` | 첨부 연결 추적 |
| `file.deleted` | `{ attachmentId, reason: 'cascade' \| 'user' \| 'admin' }` | audit log |
| `file.cover-image-changed` | `{ documentId, prevCoverId?, newCoverId? }` | UI revalidation |
| `file.virus-detected` | `{ storageKey, mimeType, threats, memberId? }` | admin notification, abuse 추적 |

---

## 5. Storage Backend 선택 정당화

### 5.1 현재 구현 인벤토리

`packages/board/src/storage/` 디렉토리 (Slice A에서 packages/file로 이동):

| 파일 | LoC (추정) | 책임 | 본 SPEC 처리 |
|---|---|---|---|
| `types.ts` | ~100 | `FileStorage` + `VirusScanner` 인터페이스 | 그대로 + `write`/`read` 메서드 추가 (REQ-FILE-051) |
| `memory.ts` | ~120 | `InMemoryStorage` — test only | 그대로 + write/read 추가 |
| `s3.ts` | ~200 | `S3Storage` — AWS SDK v3 기반 | 그대로 + write/read 추가 |
| `scanner.ts` | ~80 | `NoopScanner` + scanner factory | 그대로 |
| `clamav.ts` | ~50 (stub) | `ClamAVScanner` — 현재 stub | Slice B에서 실구현 (REQ-FILE-061~063) |
| `mime.ts` | ~150 | MIME allowlist + size limits | 그대로 (REQ-FILE-024) |
| `upload-token.ts` | ~80 | HMAC-SHA256 토큰 sign/verify | 그대로 |

### 5.2 LocalDiskStorage 추가 정당화 (REQ-FILE-019)

**Why add**: 현재 InMemoryStorage는 test only, S3Storage는 AWS 의존. dev/소규모 운영 환경(예: self-host 게시판)은 별도 backend 필요.

**Alternatives considered**:
- **옵션 (a) MinIO** — S3-compatible self-host. Docker container 띄우면 S3Storage 그대로 동작. **장점**: zero code change. **단점**: docker dep, S3-style overhead.
- **옵션 (b) LocalDiskStorage 추가** — `process.env.RX_LOCAL_STORAGE_ROOT` 디렉토리에 직접 저장. **장점**: 의존성 zero, dev 친화. **단점**: presigned URL 미지원 → multipart route handler 의존.
- **옵션 (c) IndexedDB / SQLite blob** — 단일 binary 배포 친화. **단점**: 큰 파일에 부적합, query overhead.

**선택**: **옵션 (b)**. MASTER-PLAN-002 Section 9.1-6 line 498 결정 사항 "S3 + 로컬 추상화 (StorageDriver 인터페이스) — 환경변수 `STORAGE_BACKEND`(local|s3)로 선택"과 일치.

### 5.3 multipart upload threshold (Open Question Q2)

레거시 PHP는 단일 `move_uploaded_file()` 호출 (no chunking). TS는 AWS SDK v3가 자동 multipart 지원 (default 5MB threshold).

**선택**: 50MB (Open Question Q2 권고). 대부분의 이미지/문서는 50MB 미만 → single PUT으로 처리. 큰 zip(50MB+)만 multipart chunks. presigned URL TTL 5분으로 단일 PUT 충분.

---

## 6. MIME + Virus Scan 전략 결정 (Open Question Q1 보강)

### 6.1 MIME Allowlist 정당화

현재 `packages/board/src/storage/mime.ts`의 allowlist (REQ-FILE-024):

| 카테고리 | 허용 MIME | 사이즈 한도 | 정당화 |
|---|---|---|---|
| 이미지 | jpeg, png, gif, webp | 10 MB | 게시판 일반 사용 case. AVIF/HEIC는 미포함(브라우저 호환성). |
| PDF | application/pdf | 20 MB | 첨부 문서 표준 |
| Office | docx, xlsx, pptx, odt | 20 MB | 비즈니스 use case |
| Plain text | txt, md, csv | 5 MB | 메모/로그 첨부 |
| 압축 | zip | 50 MB | 소스코드, 백업 파일 |
| **거부** | exe, bat, sh, cmd, msi, dll, etc. | — | 실행 파일 (REQ-FILE-026) |

**Future considerations** (백로그):
- 비디오 (mp4, webm) — 본 SPEC Exclusions #4
- 오디오 (mp3, wav, ogg) — 백로그
- AVIF/HEIC — 브라우저 호환성 확인 후 추가
- SVG — XSS 위험으로 신중 (sanitize 필요)

### 6.2 ClamAV 활성화 정책 (Q1)

**Production 시나리오별 권고**:

| 환경 | `VIRUS_SCAN_BACKEND` | `CLAMAV_FAIL_OPEN` | 정당화 |
|---|---|---|---|
| dev / CI | noop | — | 빠른 iteration |
| staging | clamav | false (fail-closed) | production parity |
| production (보안 우선) | clamav | false | 감염 파일 거부 (사용자 마찰 감수) |
| production (가용성 우선) | clamav | true | daemon 다운 시 업로드 허용 (audit log) |

**Default 결정** (Open Question Q1 답): **`noop`**. 이유:
- dev/test 친화 (대부분의 contributor가 ClamAV daemon 설치하지 않음)
- production 설정은 명시적 (운영자 책임)
- README에 production 권장 설정 가이드 포함

### 6.3 ClamAV 통합 라이브러리

**옵션**:
- **옵션 (a) `clamscan`** (https://www.npmjs.com/package/clamscan) — 가장 인기, clamd TCP socket 또는 clamscan binary 직접 호출 지원. 최근 maintained (2025년 update). **권고**.
- **옵션 (b) `node-clam`** — deprecated. 비권장.
- **옵션 (c) custom HTTP REST** — clamav-rest container wrapper. extra deploy 부담.

**선택**: 옵션 (a) `clamscan`. peer dependency만 추가 (`clamscan` 패키지 + 호스트 측 clamd daemon).

---

## 7. 이미지 처리 라이브러리 선택

### 7.1 후보

| 라이브러리 | Pros | Cons | 추정 install size |
|---|---|---|---|
| **sharp** | 가장 빠름 (libvips 기반), Next.js 16 권장, 모든 일반 포맷 지원 | 네이티브 바이너리 (platform-specific) | ~30MB (per platform) |
| jimp | Pure JS (no native dep) | 느림, 큰 이미지에 부적합 | ~10MB |
| @squoosh/lib | WebAssembly 기반 | 작은 이미지에 좋으나 큰 이미지 메모리 부담 | ~20MB |
| imagemagick (CLI) | 가장 다양한 포맷 | 외부 binary 필요, 호환성 부담 | (외부) |

**선택**: **sharp**. 이유:
- Next.js 16 image optimization이 이미 sharp를 사용 (이미 설치된 가능성 높음)
- 성능이 압도적 (libvips는 ImageMagick보다 4~5배 빠름)
- EXIF strip + auto-rotate 등 본 SPEC 요구사항 모두 native 지원
- platform binary는 pnpm-lock.yaml에 entry 명시로 해결

### 7.2 variant 사이즈 defaults (Open Question Q3)

**참고 자료**:
- WordPress 기본: thumbnail 150, medium 300, large 1024 (대각선 픽셀 기준)
- Tumblr/Instagram: 320 / 640 / 1080 / 2048
- Twitter/X: 240 / 480 / 1200 / 4096
- 본 SPEC 권고 (Q3 옵션 a): 200 (thumb) / 480 (small) / 1024 (medium) / 2048 (large)

**선택 정당화**:
- 200 thumb: 게시판 목록 첨부 미리보기에 적합
- 480 small: 모바일 portrait width 최대값
- 1024 medium: tablet/일반 데스크톱 reading width
- 2048 large: Retina 2x display + 4K cap

board UI의 일반적 use case(content width 800~1200px)에 부합. Retina 시나리오는 medium도 충분.

### 7.3 변환 포맷 결정

| 입력 | 원본 저장 | variants |
|---|---|---|
| jpeg | jpeg (re-encoded with rotation/exif strip) | webp |
| png | png | webp |
| gif (static) | gif | webp |
| gif (animated) | gif | webp thumb only (first frame) |
| webp | webp | webp |

**Why webp variants**: 평균 30% 작은 파일 크기, 모든 현대 브라우저 지원 (Safari 14+, Chrome/Edge/FF). 원본은 backward compat 위해 원본 포맷 유지.

---

## 8. presigned URL vs Server-side proxy 비교

### 8.1 download path 결정

| 시나리오 | 권장 path | 이유 |
|---|---|---|
| S3 backend + public file | `getDownloadUrl` (presigned GET URL) → 302 redirect | bandwidth 절약, server load 최소화 |
| S3 backend + SECRET document 첨부 | server-side proxy (storage.read → Response stream) | ACL 강제 (presigned URL은 만료 전까지 누구나 접근) |
| Local backend | server-side stream (fs.createReadStream) | local은 presign 없음 |
| 작은 파일 (<100KB) | 둘 다 가능 | 단순화를 위해 server proxy |

본 SPEC Slice B는 두 path 모두 지원하며, ACL 정책에 따라 자동 선택 (REQ-FILE-076).

---

## 9. Risks 추가 분석 (spec.md Section 6 보강)

### 9.1 Cascading delete의 트랜잭션 보장

**문제**: 현재 설계는 이벤트 기반 (`document.deleted` 발행 → file subscriber 비동기 처리). subscriber가 실패하면 file 첨부는 isvalid=true로 남으나 document는 deletedAt set.

**완화**:
- subscriber 실패는 log만, document 트랜잭션은 commit (eventual consistency)
- 재시도 메커니즘: `cascadeRebuild` admin 도구 (REQ-FILE-073)
- 향후 강화: 트랜잭션 outbox 패턴 (SPEC-INFRA-001 이월)

### 9.2 cover_image 단일 보장의 race condition

**문제**: 두 클라이언트가 동시에 같은 document에 setCoverImage 호출. Both update — last write wins.

**완화**:
- 자동 cover_image 판정은 batch 첫 image만 (race 회피)
- 명시적 setCoverImage는 트랜잭션 + serializable isolation (PostgreSQL default REPEATABLE READ로도 충분)
- 동시성 검증은 e2e test로 (Slice B B.6 작업)

### 9.3 sharp 네이티브 binary monorepo 호환성

**문제**: sharp는 platform-specific prebuilt binary (linux-x64, darwin-arm64, win32-x64 등) 다운로드. pnpm 환경에 따라 잘못된 platform binary가 캐시될 수 있음.

**완화**:
- pnpm-lock.yaml에 `optionalDependencies` 명시
- CI workflow에서 Windows + Linux 모두 `pnpm install --frozen-lockfile` 테스트
- Dockerfile (production)에서 `pnpm install --filter=apps/web... --prod` 후 sharp prebuilt 확인

### 9.4 이미지 variants 스토리지 비용

**문제**: 원본 + 4 variants = 5배 객체 수. 한 게시판에 10K image 첨부 시 50K storage object.

**완화**:
- webp 압축으로 평균 variant 30~50% 크기 (모든 variant 합 ≈ 원본 1.5~2배)
- S3는 lifecycle policy로 30일 후 IA tier 이동 가능 (별도 운영 가이드)
- local backend는 storage 용량 모니터링 필요 (운영 책임)

### 9.5 multipart route handler의 메모리 부담

**문제**: Next.js 16 `req.formData()`는 전체 buffer를 메모리에 적재. 50MB 파일 업로드 N건 동시 = NxN MB 메모리.

**완화**:
- multipart route는 ~10MB 파일에 권장 (mime.ts size limit 일관)
- 50MB+는 2-step presigned 프로토콜 사용 (client → storage 직접 PUT, server는 token 검증만)
- production은 Node `--max-http-header-size` + reverse proxy(nginx) body size limit으로 추가 보호

---

## 10. SPEC 작성 후 의사결정 사항 (Pending)

본 research 시점에 미해결인 사항 (spec.md Section 7 Open Questions과 동기):

1. **ClamAV opt-in 정책** (Q1) — 권고: default noop
2. **S3 multipart threshold** (Q2) — 권고: 50MB
3. **이미지 variant 사이즈** (Q3) — 권고: 200/480/1024/2048
4. **파일 사이즈 한도 defaults** (Q4) — 권고: 현재 mime.ts 정의 유지

위 4개는 expert-backend agent가 Slice B 진행 시 구체화. 본 research는 권고와 정당화만 제공.

---

## 11. References

- MASTER-PLAN-002/research.md Section 1.7 (line 239~270) — file 모듈 ground truth
- D:\project\rhymix\modules\file\conf\module.xml — action list + eventHandlers
- D:\project\rhymix\modules\file\schemas\files.xml — 레거시 컬럼 정의
- D:\project\rhymix\modules\file\schemas\files_changelog.xml — changelog 스키마 (백로그)
- packages/db/prisma/schema.prisma line 753~780 — FileAttachment 모델
- packages/board/src/storage/* — Slice A 이동 대상 8 files
- packages/board/src/attachment.ts (550+ LoC) — Slice A 이동 대상
- SPEC-DOCUMENT-001 REQ-DOC-132 — document.deleted/purged/restored/created/updated event 발행 (file이 구독)
- SPEC-COMMENT-001 REQ-COMMENT-?? — comment.deleted event 발행 (file이 구독, 정확한 REQ 번호는 SPEC-COMMENT-001 작성 후 cross-link)
- sharp documentation: https://sharp.pixelplumbing.com/
- clamscan npm: https://www.npmjs.com/package/clamscan
- AWS SDK v3 S3: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/

---

Version: 1.0.0
Status: complete (Slice A 시작 시 SPEC-DOCUMENT-001 Slice A 완료 검증 필요 — 본 research는 비차단)
