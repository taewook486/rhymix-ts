---
id: SPEC-FILE-001-plan
title: 파일 도메인 독립 패키지 구현 계획 (2 Slices)
spec: SPEC-FILE-001
created: 2026-05-27
status: draft
language: ko
---

# Implementation Plan — SPEC-FILE-001

본 plan은 `spec.md`의 2개 슬라이스를 file-level 작업으로 분해한다. 각 슬라이스는 독립적으로 implementable + reviewable + testable이며, slice 종료마다 acceptance gate가 강제된다.

총 우선순위: **Slice A (P0, 차단형) → Slice B (P1)**.

병행 가능성: Slice A는 SPEC-POINT-001 Slice A와 병행 가능 (다른 src files). Slice B는 SPEC-DOCUMENT-001 + SPEC-COMMENT-001 Slice 전체 완료 후 권장 (이벤트 emit hook 존재 전제).

---

## Slice A: 패키지 분리 (Package Separation)

**목표**: `packages/board/src/storage/` + `packages/board/src/attachment.ts`를 신규 `packages/file/src/`로 이동. **0 behavior change**. 기존 ~40 tests로 회귀 가드.

**우선순위**: P0 차단형 — 본 슬라이스 미완 시 Slice B 시작 불가.

**Acceptance Gate**: AC-FILE-A1.

### A.1 Pre-flight (검증)

작업:
1. `git status` 확인 — 기존 파일 인벤토리:
   - `packages/board/src/attachment.ts` (550+ LoC)
   - `packages/board/src/attachment.test.ts` (~700 LoC)
   - `packages/board/src/storage/memory.ts`
   - `packages/board/src/storage/s3.ts`
   - `packages/board/src/storage/scanner.ts`
   - `packages/board/src/storage/clamav.ts`
   - `packages/board/src/storage/clamav.test.ts`
   - `packages/board/src/storage/mime.ts`
   - `packages/board/src/storage/storage.test.ts`
   - `packages/board/src/storage/upload-token.ts`
   - `packages/board/src/storage/types.ts`
2. attachment.ts가 의존하는 외부 심볼 grep:
   - `from './storage/types'`, `from './storage/mime'`, `from './storage/upload-token'` (모두 storage/ 디렉토리 내 → 함께 이동)
   - `from '@prisma/client'`, `from 'node:crypto'`, `from 'zod'` (외부)
3. `apps/web/**`에서 `from '@rhymix-ts/board'`를 통해 file 관련 심볼 import하는 callsite grep:
   - 예상 위치: `apps/web/lib/board/actions.ts`, `apps/web/app/api/...` (있다면)
   - 결과를 A.5 단계 적용 대상 리스트로 사용
4. `pnpm test packages/board -- --reporter=verbose --run` 베이스라인 실행 — green 확인. storage/* + attachment 테스트가 통과하는지 카운트 (예상 ~40 tests).
5. SPEC-DOCUMENT-001 Slice A 진행 상황 확인 — `packages/document/src/` 존재 확인 (병행 가능 여부 검증).

검증:
- `pnpm tsc --noEmit` 0 error 베이스라인 확인
- 이동 대상 파일 11개 식별 완료 (소스 6 + 테스트 3 + types 1 + scanner 1)

### A.2 신규 패키지 골조 생성

작업:
1. `packages/file/package.json` 신규:
   ```json
   {
     "name": "@rhymix-ts/file",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "scripts": { "test": "vitest run", "test:watch": "vitest" },
     "dependencies": {
       "@rhymix-ts/core": "workspace:*",
       "@rhymix-ts/db": "workspace:*",
       "@rhymix-ts/auth": "workspace:*",
       "zod": "...",
       "@aws-sdk/client-s3": "...",
       "@aws-sdk/s3-request-presigner": "..."
     },
     "devDependencies": { "vitest": "...", "@types/node": "..." }
   }
   ```
   (sharp, clamscan은 Slice B에서 추가 — Slice A는 zero behavior change)
2. `packages/file/tsconfig.json` 신규 (monorepo `tsconfig.base.json` extend)
3. `packages/file/vitest.config.ts` 신규 (root mirror)
4. `packages/file/README.md` 1-page stub: "File domain package — extracted from board (SPEC-FILE-001)"

검증:
- `pnpm -F @rhymix-ts/file install` 성공
- `pnpm -F @rhymix-ts/file test -- --run --reporter=verbose` 통과 (현재 0 test → 0 fail)

### A.3 소스 파일 이동 (mechanical)

작업 (각각 `git mv`로 수행):

| From | To | LoC |
|---|---|---|
| `packages/board/src/attachment.ts` | `packages/file/src/attachment.ts` | 550+ |
| `packages/board/src/attachment.test.ts` | `packages/file/src/attachment.test.ts` | ~700 |
| `packages/board/src/storage/memory.ts` | `packages/file/src/storage/memory.ts` | ~120 |
| `packages/board/src/storage/s3.ts` | `packages/file/src/storage/s3.ts` | ~200 |
| `packages/board/src/storage/scanner.ts` | `packages/file/src/storage/scanner.ts` | ~80 |
| `packages/board/src/storage/clamav.ts` | `packages/file/src/storage/clamav.ts` | ~50 (stub) |
| `packages/board/src/storage/clamav.test.ts` | `packages/file/src/storage/clamav.test.ts` | ~100 |
| `packages/board/src/storage/mime.ts` | `packages/file/src/storage/mime.ts` | ~150 |
| `packages/board/src/storage/storage.test.ts` | `packages/file/src/storage/storage.test.ts` | ~300 |
| `packages/board/src/storage/upload-token.ts` | `packages/file/src/storage/upload-token.ts` | ~80 |
| `packages/board/src/storage/types.ts` | `packages/file/src/storage/types.ts` | ~100 |

NOT moved (REQ-FILE-015):
- `packages/board/src/document.ts` 등 SPEC-DOCUMENT-001 처리 대상 (이미 SPEC-DOCUMENT-001 Slice A에서 packages/document로 이동될 예정 — 의존성: 본 SPEC Slice A가 SPEC-DOCUMENT-001 Slice A와 병행 시 양 SPEC의 file 우선 또는 document 우선 순서 결정 필요. **권고**: SPEC-DOCUMENT-001 Slice A를 먼저 완료한 후 본 Slice A 시작 — board 패키지 변형이 한 SPEC씩 격리됨.)
- `packages/board/src/comment.ts` (SPEC-COMMENT-001)
- `packages/board/src/category.ts` (SPEC-DOCUMENT-001 Slice C)
- `packages/board/src/index.ts` → 유지 + re-export 제거 (A.5)
- `packages/board/src/config.ts` → 유지
- `packages/board/src/components/`, `routes/` → 유지

검증:
- 이동 후 `packages/board/src/attachment.ts` 등이 더 이상 존재하지 않음 (`ls packages/board/src/` 확인)
- `packages/board/src/storage/` 디렉토리 자체가 제거됨 (모든 파일 이동)
- `packages/file/src/`에 11개 파일 존재
- 임포트 경로는 아직 미수정 — 빌드 깨지는 상태 OK (다음 단계에서 해결)

### A.4 임포트 경로 수정 (`packages/file` 내부)

작업:
1. `packages/file/src/attachment.ts`:
   - `import { ... } from './storage/types'` → `from './storage/types'` (같은 패키지로 함께 이동 → path 변경 불필요)
   - `import { assertMimeAllowed, ... } from './storage/mime'` → 동일하게 path 그대로 (same package)
   - `import { signUploadToken, ... } from './storage/upload-token'` → 동일
2. `packages/file/src/storage/scanner.ts` (NoopScanner 등):
   - storage/types 참조 그대로
3. `packages/file/src/storage/s3.ts`:
   - aws-sdk import 그대로
4. `packages/file/src/index.ts` 신규 — REQ-FILE-013에 따라 전체 barrel export:
   ```typescript
   export * from './attachment';
   export * from './storage/types';
   export { InMemoryStorage } from './storage/memory';
   export { S3Storage } from './storage/s3';
   export { NoopScanner } from './storage/scanner';
   export { ClamAVScanner } from './storage/clamav';
   export { assertMimeAllowed, assertSizeAllowed, UnsupportedMimeTypeError, FileTooLargeError } from './storage/mime';
   export { signUploadToken, verifyUploadToken, InvalidUploadTokenError } from './storage/upload-token';
   ```
5. 동일 패키지 내 cross-file 의존성 정리 — 모두 same package이므로 path 변경 없음

검증:
- `pnpm -F @rhymix-ts/file tsc --noEmit` 0 error
- `pnpm -F @rhymix-ts/file test` 40+ tests pass — characterization 회귀 가드 통과

### A.5 board 패키지에서 file 의존 정리 + apps/web 임포트 갱신

작업:
1. `packages/board/src/index.ts` 갱신 — file 관련 re-export 제거:
   - 기존: `export * from './storage/types'`, `export * from './attachment'` 등 → 제거
   - REQ-FILE-096: re-export shim 없이 깨끗하게 분리 (board 사용자는 직접 `@rhymix-ts/file` 임포트)
2. `packages/board/package.json`에서 — board가 file을 내부적으로 사용하는 callsite가 있는지 검토 후 결정:
   - **검토 결과 (예상)**: board는 file을 직접 호출하지 않음. document/comment 도메인 함수가 attachment를 직접 호출하는 경우는 있을 수 있으나, Phase 2에서 SPEC-DOCUMENT-001/SPEC-COMMENT-001이 이미 분리됨 → file 패키지를 직접 import
   - 만일 board service에 file 호출이 남아있다면 `"@rhymix-ts/file": "workspace:*"` 추가
3. `apps/web/**`의 직접 import 갱신 (A.1 grep 결과 기반):
   - `from '@rhymix-ts/board'` 중 file 관련 심볼만 import하는 경우 → `from '@rhymix-ts/file'`로 교체
   - 예상 변경 파일:
     - `apps/web/lib/board/actions.ts` (만일 file action이 있다면)
     - `apps/web/lib/file/*` (만일 별도 lib이 있다면)
     - tRPC root router 정의 (SPEC-DOCUMENT-001 Slice B 완료 후 fileRouter 마운트 검토 — Slice B에서)
4. `packages/document/src/` 및 `packages/comment/src/`에서 attachment를 import하는 경우(현재 cascade 호출):
   - SPEC-DOCUMENT-001 + SPEC-COMMENT-001은 이미 file 패키지를 직접 import하지 않으며 cascade는 cascade onDelete: SetNull로 처리 (REQ-FILE-004). 본 SPEC Slice A에서는 변경 없음. Slice B에서 이벤트 구독 도입.
5. `pnpm-workspace.yaml` 확인 — `packages/*` glob에 의해 `packages/file`가 자동 포함되는지 (예상: yes)

검증:
- `pnpm install` (root) 성공
- `pnpm tsc --noEmit` (root) 0 error 전체
- `pnpm test` (root) 모든 패키지 통과
- `pnpm build` (root) — apps/web 빌드 성공
- `madge --circular packages/file/src/` — circular 없음 (REQ-FILE-011, 012)

### A.6 Slice A 종료 게이트

체크리스트:
- [ ] `packages/file/`에 11개 파일 존재
- [ ] `packages/board/src/storage/` 디렉토리 + `packages/board/src/attachment.ts` 더 이상 존재하지 않음
- [ ] `pnpm test packages/file` 40+ tests pass
- [ ] `pnpm test packages/board` (남은 테스트) pass
- [ ] `pnpm test apps/web` pass
- [ ] `pnpm tsc --noEmit` (root) 0 error
- [ ] `pnpm build` apps/web 성공
- [ ] `packages/file/package.json`에 `@rhymix-ts/board` 의존 **없음** (REQ-FILE-011)
- [ ] `packages/file/package.json`에 `@rhymix-ts/document` / `@rhymix-ts/comment` 의존 **없음** (REQ-FILE-012)
- [ ] circular dependency check pass
- [ ] AC-FILE-A1 (spec.md Section 4) 통과

EARS coverage: REQ-FILE-001~019, REQ-FILE-090, REQ-FILE-093, REQ-FILE-096, REQ-FILE-097

---

## Slice B: 업로드 API + 이미지 처리 + Cascading Delete

**목표**: 4개 신규 기능 통합 — (1) multipart upload route, (2) sharp 이미지 파이프라인, (3) ClamAV 통합, (4) cascading delete 이벤트 구독.

**우선순위**: P1 — Slice A 완료 + SPEC-DOCUMENT-001/SPEC-COMMENT-001 이벤트 emit 완료 후 시작.

**Acceptance Gate**: AC-FILE-B1, AC-FILE-B2, AC-FILE-B3, AC-FILE-B4.

### B.1 의존성 추가

작업:
1. `packages/file/package.json` dependencies 추가:
   ```json
   "sharp": "^0.33.0",
   "clamscan": "^2.4.0",
   "node:fs/promises": "(builtin)",
   "node:stream": "(builtin)",
   "node:stream/promises": "(builtin)"
   ```
2. devDependencies:
   ```json
   "@types/clamscan": "..."
   ```
3. root `pnpm install` 실행
4. Sharp 네이티브 binary 검증 (Windows + Linux 양쪽) — CI에서 둘 다 테스트

검증:
- `pnpm install` 성공
- `pnpm -F @rhymix-ts/file test` 기존 40+ pass 유지

### B.2 LocalDiskStorage 구현 (REQ-FILE-019, 052)

신규 파일: `packages/file/src/storage/local-disk.ts`

작업:
1. `FileStorage` interface 구현 — write/read/head/delete/getDownloadUrl
2. `getUploadPresignedUrl`은 throw (local backend에는 presign 없음 — REQ-FILE-052)
3. storageKey 안전성: path traversal 방어 (`..` 거부, root 안에 머무름)
4. directory auto-create (`fs.mkdir(recursive: true)`)
5. 스트리밍 write (Web ReadableStream → Node Readable → fs.createWriteStream)
6. download URL 반환 패턴: `/api/files/by-key/{encoded-key}/download` — apps/web route handler가 처리

검증:
- 신규 테스트 `local-disk.test.ts` 5+ tests: write/read/delete, head 정확성, path traversal 방어, missing file head returns null

### B.3 Storage backend factory

신규 파일: `packages/file/src/storage/factory.ts`

작업:
1. `getStorage(): FileStorage` — env-driven selection:
   ```typescript
   export function getStorage(): FileStorage {
     const backend = process.env.STORAGE_BACKEND ?? 'local';
     switch (backend) {
       case 'local': return new LocalDiskStorage(process.env.RX_LOCAL_STORAGE_ROOT ?? './uploads');
       case 's3': return new S3Storage({ bucket: process.env.AWS_S3_BUCKET!, region: process.env.AWS_REGION! });
       case 'memory': return new InMemoryStorage(); // test only
       default: throw new Error(`Unknown STORAGE_BACKEND: ${backend}`);
     }
   }
   ```
2. `getScanner(): VirusScanner`:
   ```typescript
   export function getScanner(): VirusScanner {
     const backend = process.env.VIRUS_SCAN_BACKEND ?? 'noop';
     switch (backend) {
       case 'noop': return new NoopScanner();
       case 'clamav': return new ClamAVScanner({ host: process.env.CLAMAV_HOST ?? 'localhost', port: Number(process.env.CLAMAV_PORT ?? 3310), failOpen: process.env.CLAMAV_FAIL_OPEN === 'true' });
       default: throw new Error(`Unknown VIRUS_SCAN_BACKEND: ${backend}`);
     }
   }
   ```
3. singleton 캐싱: 모듈 레벨 변수로 한 번만 생성

검증:
- `factory.test.ts` 4+ tests: 각 backend 선택, 잘못된 backend 시 에러

### B.4 ClamAV 실구현 (REQ-FILE-060~067)

기존 파일 보강: `packages/file/src/storage/clamav.ts`

작업:
1. `clamscan` 라이브러리 통합 — `ClamScan({ clamdscan: { host, port, timeout, ... } })`
2. `scan({ storageKey, storage, knownContentType, knownSize })`:
   - storage.read(storageKey) → Buffer
   - clamscan.scanStream(buffer) 또는 scanBuffer
   - 결과 매핑: `{ clean: !isInfected, threats: viruses ?? [] }`
3. timeout handling — `Promise.race([scan, timeoutAfter(30s)])`
4. daemon unavailable handling:
   - fail-closed (default): throw → 호출자가 거부
   - fail-open (env): log warning, return `{ clean: true, threats: [] }`
5. structured logging — REQ-FILE-067

검증:
- `clamav.test.ts` 보강 — 3+ new tests:
  - mock clamscan: clean / infected / timeout / daemon-unavailable
  - fail-closed vs fail-open 차이
- EICAR test file을 직접 scan하는 integration test (선택, CI optional)

### B.5 Sharp 이미지 파이프라인 (REQ-FILE-030~037)

신규 파일: `packages/file/src/image-pipeline.ts`

작업:
1. `processImage({ storage, storageKey, originalBuffer, mimeType }): Promise<{ width: number; height: number; variantsGenerated: string[] }>`:
   ```typescript
   const sharpInstance = sharp(originalBuffer, { animated: mimeType === 'image/gif' });
   const metadata = await sharpInstance.metadata();
   const { width, height, format, pages } = metadata;
   
   // animated gif: skip variants, save original as-is
   if (format === 'gif' && (pages ?? 1) > 1) {
     await storage.write({ key: storageKey, body: originalBuffer, contentType: 'image/gif' });
     // thumb from first frame only
     const thumb = await sharp(originalBuffer, { animated: false }).rotate().withMetadata({ exif: false }).resize(200, 200, { fit: 'inside' }).webp({ quality: 80 }).toBuffer();
     await storage.write({ key: `${storageKey}.thumb.webp`, body: thumb, contentType: 'image/webp' });
     return { width, height, variantsGenerated: ['thumb'] };
   }
   
   // exif strip + auto-rotate + save original (re-encoded)
   const processed = sharpInstance.rotate().withMetadata({ exif: false });
   await storage.write({ key: storageKey, body: await processed.toBuffer(), contentType: mimeType });
   
   // variants
   const longest = Math.max(width!, height!);
   const variants: { name: string; size: number }[] = [
     { name: 'thumb', size: 200 },
     ...(longest > 480 ? [{ name: 'small', size: 480 }] : []),
     ...(longest > 1024 ? [{ name: 'medium', size: 1024 }] : []),
     ...(longest > 2048 ? [{ name: 'large', size: 2048 }] : []),
   ];
   
   const generated = await Promise.all(variants.map(async (v) => {
     const buf = await sharp(originalBuffer).rotate().withMetadata({ exif: false })
       .resize(v.size, v.size, { fit: 'inside' }).webp({ quality: 80 }).toBuffer();
     await storage.write({ key: `${storageKey}.${v.name}.webp`, body: buf, contentType: 'image/webp' });
     return v.name;
   }));
   
   return { width: width!, height: height!, variantsGenerated: generated };
   ```
2. Error handling — REQ-FILE-037: sharp throw 시 log + return `{ width: 0, height: 0, variantsGenerated: [] }` (caller가 width: null 설정)
3. mimeType별 출력 포맷 결정:
   - jpg/png/webp → re-encode to webp (variants only — 원본은 원본 포맷 유지)
   - gif (animated) → 원본 보존

검증:
- 신규 테스트 `image-pipeline.test.ts` 5+ tests:
  - jpeg 2000x1500 → thumb + small + medium + large 모두 생성 (longest > 2048? no → large 스킵 → small + medium만 추가)
  - png 320x240 (작음) → thumb만 생성
  - animated gif → variants 스킵, thumb는 first frame
  - exif가 포함된 jpeg → variants에서 exif 제거 검증
  - 손상된 이미지 buffer → throw 안 하고 fallback 반환

### B.6 Multipart Upload Route Handler (REQ-FILE-021, 022, 075)

신규 파일: `apps/web/app/api/files/upload/route.ts`

작업:
1. Next.js 16 Route Handler `POST` export
2. 세션 검증 (`getServerSession()` from `@/lib/auth` or NextAuth equiv)
3. `req.formData()` → File 객체 추출
4. MIME + size 검증 (`assertMimeAllowed`, `assertSizeAllowed`)
5. storageKey 생성 (UUID + 날짜)
6. storage.write (streaming where possible — File.stream() → ReadableStream)
7. virus scan (`scanner.scan(...)`)
8. 이미지면 sharp pipeline 호출
9. Document/Comment ACL 검증 — uploadTargetType + uploadTargetId 받으면 해당 row 존재 확인 + author 권한 검증
10. cover image auto-detect — `prisma.fileAttachment.count({ where: { documentId, coverImage: true, isvalid: true } })` 0이면 cover 후보
11. `prisma.$transaction(async (tx) => { tx.fileAttachment.create(...); tx.document.update({ uploadedCount: { increment: 1 } }) })`
12. emit `file.uploaded` event
13. 응답 JSON

에러 매핑:
- `UnsupportedMimeTypeError` → 415
- `FileTooLargeError` → 413
- `VirusDetectedError` → 422
- ACL 실패 → 403
- 세션 없음 → 401
- 그 외 → 500

검증:
- 신규 테스트 `apps/web/app/api/files/upload/route.test.ts` 4+ tests:
  - happy path: 1920x1080 jpeg 업로드 → 201 + variants 생성
  - oversize: 100MB jpeg → 413
  - unsupported MIME: exe → 415
  - unauthenticated → 401

### B.7 Download Route Handler (REQ-FILE-076)

신규 파일: `apps/web/app/api/files/[id]/download/route.ts`

작업:
1. `GET /api/files/[id]/download?variant=thumb` 핸들러
2. id로 FileAttachment 조회 + ACL (document/comment SECRET 검증)
3. variant 결정 (query param 또는 default 'original')
4. storageKey 계산: original이면 그대로, variant면 `${storageKey}.${variant}.webp`
5. `STORAGE_BACKEND=local`: fs.createReadStream → Response body
6. `STORAGE_BACKEND=s3`: `storage.getDownloadUrl({ key })` → 302 redirect
7. `Content-Disposition: attachment; filename="..."` if `directDownload` flag

추가 신규 파일: `apps/web/app/api/files/by-key/[...key]/download/route.ts` — local backend가 발급한 in-app URL 처리

검증:
- 신규 테스트 `download/route.test.ts` 3+ tests: original / thumb variant / 권한 없는 SECRET document 첨부 → 403

### B.8 Cascading Delete 이벤트 구독 (REQ-FILE-040~049)

신규 파일: `packages/file/src/events.ts`

작업:
1. `fileEvents` typed emitter (own emitter for file-originated events: file.uploaded, file.deleted, file.cover-image-changed)
2. `registerFileEventSubscribers(emitters, ctx)`:
   ```typescript
   export interface FileEventSubscriberInput {
     documentEvents: DocumentEmitter;
     commentEvents: CommentEmitter;
   }
   
   export function registerFileEventSubscribers(
     emitters: FileEventSubscriberInput,
     ctx: { prisma: PrismaClient; storage: FileStorage },
   ): { dispose: () => void } {
     const offDocDel = emitters.documentEvents.on('document.deleted', async (e) => {
       await cascadeDeleteByDocument({ documentId: e.documentId }, ctx).catch(logFailure);
     });
     // ... similar for purged/restored, comment.deleted
     return { dispose: () => { offDocDel(); ... } };
   }
   ```
3. `cascadeDeleteByDocument({ documentId }, ctx)`:
   - `prisma.fileAttachment.updateMany({ where: { documentId, isvalid: true }, data: { isvalid: false } })`
   - Document.uploadedCount는 재계산하지 않음 (deletedAt = not null이므로 listing에서 제외됨)
4. `cascadeRestoreByDocument({ documentId }, ctx)`:
   - `prisma.fileAttachment.updateMany({ where: { documentId, isvalid: false }, data: { isvalid: true } })`
5. `cascadeHardDeleteByDocument({ documentId }, ctx)`:
   - `prisma.fileAttachment.findMany({ where: { documentId } })` → 각각 storage.delete (best-effort, async)
   - `prisma.fileAttachment.deleteMany({ where: { documentId } })`
6. `cascadeDeleteByComment({ commentId }, ctx)` 동일 패턴

신규 파일: `apps/web/lib/file-init.ts`
- `instrumentation.ts`(또는 layout level) 에서 한 번만 호출
- `registerFileEventSubscribers({ documentEvents, commentEvents }, { prisma, storage })`

검증:
- 신규 테스트 `events.test.ts` 4+ tests:
  - documentEvents.emit('document.deleted', ...) → 첨부 isvalid 모두 false
  - documentEvents.emit('document.restored', ...) → isvalid 모두 true
  - documentEvents.emit('document.purged', ...) → row delete + storage.delete 호출
  - commentEvents.emit('comment.deleted', ...) → comment 첨부 isvalid false

### B.9 tRPC Router 신규 (REQ-FILE-070~073)

신규 파일: `packages/file/src/server/router.ts`

작업:
1. fileRouter procedure 정의:
   - `getDownloadUrl(public)`: ACL 검증 + storage.getDownloadUrl
   - `getMetadata(public)`: safe field만 반환
   - `requestUpload(protected)`: 기존 attachment.requestUpload 호출
   - `completeUpload(protected)`: 기존 completeUpload 호출
   - `delete(protected)`: deleteAttachment 호출 (소유권 검증 포함)
   - `setCoverImage(protected)`: 트랜잭션
   - `clearCoverImage(protected)`: 트랜잭션
   - `listMyAttachments(protected)`: cursor pagination
   - `admin.listOrphans(admin)`: isvalid=false 목록
   - `admin.purgeOrphans(admin)`: batch delete + storage.delete
   - `admin.cascadeRebuild(admin)`: counter recount
2. Error mapping (REQ-FILE-078)
3. adminProcedure middleware

검증:
- `router.test.ts` 5+ tests

### B.10 Server Actions (REQ-FILE-077)

신규 파일: `packages/file/src/server/actions.ts`

작업:
1. `'use server'` 디렉티브
2. `requestUploadAction(formData)`, `completeUploadAction(formData)`, `deleteAttachmentAction(formData)`, `setCoverImageAction(formData)`
3. ActionResult discriminated union 반환
4. revalidatePath / revalidateTag 호출

검증:
- `actions.test.ts` 2+ tests

### B.11 apps/web 마운트

작업:
1. `apps/web/src/server/trpc/root.ts`에 `import { fileRouter } from '@rhymix-ts/file/server'` 추가
2. appRouter에 `file: fileRouter` 마운트
3. `apps/web/lib/file-init.ts` 작성 + `instrumentation.ts`에서 호출
4. 기존 `apps/web/lib/board/actions.ts`의 file 관련 액션(만일 있다면)을 `@rhymix-ts/file/server/actions`로 마이그레이션

검증:
- `pnpm dev`로 apps/web 기동 → 콘솔 에러 없음
- e2e: 글쓰기 폼에서 이미지 업로드 → 미리보기 동작 + DB row 검증

### B.12 신규 마이그레이션 (선택, additive only)

작업:
1. Slice B는 schema 변경을 최소화. 신규 컬럼 추가 없음 (image variant key는 derived).
2. 만일 `@@index([memberId, regdate])`가 필요하면 (REQ-FILE-006 옵션) 추가 마이그레이션:
   ```sql
   CREATE INDEX "file_attachments_memberId_regdate_idx" ON "file_attachments" ("memberId", "regdate");
   ```
   (Slice B 종료 시점 admin/member upload history UI에서 필요 여부 결정)

검증:
- `pnpm prisma migrate dev` 통과
- 기존 테스트 회귀 없음

### B.13 Slice B 종료 게이트

체크리스트:
- [ ] `packages/file/src/storage/local-disk.ts` 존재 + 5+ tests pass
- [ ] `packages/file/src/storage/factory.ts` 존재 + 4+ tests pass
- [ ] `packages/file/src/storage/clamav.ts` 실구현 + 3+ tests pass
- [ ] `packages/file/src/image-pipeline.ts` 존재 + 5+ tests pass
- [ ] `apps/web/app/api/files/upload/route.ts` 존재 + 4+ tests pass
- [ ] `apps/web/app/api/files/[id]/download/route.ts` 존재 + 3+ tests pass
- [ ] `packages/file/src/events.ts` 존재 + 4+ tests pass
- [ ] `apps/web/lib/file-init.ts` 존재 + instrumentation에서 호출
- [ ] `packages/file/src/server/router.ts` 존재 + 5+ tests pass
- [ ] `packages/file/src/server/actions.ts` 존재 + 2+ tests pass
- [ ] sharp 의존성이 monorepo install 시 정상 (Windows + Linux 양쪽)
- [ ] e2e: 이미지 업로드 + 다운로드 + cover 변경 + cascading delete 시나리오 통과
- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm build` apps/web 성공
- [ ] 신규 ~25 tests + 기존 ~40 = ~65 total
- [ ] AC-FILE-B1, AC-FILE-B2, AC-FILE-B3, AC-FILE-B4 통과

EARS coverage: REQ-FILE-005, 020~029, 030~039, 040~049, 050~059(local 부분), 060~067, 070~079, 091, 098, 099

---

## Acceptance Gates per Slice

| Gate | Slice | EARS | Test Count Delta |
|---|---|---|---|
| AC-FILE-A1 (package separation, regression-free) | A | REQ-FILE-001~019, 090, 093, 096 | 0 (relocate-only) |
| AC-FILE-B1 (image pipeline + auto cover) | B | REQ-FILE-030~034, 048 | +5 (image-pipeline) +3 (cover) |
| AC-FILE-B2 (cascading soft delete) | B | REQ-FILE-040~043 | +4 (events) |
| AC-FILE-B3 (MIME + virus scan) | B | REQ-FILE-024, 060~067 | +3 (clamav) +1 (mime) |
| AC-FILE-B4 (storage backend selectable) | B | REQ-FILE-050, 052 | +5 (local-disk) +4 (factory) |
| Route handler tests | B | REQ-FILE-021, 022, 075, 076 | +4 (upload route) +3 (download route) |
| tRPC + actions | B | REQ-FILE-070~077 | +5 (router) +2 (actions) |
| **Total new tests** | | | **~25 (matches MP-002 target ~20 + image overhead)** |

---

## Risk Mitigations per Slice

| Risk (from spec.md Section 6) | Slice | Mitigation Action |
|---|---|---|
| board → file import 누락 | A | Slice A.6 게이트의 `pnpm build` apps/web 통과 강제. SPEC-DOCUMENT-001 Slice A를 먼저 완료 후 본 SPEC A 시작 권고 (board 변형 격리). |
| sharp 네이티브 의존성 monorepo install 실패 | B | pnpm-lock.yaml에 platform-specific entry. CI에서 Windows + Linux 양쪽 테스트. |
| ClamAV daemon 없는 환경 업로드 막힘 | B | NoopScanner default + CLAMAV_FAIL_OPEN env. README onboarding 가이드. |
| Cascading delete subscriber boot timing | B | `instrumentation.ts`(boot once) + idempotency. e2e test로 실제 발행/구독 검증. |
| 이미지 variants 5배 storage | B | webp + q=80. 평균 variant 30~50%. trade-off 명시. |
| cover_image race condition | B | 자동 cover는 batch 첫 image만, 명시적 변경은 트랜잭션. last-write-wins. |
| presigned URL 만료 | B | TTL 5분/10분 + expiresAt 노출. 클라이언트 재발급 책임. |
| circular dep (file ↔ document/comment) | A/B | REQ-FILE-011/012 enforced. 이벤트 버스는 외부 inject(events.ts), file은 document/comment를 import 안 함. madge --circular 게이트. |

---

## Token Budget Estimation (per /moai run)

Slice A: ~40K tokens (file 이동 + 임포트 갱신 — mechanical, document/comment SPEC보다 단순)
Slice B: ~120K tokens (sharp 파이프라인 + multipart route + ClamAV 통합 + cascading events + 25+ new tests — 가장 복잡한 슬라이스)

**Total `/moai run SPEC-FILE-001` 추정**: ~160K tokens. 180K 예산 이내. **단 sharp의 platform-specific binary 검증으로 시간이 더 걸릴 수 있음** — 단일 실행 권장이나 분할 가능:

분할 실행 옵션:
- `/moai run SPEC-FILE-001 --slice A` (~40K)
- `/clear`
- `/moai run SPEC-FILE-001 --slice B` (~120K)

---

## Dependencies & Sequencing

```
SPEC-AUTH-001  ──┐
                 │ (Actor, session)
SPEC-ADMIN-001 ──┤ (module registry)
                 │
SPEC-DOCUMENT-001 ── Slice A (package separation, REQ-DOC-013)
                  ├─ Slice C (events.ts emit) ──┐
                  │                              │
SPEC-COMMENT-001 ── Slice A (package separation) │
                  └─ Slice C (events.ts emit) ───┤
                                                  ▼
                                       SPEC-FILE-001 Slice A (package separation)
                                                  │
                                                  ▼
                                       Slice B (multipart + sharp + clamav + events subscribe)
                                                  │
                                                  ▼
                                       (downstream consumers)
                                       SPEC-ADDON-PHOTOSWIPE-001 (Phase 4)
                                       SPEC-ADMIN-EXTRAS-001 (Phase 5)
```

순서 권고:
1. SPEC-DOCUMENT-001 Slice A 완료 → board 패키지 안정화
2. SPEC-COMMENT-001 Slice A 완료 → board 패키지 추가 안정화
3. **SPEC-FILE-001 Slice A** 시작 — storage + attachment만 남은 board에서 분리
4. SPEC-DOCUMENT-001 Slice C 완료 (events.ts 발행)
5. SPEC-COMMENT-001 Slice C 완료 (events.ts 발행)
6. **SPEC-FILE-001 Slice B** 시작 — 이벤트 구독 prerequisite 충족

병행 가능: SPEC-FILE-001 Slice A는 SPEC-DOCUMENT-001 Slice B/C, SPEC-COMMENT-001 Slice B/C와 병행 가능 (다른 src files).

---

Version: 1.0.0
Status: draft
