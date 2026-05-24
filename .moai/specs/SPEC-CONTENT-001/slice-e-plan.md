# SPEC-CONTENT-001 — Slice E 플랜

**Status**: ready
**Methodology**: TDD (RED → GREEN → REFACTOR)
**Base**: main = 6b9343e (CONTENT-001 Slice D 완료, 695 tests)
**Depends on**: Slice A (`FileAttachment`, `Document`, `Comment` 모델), Slice B (Document CRUD + tRPC), Slice C (Comment + categoryId/tags), Slice D (vote/report/trash 라우터)
**Scope**: File Attachments (presign 업로드) + Content Write Rate Limiting
**Spec source**: `.moai/specs/SPEC-CONTENT-001/spec.md` REQ-CONTENT-030/031, REQ-CONTENT-032/033/034, REQ-CONTENT-140/141, AC-CONTENT-030/031, AC-CONTENT-140

---

## 1. 목표 (What & Why)

Slice A~D 가 Document/Comment 의 정형 데이터 경로를 완성했다면, Slice E 는 두 개의 **인프라성 횡단 관심사** 를 닫는다.

1. **File Attachments** (REQ-CONTENT-030~034) — 클라이언트 직접 업로드를 지원하는 S3 호환 presign 흐름. `FileAttachment` 모델은 Slice A 에서 정의됐으나, 도메인 함수와 tRPC 라우터는 미구현. Slice E 는 presign → 클라이언트 PUT → complete 두 단계 mutation 으로 첨부 파일 라이프사이클을 완성한다.
2. **Rate Limiting** (REQ-CONTENT-140/141) — 익명/저빈도 어뷰저 차단. 모든 컨텐츠 쓰기 경로 (`document.create`, `comment.create`, `attachment.requestUpload`) 에 IP + 사용자 단위 sliding window 임계값을 적용한다. AUTH-001 의 `LoginAttempt` 패턴을 재사용하되 endpoint 차원을 추가한 별도 테이블 (`ContentRateLimit`) 로 운영한다.

이 슬라이스 완료 후 컨텐츠 도메인은 **모든 쓰기 경로가 quota 가 적용된 audit-able 상태** 가 되고, 첨부 파일은 실제 S3 호환 스토리지에 적재된다.

---

## 2. Pre-Flight Findings

### Q1 — FileStorage interface 설계 (REQ-CONTENT-030, AC-CONTENT-030, OQ-CONTENT-002)

**전제**: spec.md OQ-CONTENT-002 의 권고대로 "S3 호환 + pluggable StorageAdapter" 채택. AWS S3 / Cloudflare R2 / MinIO 가 모두 동일 SDK (`@aws-sdk/client-s3`) 로 호출 가능하다.

**현재 의존성 상태**: `apps/web/package.json` 에 AWS SDK 없음 — 본 슬라이스에서 신규 추가.

**결정 — interface (`packages/board/src/storage/types.ts`)**:

```ts
export interface FileStorage {
  /** presigned PUT URL — 클라이언트가 이 URL 에 binary PUT 으로 직접 업로드 */
  getUploadPresignedUrl(input: {
    key: string;            // 'attachments/{yyyy}/{mm}/{uuid}.{ext}'
    contentType: string;    // 클라이언트가 선언한 MIME
    contentLength: number;  // 바이트
    expiresIn?: number;     // 기본 300s
  }): Promise<{
    url: string;            // 클라이언트가 PUT 할 절대 URL
    method: 'PUT';
    headers: Record<string, string>; // Content-Type 등 SignatureV4 가 요구하는 header
    key: string;            // 동일 key 를 다시 반환 (complete 시 참조)
  }>;

  /** 다운로드/조회용 presigned GET URL */
  getDownloadUrl(input: {
    key: string;
    expiresIn?: number;
    forceAttachment?: boolean; // REQ-CONTENT-033 direct_download
  }): Promise<string>;

  /** 파일 삭제 — purge / orphan cleanup */
  delete(key: string): Promise<void>;

  /** 메타데이터 조회 — completeUpload 시 실제 사이즈/Content-Type 검증용 */
  head(key: string): Promise<{ size: number; contentType: string } | null>;
}
```

**구현체 1 — `S3Storage` (`packages/board/src/storage/s3.ts`)**:
- AWS SDK v3 사용: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
- 생성자 옵션: `{ bucket, region, accessKeyId, secretAccessKey, endpoint? (MinIO/R2), forcePathStyle? }`.
- `forcePathStyle: true` 는 MinIO/일부 R2 셋업에서 필수.
- `getSignedUrl(s3Client, new PutObjectCommand({ ... }))` 로 presign.
- `head` → `HeadObjectCommand`.

**구현체 2 — `InMemoryStorage` (`packages/board/src/storage/memory.ts`)**:
- 테스트 전용. `Map<string, { buffer: Buffer; contentType: string }>`.
- `getUploadPresignedUrl` 은 `url: 'memory://put/{key}'` 같은 페이크 URL 반환. 테스트는 이 URL 을 PUT 하지 않고, 직접 `storage.put(key, buffer, contentType)` helper 로 채워 넣은 뒤 complete 를 호출한다.
- `head` / `getDownloadUrl` 모두 동기 Map lookup.

**ctx 주입**: 도메인 함수 `attachment.ts` 는 `ctx: { prisma, storage, scanner }` 로 storage 를 주입받음. tRPC 라우터는 앱 시작 시 `env` 기반으로 `S3Storage` 또는 `InMemoryStorage` (dev/test) 를 선택해 `createContext` 에서 주입한다.

### Q2 — VirusScanner interface (REQ-CONTENT-031, AC-CONTENT-031)

**전제**: spec.md REQ-CONTENT-031 는 "virus scan hook (pluggable interface; ClamAV adapter as default)" 을 요구하지만 ClamAV 인프라는 Slice E 범위 밖. 실제 ClamAV 연결은 운영 환경 (docker-compose with clamd, TCP 3310) 셋업이 필요하므로 **SPEC-INFRA 로 이월**.

**결정 — interface (`packages/board/src/storage/scanner.ts`)**:

```ts
export interface VirusScanner {
  scan(input: {
    storageKey: string;          // S3 key — scanner 가 직접 다운받아 검사
    storage: FileStorage;        // 필요 시 head/download
    knownContentType: string;
    knownSize: number;
  }): Promise<{
    clean: boolean;
    threats?: string[];          // ClamAV signature 이름 등
    scannedAt: Date;
  }>;
}

export class NoopScanner implements VirusScanner {
  // 항상 { clean: true } — Slice E 기본값
  // @MX:NOTE: 운영 환경에서는 ClamAVScanner 로 교체. SPEC-INFRA 에서 다룬다.
}
```

**ctx 주입**: `attachment.ts` 의 `completeUpload` 함수가 `ctx.scanner.scan(...)` 을 호출. NoopScanner 기본값이므로 `clean: true` 즉시 반환되어 `FileAttachment.isvalid = true` 확정.

### Q3 — FileAttachment 모델 확인 (Slice A 결과 + presign 흐름 적합성)

Slice A 의 `FileAttachment` 필드:
- `id` (Int autoincrement)
- `fileSrl BigInt? @unique` (legacy 매핑 — null 허용)
- `uploadTargetType` enum DOCUMENT|COMMENT
- `documentId Int?` / `commentId Int?` (둘 중 하나는 null 허용)
- `sourceFilename` (사용자가 올린 원본 이름)
- `uploadedFilename` (스토리지의 정규화된 이름)
- `fileSize BigInt`, `mimeType String`
- `width Int?`, `height Int?`, `duration Int?`
- `directDownload Boolean default false`, `downloadCount Int default 0`
- `coverImage Boolean default false`
- `isvalid Boolean default true` (virus 검출 시 false)
- `memberId String?` (소유자)
- `storageKey String` (S3 object key — presign 시 발급한 key)
- `regdate Timestamptz`

**관계**: `Document.files` / `Comment.files` 가 `FileAttachment` 를 역참조 (Slice A 에서 정의됨).

**presign 흐름 적합성**:

| 필드 | 발급 시점 | 비고 |
| ---- | --------- | ---- |
| `id`, `regdate` | DB autoincrement / default | — |
| `sourceFilename`, `mimeType` (선언), `fileSize` (선언) | `requestUpload` mutation 입력 | 클라이언트 declare |
| `storageKey`, `uploadedFilename` | `requestUpload` 내부에서 서버 생성 | UUID 기반 |
| `documentId` 또는 `commentId`, `uploadTargetType` | `completeUpload` mutation 입력 | 업로드 완료 후 첨부 대상 확정 |
| `width`, `height`, `duration` | `completeUpload` 시 — 이미지/비디오는 클라이언트 측에서 추출해 입력 또는 미설정 | Slice E 는 클라이언트 입력값을 그대로 수용. 서버측 metadata 추출 (sharp/ffprobe) 은 Slice F 이월 |
| `isvalid` | `completeUpload` 시 scanner 결과로 결정 | NoopScanner 면 true |

**두 단계 mutation 시퀀스**:

1. **`content.attachment.requestUpload`** — 클라이언트가 파일 메타데이터를 선언, 서버가 `storageKey` + presigned PUT URL 반환. **이 시점에는 `FileAttachment` row 를 만들지 않는다** (orphan 방지). 대신 임시 토큰 (`uploadToken` — 서명된 JWT 또는 단순 random ID + Redis 캐시) 으로 다음 단계와 연결.
   - **결정 — `uploadToken` 저장 방식**: Redis 미도입이므로 **HMAC-서명된 JWT** 채택. payload = `{ storageKey, mimeType, fileSize, memberId, exp: now+10min }`. `process.env.UPLOAD_TOKEN_SECRET` 으로 HMAC-SHA256 서명. `completeUpload` 가 토큰을 검증 + payload 추출.
   - 토큰이 만료/서명불일치면 `InvalidUploadTokenError`.
2. **`content.attachment.complete`** — 클라이언트가 PUT 성공 후 호출. 서버는:
   - uploadToken 검증 → payload 추출.
   - `storage.head(storageKey)` 로 실제 업로드 확인 + 사이즈/mimeType 재검증 (선언값과 실제값 불일치 시 거부).
   - `scanner.scan(...)` 호출.
   - **단일 트랜잭션** 내에서 `FileAttachment` row 생성 + `Document.uploadedCount` 또는 `Comment` 측 카운트 갱신 (현재 Comment 모델에는 첨부 카운트 컬럼이 없음 — Document 만 +1).
   - scanner 가 unclean 반환 시 → `storage.delete(key)` + row 미생성 + `VirusDetectedError`.

### Q4 — Rate Limit 모델 신규 (REQ-CONTENT-140, REQ-CONTENT-141, AC-CONTENT-140)

**현재 상태**: `LoginAttempt` 가 AUTH-001 의 IP 단위 sliding window 패턴을 이미 보유. 그러나 endpoint 차원이 없으므로 컨텐츠 쓰기에 그대로 재사용 불가.

**결정 — 신규 모델 `ContentRateLimit` (마이그레이션 필요)**:

```prisma
model ContentRateLimit {
  id         BigInt   @id @default(autoincrement())
  ip         String
  // userId.toString() 또는 anonymous 면 null
  identifier String?
  // "document.create" | "comment.create" | "attachment.upload"
  endpoint   String
  // 추후 단순화 가능 — 본 슬라이스는 SUCCESS 만 기록 (실패한 시도는 어차피 검증에서 거부)
  // result enum 도입 시 LoginAttempt 와 동일 패턴 따름
  createdAt  DateTime @default(now()) @db.Timestamptz

  @@index([ip, endpoint, createdAt])
  @@index([identifier, endpoint, createdAt])
  @@map("content_rate_limits")
}
```

- Migration name: `add_content_rate_limit`.
- `LoginAttempt` 패턴과의 차이:
  - `endpoint` 컬럼 추가 — 동일 IP 가 document 와 comment 에 각각 별도 quota.
  - `result` 컬럼 미추가 — 검증을 통과해 실제로 row 가 생성된 시도만 기록. 검증 실패는 도메인 에러로 즉시 거부.
  - `identifier` 가 nullable — 익명 컨텍스트 지원 (현재는 모든 쓰기가 `protectedProcedure` 라 identifier 가 항상 있지만, REQ-CONTENT-140 의 "WHILE a user is unauthenticated" 조건 대비).

**Sliding window 알고리즘** (login.ts L120~141 패턴 재사용):

```ts
const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
const count = await prisma.contentRateLimit.count({
  where: {
    ...(identifier ? { identifier } : { ip }),
    endpoint,
    createdAt: { gt: windowStart },
  },
});
if (count >= threshold) throw new RateLimitedError({ endpoint, retryAfterSeconds });
```

- `identifier` 가 있으면 사용자 단위, 없으면 IP 단위 — **사용자가 있으면 IP 검사를 생략한다** (한 사람이 같은 사무실 IP 뒤에 여러 명일 수 있다는 정상 케이스 보호).
- `retryAfterSeconds`: 가장 오래된 윈도우 내 row 의 `createdAt + windowMs - now()` 를 계산.

**기록 시점**: 검증 통과 + 쓰기 mutation 성공 직후 `recordAttempt(ip, identifier, endpoint)` 호출. 별도 트랜잭션 (쓰기 mutation 의 transaction 안에 넣지 않음 — rate limit row 가 실패해도 mutation 자체는 성공).

### Q5 — Rate Limit 임계값 (REQ-CONTENT-140)

spec.md REQ-CONTENT-140: "per-IP rate limits of **10 writes per hour** to documents/comments" (미인증).

**결정 — 본 슬라이스 상수 (`packages/board/src/rate-limit.ts`)**:

```ts
export const RATE_LIMITS = {
  'document.create':    { authenticated: 30,  anonymous: 5,  windowMinutes: 60 },
  'comment.create':     { authenticated: 200, anonymous: 20, windowMinutes: 60 },
  'attachment.upload':  { authenticated: 50,  anonymous: 0,  windowMinutes: 60 }, // anonymous 는 첨부 불가
} as const;
```

- 인증 사용자 limit 은 미인증 대비 6~10배 — spec.md 의 보수적 anonymous 임계 (시간당 10건) 를 준수하면서 정상 사용자 활동에 여유.
- `attachment.upload`: 미인증 = 0 (`protectedProcedure` 이므로 실제로는 도달 불가하지만, 기본값으로 명시).
- 상수는 추후 `SiteSetting` 으로 이전 가능 (Slice F+ 이월 — Heads-up). 본 슬라이스는 환경변수 오버라이드만 노출:
  - `CONTENT_RATE_LIMIT_DOCUMENT_AUTH=30` 등으로 운영자가 조정 가능.

### Q6 — MIME 화이트리스트 + 사이즈 제한

**결정**:
- 화이트리스트 (`packages/board/src/storage/mime.ts`):
  - 이미지: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` (svg 는 XSS 위험 — 운영 환경에서 disable 가능하도록 `ALLOW_SVG=true` env 게이트).
  - 문서: `application/pdf`, `text/plain`, `text/csv`.
  - 비디오: `video/mp4`, `video/webm` (대용량 — 별도 사이즈 제한 적용).
  - 오디오: `audio/mpeg`, `audio/ogg`.
  - 기타 모든 MIME → 거부.
- 사이즈 상한 (`packages/board/src/storage/limits.ts`):
  - 이미지: 10MB
  - 문서: 25MB
  - 비디오/오디오: 100MB
  - 단일 글로벌 상한: 100MB (안전망)
- 검증 시점:
  - `requestUpload` 입력 검증 (선언값으로 미리 거부 — presign 발급도 막음).
  - `completeUpload` 에서 `storage.head` 결과로 재검증 (선언값과 실제값 불일치 시 거부).
- 상한 초과 → `FileTooLargeError(maxBytes)`.
- MIME 불일치 → `UnsupportedMimeTypeError(mime, allowed[])`.

---

## 3. 구현 파일 목록

### 3.1 packages/board/src/storage/types.ts (신규)

`FileStorage`, `VirusScanner` interface 만. 구현 없음. 타입 export.

### 3.2 packages/board/src/storage/s3.ts (신규)

`S3Storage implements FileStorage`. AWS SDK v3 의존성.

- 생성자: `new S3Storage({ bucket, region, accessKeyId, secretAccessKey, endpoint?, forcePathStyle? })`.
- 내부적으로 `S3Client` 인스턴스 lazy init.
- `getUploadPresignedUrl` → `getSignedUrl(client, new PutObjectCommand(...))`.
- `getDownloadUrl(forceAttachment=true)` → `ResponseContentDisposition: 'attachment'` 옵션 부여.

### 3.3 packages/board/src/storage/memory.ts (신규)

`InMemoryStorage implements FileStorage`. 테스트 전용.

- `Map<string, { buffer: Buffer; contentType: string }>`.
- `getUploadPresignedUrl` → `{ url: 'memory://...', method: 'PUT', key }`.
- 테스트 helper: `storage.put(key, buffer, contentType)` — presign URL 을 실제로 PUT 하지 않고 직접 채워 넣음.
- `getDownloadUrl` → `'memory://get/{key}'`.
- `head` → Map lookup.

### 3.4 packages/board/src/storage/scanner.ts (신규)

`VirusScanner` interface + `NoopScanner` 구현체.

```ts
// @MX:NOTE: NoopScanner 는 Slice E 기본값. 운영 환경 ClamAVScanner 는 SPEC-INFRA-001 (가칭) 이월.
export class NoopScanner implements VirusScanner {
  async scan(): Promise<{ clean: true; scannedAt: Date }> {
    return { clean: true, scannedAt: new Date() };
  }
}

// 테스트용: 항상 unclean 반환
export class FakeMalwareScanner implements VirusScanner {
  async scan(): Promise<{ clean: false; threats: string[]; scannedAt: Date }> {
    return { clean: false, threats: ['EICAR-Test-Signature'], scannedAt: new Date() };
  }
}
```

### 3.5 packages/board/src/storage/mime.ts + limits.ts (신규)

상수 + 검증 함수. `assertMimeAllowed(mime)`, `assertSizeAllowed(mime, size)`.

### 3.6 packages/board/src/storage/storage.test.ts (신규)

TDD 테스트 (F-1 ~ F-6):

- **F-1** `S3Storage.getUploadPresignedUrl` — mock `S3Client` 으로 `getSignedUrl` 호출 시 `url`, `method: 'PUT'`, `headers.Content-Type` 반환.
- **F-2** `InMemoryStorage.put` + `head` round-trip → 사이즈/Content-Type 일치.
- **F-3** `InMemoryStorage.delete` 후 `head` → null.
- **F-4** `getDownloadUrl(forceAttachment=true)` — S3Storage 가 `ResponseContentDisposition: 'attachment; filename="..."'` 옵션을 PresignedUrl 에 포함시킴 (URL 파라미터로 검증).
- **F-5** `assertMimeAllowed('application/x-msdownload')` → `UnsupportedMimeTypeError`.
- **F-6** `assertSizeAllowed('image/png', 11 * 1024 * 1024)` → `FileTooLargeError`.

### 3.7 packages/board/src/attachment.ts (신규)

```ts
import { z } from 'zod';
import type { PrismaClient, FileAttachment, UploadTargetType } from '@prisma/client';
import type { FileStorage } from './storage/types.js';
import type { VirusScanner } from './storage/scanner.js';
import { assertMimeAllowed, assertSizeAllowed } from './storage/mime.js';

// ---------- requestUpload ----------

const RequestUploadSchema = z.object({
  sourceFilename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024),
  memberId: z.string().min(1),
});

export type RequestUploadInput = z.input<typeof RequestUploadSchema>;
export interface RequestUploadResult {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  storageKey: string;
  uploadToken: string;   // HMAC-signed JWT, exp 10min
  expiresAt: Date;
}

export async function requestUpload(
  input: RequestUploadInput,
  ctx: { storage: FileStorage; tokenSecret: string },
): Promise<RequestUploadResult>;

// ---------- completeUpload ----------

const CompleteUploadSchema = z.object({
  uploadToken: z.string().min(1),
  uploadTargetType: z.enum(['DOCUMENT', 'COMMENT']),
  uploadTargetId: z.number().int().positive(),
  // 클라이언트가 메타데이터 추출했다면 전달 (optional)
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  directDownload: z.boolean().default(false),
  coverImage: z.boolean().default(false),
});

export type CompleteUploadInput = z.input<typeof CompleteUploadSchema>;

export async function completeUpload(
  input: CompleteUploadInput,
  ctx: { prisma: PrismaClient; storage: FileStorage; scanner: VirusScanner; tokenSecret: string },
): Promise<FileAttachment>;

// ---------- deleteAttachment ----------

export async function deleteAttachment(
  input: { attachmentId: number; actor: { userId: number; isAdmin: boolean } },
  ctx: { prisma: PrismaClient; storage: FileStorage },
): Promise<{ attachmentId: number }>;

// ---------- listAttachments ----------

export async function listAttachments(
  input: { documentId?: number; commentId?: number },
  ctx: { prisma: PrismaClient },
): Promise<FileAttachment[]>;

// ---------- Errors ----------

export class InvalidUploadTokenError extends Error {
  readonly code = 'INVALID_UPLOAD_TOKEN';
}
export class UploadHeadMismatchError extends Error {
  readonly code = 'UPLOAD_HEAD_MISMATCH';
  // declared vs actual size/mime 불일치
}
export class VirusDetectedError extends Error {
  readonly code = 'VIRUS_DETECTED';
}
export class UnsupportedMimeTypeError extends Error {
  readonly code = 'UNSUPPORTED_MIME_TYPE';
}
export class FileTooLargeError extends Error {
  readonly code = 'FILE_TOO_LARGE';
}
export class AttachmentOwnershipError extends Error {
  readonly code = 'ATTACHMENT_OWNERSHIP_DENIED';
}
```

**구현 핵심** (`requestUpload`):
1. Zod 검증.
2. `assertMimeAllowed(mimeType)`, `assertSizeAllowed(mimeType, fileSize)`.
3. `storageKey = 'attachments/{yyyy}/{mm}/{uuid}.{ext}'` 생성 (`crypto.randomUUID()`).
4. `storage.getUploadPresignedUrl({ key, contentType: mimeType, contentLength: fileSize, expiresIn: 300 })`.
5. `uploadToken` = HMAC-SHA256 서명된 base64url JWT, payload `{ storageKey, mimeType, fileSize, memberId, exp: now+600s }`.
6. 응답 반환. **이 시점에 DB row 미생성** — orphan 방지.

**구현 핵심** (`completeUpload`):
1. uploadToken 검증 + payload 추출 → 실패면 `InvalidUploadTokenError`.
2. `storage.head(payload.storageKey)` 호출 → null 이면 `UploadHeadMismatchError` (클라이언트가 실제로 PUT 하지 않았음).
3. 실제 `size`/`contentType` 와 payload 비교 → 불일치 시 `UploadHeadMismatchError`.
4. `scanner.scan({ storageKey, storage, knownContentType, knownSize })`.
5. `clean: false` → `storage.delete(storageKey)` + `VirusDetectedError` throw (row 미생성).
6. `clean: true` → 단일 트랜잭션 내:
   - `FileAttachment.create({ storageKey, sourceFilename: payload.sourceFilename, mimeType, fileSize, memberId, uploadTargetType, documentId?/commentId?, isvalid: true, width, height, duration, directDownload, coverImage, uploadedFilename: deriveUploadedFilename(storageKey) })`.
   - `uploadTargetType === 'DOCUMENT'` 면 `Document.uploadedCount` +1.
7. 생성된 row 반환.

**구현 핵심** (`deleteAttachment`):
- `FileAttachment.findUniqueOrThrow`.
- 소유권 검사: `actor.isAdmin || attachment.memberId === actor.userId.toString()` → 실패 시 `AttachmentOwnershipError`.
- 단일 트랜잭션: `storage.delete(storageKey)` + `FileAttachment.delete` + Document/Comment 카운트 감소.
- **보상 트랜잭션 고려**: storage.delete 가 먼저, DB delete 가 나중. storage 는 성공했는데 DB 가 실패하면 orphan storage 객체 없음 (안전) / DB 는 성공했는데 storage 가 실패하면 dangling storage 객체 — 별도 cron 으로 cleanup (Heads-up).

### 3.8 packages/board/src/attachment.test.ts (신규)

TDD 테스트 (A-1 ~ A-12):

- **A-1** `requestUpload` 정상 → `{ url, storageKey, uploadToken, expiresAt }` 반환. uploadToken 은 검증 가능 (동일 secret 으로 verify 시 payload 복원).
- **A-2** `requestUpload` 화이트리스트 외 MIME (`application/x-msdownload`) → `UnsupportedMimeTypeError`.
- **A-3** `requestUpload` 사이즈 초과 (`image/png`, 11MB) → `FileTooLargeError`.
- **A-4** `completeUpload` 정상 흐름 — InMemoryStorage 에 직접 put → head 일치 → NoopScanner clean → `FileAttachment` row 생성 + `Document.uploadedCount` +1.
- **A-5** `completeUpload` token 위변조 → `InvalidUploadTokenError`.
- **A-6** `completeUpload` token 만료 (exp < now) → `InvalidUploadTokenError`.
- **A-7** `completeUpload` head null (클라이언트 PUT 안 함) → `UploadHeadMismatchError`.
- **A-8** `completeUpload` 선언 사이즈 != 실제 사이즈 → `UploadHeadMismatchError`.
- **A-9** `completeUpload` virus 검출 (FakeMalwareScanner 주입) → `storage.head` 가 그 후 null (delete 호출됨) + `VirusDetectedError` + row 미생성.
- **A-10** `deleteAttachment` 본인 → storage + DB 동시 삭제 + `uploadedCount` -1.
- **A-11** `deleteAttachment` 타인 비admin → `AttachmentOwnershipError`.
- **A-12** `listAttachments({ documentId })` → 해당 문서의 첨부 목록 (regdate 오름차순).

### 3.9 packages/board/src/rate-limit.ts (신규)

```ts
import type { PrismaClient } from '@prisma/client';

export type ContentEndpoint = 'document.create' | 'comment.create' | 'attachment.upload';

export interface RateLimitConfig {
  authenticated: number;
  anonymous: number;
  windowMinutes: number;
}

export const RATE_LIMITS: Record<ContentEndpoint, RateLimitConfig> = {
  'document.create':   { authenticated: 30,  anonymous: 5,  windowMinutes: 60 },
  'comment.create':    { authenticated: 200, anonymous: 20, windowMinutes: 60 },
  'attachment.upload': { authenticated: 50,  anonymous: 0,  windowMinutes: 60 },
};

export class RateLimitedError extends Error {
  readonly code = 'RATE_LIMITED';
  constructor(
    public readonly endpoint: ContentEndpoint,
    public readonly retryAfterSeconds: number,
  ) {
    super(`Rate limit exceeded for ${endpoint}; retry after ${retryAfterSeconds}s`);
    this.name = 'RateLimitedError';
  }
}

// 환경변수 오버라이드 적용 + 임계값 결정
export function resolveLimit(endpoint: ContentEndpoint, isAuthenticated: boolean): {
  threshold: number;
  windowMinutes: number;
};

// 호출 전 검사 — 임계 초과 시 throw
export async function checkRateLimit(
  input: { ip: string; identifier: string | null; endpoint: ContentEndpoint },
  ctx: { prisma: PrismaClient; now?: () => Date },
): Promise<void>;

// 검사 통과 + 쓰기 성공 후 호출 — row 1개 추가
export async function recordAttempt(
  input: { ip: string; identifier: string | null; endpoint: ContentEndpoint },
  ctx: { prisma: PrismaClient },
): Promise<void>;
```

**구현 핵심**:
- `checkRateLimit`: `identifier` 가 있으면 identifier 기준 count, 없으면 ip 기준. window 내 count >= threshold 면 throw. `retryAfterSeconds` = window 내 가장 오래된 row 의 `(createdAt + windowMs) - now`.
- `recordAttempt`: 단순 `contentRateLimit.create({ data: { ip, identifier, endpoint } })`.

### 3.10 packages/board/src/rate-limit.test.ts (신규)

TDD 테스트 (R-1 ~ R-7):

- **R-1** 미인증 + IP `1.2.3.4` + endpoint `document.create` 5건 이하 → `checkRateLimit` 통과 + `recordAttempt` 정상 동작.
- **R-2** 미인증 + IP 동일 + endpoint `document.create` 6번째 호출 (window 내) → `RateLimitedError`, `retryAfterSeconds > 0`.
- **R-3** 인증 사용자 (`identifier: '42'`) + IP 동일 → IP quota 와 무관하게 30건까지 통과.
- **R-4** Sliding window — 1시간 전 row 는 count 에서 제외 (`now` 를 future 로 시뮬레이션).
- **R-5** Endpoint 별 별도 카운트 — `document.create` 5건 + `comment.create` 19건 → 둘 다 다음 호출 통과 (각자 임계 미만).
- **R-6** 환경변수 `CONTENT_RATE_LIMIT_DOCUMENT_AUTH=2` 오버라이드 → 인증 사용자 3번째 호출에서 차단.
- **R-7** `attachment.upload` 미인증 (anonymous=0) → 1번째 호출부터 차단.

### 3.11 packages/db/prisma/schema.prisma (수정)

- `ContentRateLimit` 모델 추가 (Q4 의 정의 그대로).
- Migration: `pnpm prisma migrate dev --name add_content_rate_limit`.

### 3.12 apps/web/server/api/routers/content/attachment.ts (신규)

```ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import {
  requestUpload, completeUpload, deleteAttachment, listAttachments,
  InvalidUploadTokenError, UploadHeadMismatchError, VirusDetectedError,
  UnsupportedMimeTypeError, FileTooLargeError, AttachmentOwnershipError,
} from '@rhymix-ts/board';

function mapAttachmentError(err: unknown): never {
  if (err instanceof UnsupportedMimeTypeError)
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  if (err instanceof FileTooLargeError)
    throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: err.message });
  if (err instanceof InvalidUploadTokenError)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: err.message });
  if (err instanceof UploadHeadMismatchError)
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  if (err instanceof VirusDetectedError)
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  if (err instanceof AttachmentOwnershipError)
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  throw err;
}

export const contentAttachmentRouter = router({
  requestUpload: protectedProcedure
    .input(z.object({ sourceFilename, mimeType, fileSize }))
    .mutation(async ({ ctx, input }) => {
      // rate-limit gate
      await checkRateLimit(
        { ip: ctx.ip, identifier: ctx.session.user.id.toString(), endpoint: 'attachment.upload' },
        { prisma: ctx.prisma },
      );
      try {
        const result = await requestUpload(
          { ...input, memberId: ctx.session.user.id.toString() },
          { storage: ctx.storage, tokenSecret: ctx.uploadTokenSecret },
        );
        await recordAttempt(
          { ip: ctx.ip, identifier: ctx.session.user.id.toString(), endpoint: 'attachment.upload' },
          { prisma: ctx.prisma },
        );
        return result;
      } catch (err) { mapAttachmentError(err); }
    }),

  complete: protectedProcedure
    .input(z.object({ uploadToken, uploadTargetType, uploadTargetId, width?, height?, duration?, directDownload?, coverImage? }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeUpload(input, {
          prisma: ctx.prisma, storage: ctx.storage, scanner: ctx.scanner,
          tokenSecret: ctx.uploadTokenSecret,
        });
      } catch (err) { mapAttachmentError(err); }
    }),

  delete: protectedProcedure
    .input(z.object({ attachmentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteAttachment(
          { attachmentId: input.attachmentId, actor: { userId: ctx.session.user.id, isAdmin: ctx.session.user.isAdmin } },
          { prisma: ctx.prisma, storage: ctx.storage },
        );
      } catch (err) { mapAttachmentError(err); }
    }),

  list: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive().optional(), commentId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => listAttachments(input, { prisma: ctx.prisma })),
});
```

**ctx 확장 필요** (`apps/web/server/api/trpc.ts`):
- `ctx.ip`: Next.js Request 의 `x-forwarded-for` 또는 `req.ip`.
- `ctx.storage`: 앱 부팅 시 env 기반으로 `S3Storage` 또는 `InMemoryStorage` 선택해 생성.
- `ctx.scanner`: 기본 `NoopScanner`.
- `ctx.uploadTokenSecret`: `process.env.UPLOAD_TOKEN_SECRET`.

### 3.13 apps/web/server/api/routers/content/attachment.test.ts (신규)

TDD 테스트 (C-1 ~ C-6):

- **C-1** `content.attachment.requestUpload` 정상 → `{ url, uploadToken, ... }` 반환.
- **C-2** `content.attachment.complete` 정상 → row 생성.
- **C-3** `requestUpload` 미인증 시 → `UNAUTHORIZED` (protectedProcedure 가 자동 처리).
- **C-4** `requestUpload` MIME 위반 → `BAD_REQUEST` (mapAttachmentError 가 변환).
- **C-5** `requestUpload` rate limit 초과 → `TOO_MANY_REQUESTS` (RateLimitedError 변환 — `mapRateLimitError` helper 신규).
- **C-6** `complete` 위변조 token → `UNAUTHORIZED`.

### 3.14 apps/web/server/api/routers/content/document.ts (수정)

- `create` mutation 진입부에 rate-limit gate 추가:

```ts
create: protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
    await checkRateLimit(
      { ip: ctx.ip, identifier: ctx.session.user.id.toString(), endpoint: 'document.create' },
      { prisma: ctx.prisma },
    );
    try {
      const doc = await createDocument(...);
      await recordAttempt(
        { ip: ctx.ip, identifier: ctx.session.user.id.toString(), endpoint: 'document.create' },
        { prisma: ctx.prisma },
      );
      return doc;
    } catch (err) {
      // RateLimitedError 는 mapDomainError 의 분기를 추가해 TRPCError TOO_MANY_REQUESTS 로 매핑
      mapDomainError(err);
    }
  }),
```

- `mapDomainError` 에 `RateLimitedError` 분기 추가:
  - `throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: err.message, cause: { retryAfter: err.retryAfterSeconds } })`.
- 회귀 보장: 기존 Slice B/C/D 의 document 라우터 테스트는 rate-limit window 가 결코 차지 않는 시나리오라 영향 없음 — **하지만 각 테스트마다 ContentRateLimit 테이블이 깨끗하게 시작되도록 fixture 정리 필요** (test setup 에서 `prisma.contentRateLimit.deleteMany()`).

### 3.15 apps/web/server/api/routers/content/comment.ts (수정)

`document.ts` 와 동일 패턴으로 `create` 에 rate-limit gate 추가. endpoint 는 `'comment.create'`.

### 3.16 apps/web/server/api/root.ts (수정)

`contentAttachmentRouter` 를 `appRouter.content.attachment` 로 등록.

### 3.17 .env.example / dev 가이드 (수정)

```env
# SPEC-CONTENT-001 Slice E
S3_BUCKET=rhymix-dev
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000        # MinIO 로컬 — 운영 환경은 미설정 (AWS S3 기본)
S3_FORCE_PATH_STYLE=true                 # MinIO 필수, 운영 AWS 는 false

UPLOAD_TOKEN_SECRET=replace-me-32bytes-random
ALLOW_SVG=false                          # 운영 환경 기본 false (XSS 위험)

# Optional overrides
CONTENT_RATE_LIMIT_DOCUMENT_AUTH=30
CONTENT_RATE_LIMIT_DOCUMENT_ANON=5
CONTENT_RATE_LIMIT_COMMENT_AUTH=200
CONTENT_RATE_LIMIT_COMMENT_ANON=20
CONTENT_RATE_LIMIT_ATTACHMENT_AUTH=50
```

### 3.18 의존성 추가 (`packages/board/package.json`)

```json
"dependencies": {
  "@aws-sdk/client-s3": "^3.700.0",
  "@aws-sdk/s3-request-presigner": "^3.700.0",
  // 기존 zod, @prisma/client 유지
}
```

`pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --filter @rhymix-ts/board`.

---

## 4. TDD 사이클

### RED Phase (테스트 먼저)

순서:

1. `storage/storage.test.ts` (F-1~F-6) — Storage interface + InMemoryStorage + MIME/size 가드.
2. `rate-limit.test.ts` (R-1~R-7) — `ContentRateLimit` 모델 마이그레이션 선행 필요.
3. `attachment.test.ts` (A-1~A-12) — 도메인 함수.
4. tRPC `attachment.test.ts` (C-1~C-6) — 라우터 + ctx 와이어링.

### GREEN Phase (최소 구현)

1. `ContentRateLimit` 모델 마이그레이션 + `pnpm prisma generate`.
2. `storage/types.ts` + `memory.ts` + `mime.ts` + `limits.ts` — F-1~F-6 통과.
3. `storage/scanner.ts` (Noop + FakeMalware) — A-9 통과 기반.
4. `rate-limit.ts` — R-1~R-7 통과.
5. `storage/s3.ts` — AWS SDK presign 호출. F-1 mock 기반 통과.
6. `attachment.ts` — A-1~A-12 통과.
7. tRPC `attachment.ts` 라우터 + `trpc.ts` ctx 확장 — C-1~C-6 통과.
8. `document.ts` / `comment.ts` rate-limit gate 추가 — 기존 테스트 회귀 없음 검증 (`pnpm test`).

### REFACTOR Phase

- `requestUpload` / `completeUpload` 의 token 생성/검증 helper 를 `storage/upload-token.ts` 로 분리 — JWT 라이브러리 미사용, Node `crypto` 만으로 HMAC-SHA256.
- `mapAttachmentError` / `mapRateLimitError` 를 `server/api/error-mapping.ts` 공통 모듈로 통합 (Slice B 의 `mapDomainError` 도 함께 이전).
- S3Storage 에서 env 파싱 로직을 `factory.ts` 로 분리 → 테스트가 InMemoryStorage 를 명시적 주입.
- @MX 태그 점검 (다음 절 참조).

---

## 5. REQ enforcement chain

| REQ | 파일:함수 | 검증 |
| --- | --------- | ---- |
| REQ-CONTENT-030 (file upload) | `attachment.ts:completeUpload`, `storage/s3.ts:getUploadPresignedUrl` | A-1, A-4, F-1 |
| REQ-CONTENT-031 (virus scan hook) | `attachment.ts:completeUpload` (scanner 주입), `storage/scanner.ts:NoopScanner` | A-9 |
| REQ-CONTENT-032 (upload target type) | `attachment.ts:completeUpload` (`uploadTargetType` enum) | A-4 |
| REQ-CONTENT-033 (direct download) | `storage/s3.ts:getDownloadUrl(forceAttachment=true)`, `FileAttachment.directDownload` | F-4 |
| REQ-CONTENT-034 (cover image optional) | `attachment.ts:completeUpload` (`coverImage` field) | A-4 (input passthrough) |
| REQ-CONTENT-140 (rate limit) | `rate-limit.ts:checkRateLimit`, `document.ts:create` / `comment.ts:create` / `attachment.ts:requestUpload` gate | R-1, R-2, R-3, R-7 |
| REQ-CONTENT-141 (HTTP 429 with Retry-After) | `mapRateLimitError` (tRPC TOO_MANY_REQUESTS + cause.retryAfter) | C-5 |
| AC-CONTENT-030 (5MB PNG upload) | `attachment.test.ts` A-4 (정상 흐름) | TDD |
| AC-CONTENT-031 (EICAR detection) | `attachment.test.ts` A-9 (FakeMalwareScanner) | TDD |
| AC-CONTENT-140 (10/hr anonymous comments) | `rate-limit.test.ts` R-2, R-7 + spec.md 수치 일치 검증 (anonymous=20 은 시간당 20건 의미 — spec.md 의 "10 writes per hour" 와 차이 있음 → **RED 단계 사용자 confirm 필요**) | TDD |

**Heads-up — AC-CONTENT-140 수치 충돌**:
- spec.md REQ-CONTENT-140 본문: "per-IP rate limits of **10 writes per hour** to documents/comments" (단일 합산 임계).
- Slice E Q5 결정: document=5/hr, comment=20/hr (endpoint 별 분리).
- 사용자 의도 (사용자 확정 결정: "미인증 IP per-hour: document 5건, comment 20건") 와 spec.md 의 "10 writes per hour" 가 다름.
- **본 슬라이스는 사용자 확정 결정을 우선** 하되, RED 단계에서 spec.md 와의 차이를 사용자에게 한 번 더 확인 후 진행. 필요 시 spec.md 본문 update 동반.

---

## 6. @MX 태그 후보

| 위치 | 태그 | 이유 |
| ---- | ---- | ---- |
| `attachment.ts:requestUpload` | `@MX:ANCHOR` | Slice E 의 파일 업로드 진입점 — Document/Comment 모두에서 호출. SPEC: `REQ-CONTENT-030`. fan_in 잠재적 ≥ 3 (web + 향후 admin + 모바일). |
| `rate-limit.ts:checkRateLimit` | `@MX:ANCHOR` | 모든 컨텐츠 write 경로의 gate. fan_in ≥ 3 (document.create, comment.create, attachment.requestUpload). SPEC: `REQ-CONTENT-140`. |
| `storage/s3.ts:S3Storage` | `@MX:WARN` | 외부 의존성 (AWS SDK) — 인증 실패/네트워크 지연/AWS cost. `@MX:REASON: presign 발급 실패는 사용자 업로드 전체 차단; 인증 키 누락은 부팅 단계에서 fail-fast 처리 필요`. |
| `storage/scanner.ts:NoopScanner` | `@MX:NOTE` | Slice E 기본값 — 실제 ClamAV 통합은 SPEC-INFRA-001 (가칭) 이월. `@MX:TODO: 운영 환경에서는 ClamAVScanner 로 교체 필수`. |
| `attachment.ts:completeUpload` | `@MX:WARN` | 다단계 작업 (token 검증 → head → scan → tx) — 부분 실패 시 storage 객체 orphan 위험. `@MX:REASON: virus 검출 시 storage.delete 가 실패하면 dangling object — cleanup cron 필요 (Heads-up)`. |

언어는 `language.yaml.code_comments: ko` 기준 — 한국어 description 작성.

---

## 7. 회귀 보장

- **Slice B (Document CRUD)**: tRPC `content.document.create` 에 rate-limit gate 가 추가됨. 기존 695개 테스트의 fixture 가 `ContentRateLimit` 테이블을 매번 비우도록 setup 보강. window 내 호출량은 어떤 단일 테스트도 5건을 넘지 않으므로 임계 미달.
- **Slice C (Comment + Category + Search)**: `content.comment.create` 도 동일 패턴 적용. fixture 정리 동일.
- **Slice D (Vote/Report/Trash)**: rate-limit 적용 대상 아님 (읽기성 mutation, vote toggle 등은 별도 정책 가능 — Slice F 이월). Slice D 라우터 변경 없음.
- **Prisma 마이그레이션**: `ContentRateLimit` 추가는 신규 테이블 — 기존 테이블 영향 없음. `pnpm prisma migrate dev` 한 번으로 처리.

---

## 8. Out of Scope (Slice E 미포함, 추후 SPEC 이월)

- **ClamAV 실제 통합** — `ClamAVScanner` 구현체. SPEC-INFRA-001 (가칭).
- **운영 환경 S3 버킷/CDN/CloudFront 셋업** — IaC. SPEC-INFRA-001.
- **익명 사용자 업로드** — 본 슬라이스는 `protectedProcedure` 만. spec.md REQ-CONTENT-140 의 anonymous 시나리오 (rate limit 본문) 는 식별 채널 (IP) 만으로 처리하되, 라우터는 일단 인증 필수.
- **첨부 다운로드 카운트 증가 (REQ-CONTENT-033 `download_count` ++)** — 다운로드 라우터 (`content.attachment.download`) 가 필요. 본 슬라이스는 `getDownloadUrl` helper 만. 다운로드 카운트는 Slice F.
- **이미지 메타데이터 서버측 추출** — sharp/ffprobe 으로 width/height/duration 추출. 본 슬라이스는 클라이언트가 입력값 제공 (없으면 null).
- **첨부 cleanup cron** — orphan storage 객체, 만료된 uploadToken 미사용 storage 객체 청소. SPEC-INFRA-001.
- **DocumentReport admin notification workflow** — Slice D 의 `resolveReport` 만 있음. 이메일/푸시 알림은 SPEC-NOTIFICATION-001 (가칭).
- **Site-level rate limit 설정 UI** — admin 페이지에서 임계값 조정. Slice F 이월.
- **`Document.votedCount` 의 UP/DOWN 분리 컬럼** — Slice D 가 남긴 숙제. Slice F 이월 — 마이그레이션 + 카운트 백필 필요.
- **Custom Fields (REQ-CONTENT-120/121)** — `DocumentExtraKey` + 동적 Zod 생성 + 폼 렌더러. Slice F.
- **Trash retention cron (REQ-CONTENT-101)** — 만료된 휴지통 자동 영구 삭제. SPEC-INFRA-001.

---

## 9. Heads-up for Slice F

Slice F 우선순위 후보 (Slice E 완료 후):

1. **Custom Fields (REQ-CONTENT-120/121)** — `DocumentExtraKey` 정의 CRUD, 게시판별 동적 Zod schema 생성, Document.extraVars 검증 + 검색 (REQ-CONTENT-063 GIN). Server-side renderer 및 폼 컴포넌트 (`apps/web/components/board/ExtraField.tsx`).
2. **Report admin notification workflow** — `resolveReport` 외에 알림 발송. SPEC-NOTIFICATION-001 의존.
3. **Trash retention cron** — SPEC-INFRA-001 의존.
4. **Slice C 의 `Document.votedCount` 를 UP/DOWN 분리 컬럼으로 확장** — `votedUpCount`, `votedDownCount` 신규. Slice D 의 vote 도메인 함수 + Slice C 의 search 정렬 모두 갱신.
5. **첨부 다운로드 카운트 증가 + 차단 정책** — `content.attachment.download` 라우터, hot-link 방지.
6. **Site-level configurable rate limits** — `SiteSetting` 으로 임계값 이전, admin UI.

---

## 10. 검증 체크리스트 (구현 완료 기준)

- [ ] `pnpm test` — 신규 32~35개 테스트 (F+R+A+C) 모두 통과
- [ ] `pnpm test` — 기존 695개 테스트 회귀 없음
- [ ] `pnpm prisma migrate status` — `add_content_rate_limit` 적용 완료
- [ ] `pnpm typecheck` — strict mode 통과 (any/non-null assertion 미사용)
- [ ] `pnpm lint` — biome/eslint 통과
- [ ] `.env.example` 신규 변수 6개 추가 + dev 가이드 갱신 (MinIO docker-compose 스니펫 권장)
- [ ] @MX 태그 5개 추가 (ANCHOR 2, WARN 2, NOTE 1) — 한국어 description
- [ ] AC-CONTENT-030 / 031 / 140 acceptance criteria 통과
- [ ] spec.md 의 REQ-CONTENT-140 anonymous 임계 (10/hr) 과 Slice E 의 분리 임계 (5+20/hr) 차이 — 사용자 confirm 후 spec.md 갱신 여부 결정

---

End of Slice E plan.
