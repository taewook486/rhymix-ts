# @rhymix-ts/file

Rhymix-TS 파일 첨부/스토리지 패키지.

파일 업로드, 스토리지 추상화(로컬/S3/메모리), 바이러스 스캔, 이미지 처리, 고아 파일 정리를 담당한다.

## 설치

```bash
pnpm add @rhymix-ts/file
```

## 주요 exports

| export | 설명 |
|---|---|
| `getStorage` / `getScanner` | 스토리지·스캐너 팩토리 (설정에 따라 구현체 선택) |
| `LocalDiskStorage` / `S3Storage` / `InMemoryStorage` | 스토리지 구현체 |
| `NoopScanner` / `ClamAVScanner` | 바이러스 스캐너 구현체 |
| `assertMimeAllowed` / `assertSizeAllowed` | 업로드 MIME/크기 검증 |
| `signUploadToken` / `verifyUploadToken` | 업로드 토큰 서명·검증 |
| `processImage` / `isImageMimeType` | 이미지 처리 파이프라인 |
| `listOrphans` / `purgeOrphans` / `cascadeRebuild` | 고아 파일 조회·정리 (관리자) |
| `migrateStorage` | 스토리지 백엔드 간 마이그레이션 |
| `createFileRouter` | tRPC 라우터 |
| `registerFileEventSubscribers` | 문서/댓글 삭제 시 첨부파일 cascade 삭제 |

> Server Actions(`'use server'`)는 브라우저 번들 안전을 위해 메인 배럴에서 export하지 않는다. `@rhymix-ts/file/server/actions`에서 직접 import한다.

## 의존성

- `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/auth`
- `sharp`, `@aws-sdk/client-s3`, `clamscan`, `@trpc/server`
