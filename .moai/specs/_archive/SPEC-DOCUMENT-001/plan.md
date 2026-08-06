---
id: SPEC-DOCUMENT-001-plan
title: 문서 도메인 독립 패키지 구현 계획 (3 Slices)
spec: SPEC-DOCUMENT-001
created: 2026-05-27
status: draft
language: ko
---

# Implementation Plan — SPEC-DOCUMENT-001

본 plan은 `spec.md`의 3개 슬라이스를 file-level 작업으로 분해한다. 각 슬라이스는 독립적으로 implementable + reviewable + testable이며, slice 종료마다 acceptance gate가 강제된다.

총 우선순위: **Slice A (P0, 차단형) → Slice B (P0) → Slice C (P0)**.

병행 가능성: Slice A는 SPEC-COMMENT-001 Slice A와 병행 가능 (comment.ts는 본 SPEC 대상 아님). Slice B는 SPEC-LAYOUT-001 완료 후 권장.

---

## Slice A: 패키지 분리 (Package Separation)

**목표**: `packages/board/src/`에 응집된 document 도메인 코드를 신규 `packages/document/src/`로 이동. **0 behavior change**. 기존 ~110 tests로 회귀 가드.

**우선순위**: P0 차단형 — 본 슬라이스 미완 시 Slice B/C 시작 불가.

**Acceptance Gate**: AC-DOC-A1.

### A.1 Pre-flight (검증)

작업:
1. `git status` 확인 — 기존 `packages/board/src/document.ts`(555 LoC)가 의존하는 외부 심볼 grep:
   - `from './category'`, `from './permissions'`, `from './trash'`, `from './history'`, `from './extra-vars-schema'` (모두 같은 board package 내)
   - `from '@prisma/client'`, `from 'zod'` (외부)
2. `apps/web/**`에서 `from '@rhymix-ts/board'` 또는 `from '@rhymix-ts/board/...'` 임포트 카운트 grep:
   - 예상 위치: `apps/web/lib/board/actions.ts`, `apps/web/app/board/[mid]/page.tsx`(미존재 — board UI 미구현 상태)
   - 결과를 plan.md의 A.5 단계 적용 대상 리스트로 사용
3. `pnpm test packages/board` 베이스라인 실행 — green 확인 (110+ tests pass). 결과 수치를 Slice A 종료 gate 비교 기준으로 기록.

검증:
- `pnpm tsc --noEmit` 0 error 베이스라인 확인
- 이동 대상 파일 11개 + 테스트 11개 = 22개 식별 완료

### A.2 신규 패키지 골조 생성

작업:
1. `packages/document/package.json` 신규:
   ```json
   {
     "name": "@rhymix-ts/document",
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
       "isomorphic-dompurify": "..."
     },
     "devDependencies": { "vitest": "...", "@types/node": "..." }
   }
   ```
   (정확한 버전은 root `pnpm-lock.yaml` 또는 `packages/board/package.json` 미러)
2. `packages/document/tsconfig.json` 신규 (monorepo `tsconfig.base.json` extend)
3. `packages/document/vitest.config.ts` 신규 (root `vitest.config.ts` mirror)
4. `packages/document/README.md` 1-page stub: "Document domain package — extracted from board (SPEC-DOCUMENT-001)"

검증:
- `pnpm -F @rhymix-ts/document install` 성공
- `pnpm -F @rhymix-ts/document test -- --run --reporter=verbose` 통과 (현재 0 test → 0 fail)

### A.3 소스 파일 이동 (mechanical)

작업 (각각 git mv로 수행, 한 파일/한 커밋 권장):
| From | To | LoC |
|---|---|---|
| `packages/board/src/document.ts` | `packages/document/src/document.ts` | 555 |
| `packages/board/src/document.test.ts` | `packages/document/src/document.test.ts` | ~1500 |
| `packages/board/src/extra-keys.ts` | `packages/document/src/extra-keys.ts` | 255 |
| `packages/board/src/extra-keys.test.ts` | `packages/document/src/extra-keys.test.ts` | ~500 |
| `packages/board/src/extra-vars-schema.ts` | `packages/document/src/extra-vars-schema.ts` | ~200 |
| `packages/board/src/extra-vars-schema.test.ts` | `packages/document/src/extra-vars-schema.test.ts` | ~350 |
| `packages/board/src/history.ts` | `packages/document/src/history.ts` | 88 |
| `packages/board/src/history.test.ts` | `packages/document/src/history.test.ts` | ~200 |
| `packages/board/src/search.ts` | `packages/document/src/search.ts` | 184 |
| `packages/board/src/search.test.ts` | `packages/document/src/search.test.ts` | ~250 |
| `packages/board/src/report.ts` | `packages/document/src/report.ts` | ~150 |
| `packages/board/src/report.test.ts` | `packages/document/src/report.test.ts` | ~200 |
| `packages/board/src/rate-limit.ts` | `packages/document/src/rate-limit.ts` | 174 |
| `packages/board/src/rate-limit.test.ts` | `packages/document/src/rate-limit.test.ts` | ~280 |
| `packages/board/src/permissions.ts` | `packages/document/src/permissions.ts` | 60 |
| `packages/board/src/permissions.test.ts` | `packages/document/src/permissions.test.ts` | ~130 |
| `packages/board/src/trash.ts` | `packages/document/src/trash.ts` | 263 |
| `packages/board/src/trash.test.ts` | `packages/document/src/trash.test.ts` | ~430 |
| `packages/board/src/vote.ts` | `packages/document/src/vote.ts` | ~180 |
| `packages/board/src/vote.test.ts` | `packages/document/src/vote.test.ts` | ~330 |
| `packages/board/src/on-install.ts` | `packages/document/src/on-install.ts` | ~50 |

NOT moved (REQ-DOC-014, REQ-DOC-015, REQ-DOC-016):
- `packages/board/src/attachment.ts` → 유지 (SPEC-FILE-001)
- `packages/board/src/comment.ts` → 유지 (SPEC-COMMENT-001)
- `packages/board/src/category.ts` → 유지 (Slice C에서 이동)
- `packages/board/src/index.ts` → 유지 + re-export shim 추가 (A.4)
- `packages/board/src/config.ts` → 유지
- `packages/board/src/index.test.ts` → 유지
- `packages/board/src/components/` → 유지
- `packages/board/src/routes/` → 유지
- `packages/board/src/actions/` → 유지 (Slice B에서 분리)
- `packages/board/src/storage/` → 유지 (SPEC-FILE-001)

검증:
- 이동 후 `packages/board/src/document.ts` 등이 더 이상 존재하지 않음 (`ls packages/board/src/` 확인)
- `packages/document/src/`에 22개 파일 존재
- 임포트 경로는 아직 미수정 — 빌드 깨지는 상태 OK (다음 단계에서 해결)

### A.4 임포트 경로 수정 (`packages/document` 내부)

작업:
1. `packages/document/src/document.ts`:
   - `import { incrementDocumentCount } from './category'` → `import { incrementDocumentCount } from '@rhymix-ts/board/category'` (Slice A 한시적, Slice C에서 same-package로 복귀)
   - 나머지 동일 패키지 내 import (`./permissions`, `./trash`, `./history`, `./extra-vars-schema`)는 그대로 — 같은 패키지로 이동했으므로 path 변경 불필요
2. `packages/board/src/category.ts`에서 document 관련 심볼 import가 있다면(아마 없음) `@rhymix-ts/document`로 변경
3. `packages/document/src/index.ts` 신규 — REQ-DOC-012에 따라 전체 barrel export:
   ```typescript
   export * from './document';
   export * from './extra-keys';
   export * from './extra-vars-schema';
   export * from './history';
   export * from './search';
   export * from './report';
   export * from './rate-limit';
   export * from './permissions';
   export * from './trash';
   export * from './vote';
   export { onInstall } from './on-install'; // 명시적 (이름 충돌 방지)
   ```
4. 동일 패키지 내 cross-file 의존성 정리 — search.ts가 document.ts의 `decodeCursor`/`encodeCursor`를 import하는 경우 path 유지 (같은 패키지)

검증:
- `pnpm -F @rhymix-ts/document tsc --noEmit` 0 error
- `pnpm -F @rhymix-ts/document test` 110+ tests pass — characterization 회귀 가드 통과

### A.5 board 패키지 re-export shim + apps/web 임포트 갱신

작업:
1. `packages/board/src/index.ts` 갱신:
   ```typescript
   // re-export shim for backward compatibility (SPEC-DOCUMENT-001 REQ-DOC-126)
   // To be removed by SPEC-BOARD-CRUD-001.
   export * from '@rhymix-ts/document';
   
   // board 고유 export (board service, attachment, category, comment, storage)
   export * from './category';
   export * from './comment';
   export * from './attachment';
   export * from './config';
   // ... etc
   ```
2. `packages/board/package.json`의 dependencies에 `"@rhymix-ts/document": "workspace:*"` 추가
3. `apps/web/**`의 직접 import 갱신 (grep으로 찾은 callsite):
   - `from '@rhymix-ts/board'` 중 Document 관련 심볼만 import하는 경우 → `from '@rhymix-ts/document'`로 교체
   - mixed import의 경우 → board에서 re-export로 우선 통과 (안전)
   - 예상 변경 파일: `apps/web/lib/board/actions.ts`(만일 존재), `apps/web/app/admin/boards/...`
4. `pnpm-workspace.yaml` 확인 — `packages/*` glob에 의해 `packages/document`가 자동 포함되는지 (예상: yes)

검증:
- `pnpm install` (root)  성공
- `pnpm tsc --noEmit` (root) 0 error 전체
- `pnpm test` (root) 모든 패키지 통과
- `pnpm build` (root) — apps/web 빌드 성공
- `madge --circular packages/document/src/` (또는 lint rule) — circular 없음 (REQ-DOC-011)

### A.6 Slice A 종료 게이트

체크리스트:
- [ ] `packages/document/`에 22개 파일 존재
- [ ] `packages/board/src/document.ts` 등 11개 src 파일 더 이상 존재하지 않음
- [ ] `pnpm test packages/document` 110+ tests pass
- [ ] `pnpm test packages/board` (남은 테스트) pass
- [ ] `pnpm test apps/web` pass
- [ ] `pnpm tsc --noEmit` (root) 0 error
- [ ] `pnpm build` apps/web 성공
- [ ] `packages/board/package.json`에 `@rhymix-ts/document` 의존 명시
- [ ] `packages/document/package.json`에 `@rhymix-ts/board` 의존 **없음** (REQ-DOC-011)
- [ ] circular dependency check pass
- [ ] AC-DOC-A1 (spec.md Section 4) 통과

EARS coverage: REQ-DOC-001~018, REQ-DOC-120, REQ-DOC-123, REQ-DOC-126(부분), REQ-DOC-130, REQ-DOC-131

---

## Slice B: tRPC Router + Server Actions

**목표**: document 도메인 API를 tRPC + Next.js Server Actions로 노출. `apps/web`의 데이터 액세스 경로를 통일.

**우선순위**: P0 — Slice A 완료 후 시작.

**Acceptance Gate**: AC-DOC-B1, AC-DOC-B2.

### B.1 tRPC root router 검증

작업:
1. `apps/web/src/server/trpc/root.ts` (또는 동등 위치) 확인 — 현재 어떤 라우터들이 마운트되어 있나? (예상: admin, board(있다면), auth)
2. tRPC `initTRPC<Context>()` 위치 파악 → `documentRouter`가 동일 init을 import해야 함
3. Context 타입: 현재 ctx에 `prisma`, `session`(actor)이 있는지 확인. 없으면 Slice B 첫 작업으로 `packages/auth`에서 actor 추출 헬퍼 추가

검증:
- existing tRPC 구조 docs (research.md에 부속)
- `Context.prisma`, `Context.session` 또는 `Context.actor` 정의 존재 확인

### B.2 documentRouter 신규

신규 파일: `packages/document/src/server/router.ts`

작업:
1. 필요 import:
   - `initTRPC` 또는 monorepo의 shared `publicProcedure`/`protectedProcedure` (apps/web/src/server/trpc에서 export 시 → 별도 shared package 또는 type-only import. 의존 방향 검토 필요)
   - 도메인 함수: `createDocument`, `updateDocument`, `deleteDocument`, `listDocuments`, `getDocument`, `searchDocuments`, `searchTags`, `listTrash`, `restoreDocument`, `purgeDocument`, `getUpdateHistory` 등 (`../index`)
2. Procedure 정의:
   ```typescript
   export const documentRouter = router({
     // public
     list: publicProcedure.input(ListDocumentsSchema).query(...)
     get: publicProcedure.input(z.object({ id, passwordToken })).query(...)
     search: publicProcedure.input(SearchDocumentsSchema).query(...)
     searchTags: publicProcedure.input(...).query(...)
     // protected
     create: protectedProcedure.input(CreateDocumentSchema).mutation(...)
     update: protectedProcedure.input(UpdateDocumentSchema).mutation(...)
     delete: protectedProcedure.input(DeleteDocumentSchema).mutation(...)
     unlockSecret: publicProcedure.input(...).mutation(...) // not protected — anon may submit password
     publishDraft: protectedProcedure...
     listDrafts: protectedProcedure...
     history: router({
       list: protectedProcedure...,
       diff: protectedProcedure...,
     }),
     trash: router({
       list: adminProcedure...,
       restore: adminProcedure...,
       purge: adminProcedure...,
     }),
   });
   ```
3. **password 필드 strip** (REQ-DOC-054): get/list 응답에서 `password` 제거 — domain 레이어에서 `Omit<Document, 'password'>` 반환 타입 정제 (`getDocument` 시그니처 변경 — 호출자 모두 영향 → minor breaking)
4. Error mapping (REQ-DOC-103):
   ```typescript
   .mutation(async ({ input, ctx }) => {
     try {
       return await createDocument(...);
     } catch (e) {
       if (e instanceof BoardPermissionDeniedError) throw new TRPCError({ code: 'FORBIDDEN', cause: e });
       if (e instanceof DocumentOwnershipError) throw new TRPCError({ code: 'FORBIDDEN', cause: e });
       if (e instanceof ExtraVarsRequiredError) throw new TRPCError({ code: 'BAD_REQUEST', cause: e });
       throw e;
     }
   })
   ```
5. adminProcedure middleware 정의 (또는 기존 사용) — `ctx.session.user.isAdmin === true` 확인, 아니면 `UNAUTHORIZED`

검증:
- `pnpm tsc` 0 error
- 신규 테스트 4+ (`router.test.ts`): list happy path, create with permission, create without permission(FORBIDDEN), unlock secret happy path

### B.3 Server Actions 신규

신규 파일: `packages/document/src/server/actions.ts`

작업:
1. `'use server'` 디렉티브
2. ActionResult discriminated union 타입:
   ```typescript
   type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
   ```
3. wrapper 함수:
   - `createDocumentAction(formData)` → input 추출 + actor 추출(session) + createDocument 호출 + try/catch → ActionResult
   - `updateDocumentAction`, `deleteDocumentAction`, `publishDraftAction`, `unlockSecretAction`
4. CSRF: Next.js Server Actions native (form action) — 추가 코드 없음
5. Revalidation: `revalidatePath('/board/[mid]')` 또는 `revalidateTag('document-list')` — Slice B에는 일단 path level revalidate 최소화 (caller가 결정)

검증:
- `pnpm test packages/document/src/server` 통과 (~4 tests)

### B.4 root router에 mount

작업:
1. `apps/web/src/server/trpc/root.ts`에 `import { documentRouter } from '@rhymix-ts/document/server'` 추가
2. appRouter에 `document: documentRouter` 마운트
3. Server Component에서 사용 검증: `trpc.document.list.query(...)` 또는 `caller.document.list(...)`
4. 클라이언트 hook 사용 검증: `trpc.document.list.useQuery(...)` (apps/web에서 실제 callsite가 있다면)

검증:
- `pnpm dev`로 apps/web 기동 → 콘솔 에러 없음
- 기존 board admin UI(`/admin/boards/...`)에서 document list/create 호출이 새 router 경유로 동작 (regression check)

### B.5 기존 apps/web 액션 마이그레이션

작업:
1. `apps/web/lib/board/actions.ts`(존재 시)의 document 관련 액션을 `packages/document/src/server/actions.ts`로 이전
2. board admin UI 페이지의 액션 import 경로 갱신:
   - `from '@/lib/board/actions'` → `from '@rhymix-ts/document/server/actions'`
3. 기존 액션이 board-specific 로직(예: Board 검증)을 포함하는 경우 → document 액션 호출 + board-specific 로직은 board 패키지에 남김

검증:
- `pnpm test apps/web` 통과
- 기존 admin UI에서 글쓰기/수정/삭제 e2e flow 동작 확인

### B.6 Slice B 종료 게이트

체크리스트:
- [ ] `packages/document/src/server/router.ts` 존재 + 6 public + 8 protected procedure
- [ ] `packages/document/src/server/actions.ts` 존재 + 5 wrapper 액션
- [ ] `apps/web/src/server/trpc/root.ts`에 documentRouter 마운트
- [ ] tRPC router tests 8+ pass
- [ ] Server Actions tests 3+ pass
- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm build` apps/web 성공
- [ ] AC-DOC-B1, AC-DOC-B2 통과

EARS coverage: REQ-DOC-100~105, REQ-DOC-103, REQ-DOC-104, REQ-DOC-054(부분)

---

## Slice C: 도메인 기능 완성 + UI 스캐폴드

**목표**: 비밀글 비밀번호 해시화, 비밀번호 액세스 게이트, 임시저장(draft) UI 데이터, 휴지통/이력 UI 스캐폴드, category.ts 이동, 이벤트 버스 stub.

**우선순위**: P0 — Slice B 완료 후 시작. SPEC-COMMENT-001/SPEC-BOARD-CRUD-001과 병행 가능.

**Acceptance Gate**: AC-DOC-C1, AC-DOC-C2.

### C.1 비밀글 비밀번호 해시화 + 토큰 게이트

신규 파일: `packages/document/src/secret.ts`

작업:
1. `hashSecretPassword(plain: string): Promise<string>` — argon2id (id 변형) — 의존: `argon2` (이미 `packages/auth` 사용 중)
2. `verifySecretPassword(plain: string, hash: string): Promise<boolean>`
3. `issueSecretToken(documentId: number, secret: string): string` — HMAC-SHA256 또는 jose JWT (24h 만료). secret은 env `RX_SECRET_DOC_KEY`
4. `verifySecretToken(token: string, secret: string): { documentId: number; expiresAt: Date } | null`
5. `document.ts:createDocument`/`updateDocument` 수정:
   - password 입력 시 `hashSecretPassword` 호출 후 저장 (plaintext 저장 금지)
6. `document.ts:getDocument` 수정 (또는 router 레벨):
   - status === 'SECRET'이고 actor가 author/admin 아니고 passwordToken 없으면 → throw `DocumentAccessDeniedError`(신규)
   - passwordToken 있으면 verifySecretToken으로 검증
7. `document.ts:listDocuments` 수정:
   - actor 매개변수 추가 (옵셔널)
   - SECRET 행은 actor가 author 또는 admin 아니면 제외 (Prisma where에 OR 조건 추가)
8. `unlockSecretDocument({ documentId, password }, ctx)` 함수:
   - Document 조회 → status SECRET 확인 → verifySecretPassword → issueSecretToken → { token, expiresAt } 반환

신규 에러:
- `DocumentAccessDeniedError` (`@rhymix-ts/document/errors.ts` 또는 `document.ts`에 추가)

검증:
- `packages/document/src/secret.test.ts` 5+ tests: hash/verify, token issue/verify, getDocument with/without token, unlock happy/fail path
- AC-DOC-C1의 5 case 모두 통과 (test로)

### C.2 임시저장(Draft) API

신규 파일: `packages/document/src/draft.ts` (또는 document.ts에 추가)

작업:
1. `listDrafts({ authorId, cursor, limit }, ctx)`:
   - `prisma.document.findMany({ where: { authorId, status: 'TEMP', deletedAt: null }, orderBy: { lastUpdate: 'desc' }, cursor, take: limit+1 })`
   - actor 검증: actor.userId === authorId || actor.isAdmin
2. `publishDraft({ documentId, actor }, ctx)`:
   - Document 조회 + 소유권 검증
   - 트랜잭션:
     - Document.status = 'PUBLIC'
     - Board.documentCount += 1
     - DocumentCategory.documentCount += 1 (있으면)
   - 이벤트 emit (REQ-DOC-132): `document.created` (TEMP→PUBLIC도 created로 처리, 또는 별도 `document.published` 이벤트)
3. listDocuments default filter 검증 — `status: 'PUBLIC'`이 default이므로 TEMP는 자연 제외 (REQ-DOC-061)

검증:
- `packages/document/src/draft.test.ts` 3+ tests: listDrafts(author), listDrafts(admin), publishDraft transaction (Board.documentCount 증가 확인)
- AC-DOC-C2 통과

### C.3 수정 이력 diff

작업:
1. `packages/document/src/history.ts`에 추가:
   ```typescript
   export async function getHistoryDiff(
     input: { documentId: number; fromRegdate: Date; toRegdate: Date; actor: Actor },
     ctx: { prisma: PrismaClient }
   ): Promise<{ prev: DocumentUpdateLog; current: DocumentUpdateLog | Document }> {
     // 권한 검사 (author or admin)
     // fromRegdate ~ toRegdate 범위 내 두 스냅샷 페어 반환
   }
   ```
2. tRPC router에 `document.history.diff` 추가
3. 단순 텍스트 diff는 UI 측 (`apps/web`에서 `diff` 라이브러리 등)

검증:
- `history.test.ts`에 `getHistoryDiff` 2+ tests 추가

### C.4 휴지통/이력/임시저장 UI 스캐폴드

신규 파일들:
- `apps/web/app/(member)/drafts/page.tsx` — 임시저장 목록 (인증 필요)
- `apps/web/app/(member)/documents/[id]/history/page.tsx` — 수정 이력
- `apps/web/app/admin/trash/page.tsx` — 휴지통 (admin only)

작업:
1. RSC로 작성 (`async function Page()` + Server Action으로 mutation)
2. 데이터 fetch: `trpc.document.listDrafts`, `trpc.document.history.list`, `trpc.document.trash.list`
3. UI: shadcn/ui Table + Pagination — 최소 기능 (filter, search는 백로그)
4. Auth gate: `getServerSession()` 또는 동등 — 비인증 시 `/login`으로 redirect

검증:
- e2e 1개: 인증된 user가 `/drafts` 방문 → 본인 임시저장만 보이고 다른 user의 TEMP는 안 보임
- admin이 `/admin/trash` 방문 → 휴지통 row 1+ 표시 + restore 버튼 클릭 시 row 사라짐

### C.5 category.ts 이동 (REQ-DOC-016 후반)

작업:
1. `packages/board/src/category.ts` → `packages/document/src/category.ts`로 이동 (`git mv`)
2. `packages/board/src/category.test.ts` 함께 이동
3. `packages/document/src/document.ts`의 import 정상화:
   - `import { incrementDocumentCount } from '@rhymix-ts/board/category'` → `import { incrementDocumentCount } from './category'`
4. `packages/board/src/index.ts`의 re-export shim 확인 — `export * from '@rhymix-ts/document'`로 category도 자연스럽게 export됨
5. apps/web에서 `from '@rhymix-ts/board/category'` 또는 `from '@rhymix-ts/board'` import 검토

검증:
- `pnpm test` 통과
- circular dependency 재검증 (`madge --circular`)

### C.6 이벤트 버스 stub

신규 파일: `packages/document/src/events.ts`

작업:
1. Node `EventEmitter` 기반 typed emitter (옵션 (a)):
   ```typescript
   import { EventEmitter } from 'node:events';
   
   export interface DocumentEventMap {
     'document.created': { documentId: number; boardId: number; authorId: number | null };
     'document.updated': { documentId: number; boardId: number; editorId: number | null };
     'document.deleted': { documentId: number; boardId: number; deletedById: number | null };
     'document.restored': { documentId: number; boardId: number };
     'document.purged': { documentId: number; boardId: number };
   }
   
   class TypedEmitter extends EventEmitter {
     emit<K extends keyof DocumentEventMap>(event: K, payload: DocumentEventMap[K]): boolean {
       return super.emit(event, payload);
     }
     on<K extends keyof DocumentEventMap>(event: K, listener: (payload: DocumentEventMap[K]) => void): this {
       return super.on(event, listener);
     }
   }
   
   export const documentEvents = new TypedEmitter();
   ```
2. `createDocument` 트랜잭션 commit 후 `documentEvents.emit('document.created', {...})` 호출
3. `updateDocument`, `softDeleteDocument`, `restoreDocument`, `purgeDocument`에도 emit 추가
4. emit 위치: 트랜잭션 외부 (commit 후) — 트랜잭션 중에 emit하면 rollback 시 inconsistent

검증:
- `events.test.ts` 2+ tests: emit 호출 시 listener가 payload 받는지

### C.7 신규 마이그레이션 (선택, additive only)

검토:
- secret 토큰 lookup index 필요한가? → `Document` 필터에 status='SECRET' + (authorId OR token) 이미 기존 index로 충분
- 새 마이그레이션 거의 없음. 단, `Document.password` 컬럼이 plaintext였다면 자동 hash upgrade 위한 데이터 마이그레이션 script 필요 (dev env만 적용)

작업 (필요 시):
1. `packages/db/prisma/migrations/{timestamp}_secret_password_hash/migration.sql` — Empty (no schema change)
2. `packages/db/scripts/hash-existing-secret-passwords.ts` — idempotent script:
   ```typescript
   // 모든 SECRET docs 조회 → 이미 hash 형태($argon2id$...)면 skip → 아니면 hash 후 update
   ```

검증:
- script 실행 후 모든 `Document.password`가 `$argon2id$...` 형태

### C.8 Slice C 종료 게이트

체크리스트:
- [ ] `packages/document/src/secret.ts` 존재 + 5+ tests pass
- [ ] `packages/document/src/draft.ts` (또는 document.ts에 통합) 존재 + 3+ tests pass
- [ ] `packages/document/src/events.ts` 존재 + emit hook이 5개 lifecycle에 모두 추가
- [ ] `packages/document/src/category.ts`로 이동 완료, `packages/board/src/category.ts` 제거
- [ ] `apps/web/app/(member)/drafts/page.tsx` 스캐폴드 존재
- [ ] `apps/web/app/admin/trash/page.tsx` 스캐폴드 존재
- [ ] `apps/web/app/(member)/documents/[id]/history/page.tsx` 스캐폴드 존재
- [ ] e2e 1+ (drafts), 1+ (trash restore) pass
- [ ] secret password가 plain text로 DB에 저장된 row가 0개 ($argon2id$ prefix만 존재)
- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm build` apps/web 성공
- [ ] 신규 ~25 tests + 기존 ~110 = ~135 total
- [ ] AC-DOC-C1, AC-DOC-C2 통과

EARS coverage: REQ-DOC-019, REQ-DOC-050~055, REQ-DOC-060~064, REQ-DOC-070~072, REQ-DOC-121, REQ-DOC-126(완전 제거 시점은 SPEC-BOARD-CRUD-001), REQ-DOC-132~134

---

## Acceptance Gates per Slice

| Gate | Slice | EARS | Test Count Delta |
|---|---|---|---|
| AC-DOC-A1 (package separation, regression-free) | A | REQ-DOC-001~018, 120, 123 | 0 (relocate-only) |
| AC-DOC-B1 (create + counter atomicity) | B | REQ-DOC-020, 100, 102, 103 | +8 |
| AC-DOC-B2 (FTS search) | B | REQ-DOC-040, 101 | +3 |
| AC-DOC-C1 (SECRET access) | C | REQ-DOC-050~055 | +9 |
| AC-DOC-C2 (draft publish) | C | REQ-DOC-063 | +3 |
| AC-DOC-C3 (history diff API) | C | REQ-DOC-072 | +2 |
| AC-DOC-C4 (event bus emits) | C | REQ-DOC-132 | +2 |
| AC-DOC-C5 (category.ts moved) | C | REQ-DOC-016 | 0 (relocate-only) |
| **Total new tests** | | | **+27** |

(MP-002 target: ~30 — within ±10%.)

---

## Risk Mitigations per Slice

| Risk (from spec.md Section 6) | Slice | Mitigation Action |
|---|---|---|
| board → document import 누락 | A | Slice A.6 게이트의 `pnpm build` apps/web 통과 강제 |
| category.ts 위치 결정 지연 | A/C | A는 board에 남기고 외부 import (A.4), C에서 이동 (C.5) |
| password plaintext → hash 마이그레이션 손실 | C | C.7 idempotent script + auto-upgrade on read fallback |
| FTS GENERATED column 인식 | A | `Unsupported("tsvector")` 그대로, `$queryRaw` 동일 — Slice A 테스트로 회귀 가드 |
| tRPC router path 충돌 | B | `document.*` namespace, board는 `board.*` 그대로 |
| 기존 test 회귀 (시간) | C | 새 테스트는 별도 파일(`secret.test.ts`, `draft.test.ts`, `events.test.ts`)로 격리 |
| 이벤트 버스 stub 미정의 | C | C.6에서 type 정의 + EventEmitter 구현 둘 다 ship — Phase 3 unblock |
| circular dep | A | A.6 게이트에 `madge --circular` 명시 |

---

## Token Budget Estimation (per /moai run)

Slice A: ~50K tokens (file 이동 + 임포트 갱신 — mechanical)
Slice B: ~70K tokens (tRPC router 신규 + actions wrapper + 8+ new tests)
Slice C: ~90K tokens (secret/draft/events 구현 + UI 스캐폴드 3개 + 25+ new tests)

**Total `/moai run SPEC-DOCUMENT-001` 추정**: ~210K tokens. 180K 예산 초과 — 권고: Slice 단위 분할 실행 (`/moai run SPEC-DOCUMENT-001 --slice A`).

분할 실행:
- `/moai run SPEC-DOCUMENT-001 --slice A` (~50K)
- `/clear`
- `/moai run SPEC-DOCUMENT-001 --slice B` (~70K)
- `/clear`
- `/moai run SPEC-DOCUMENT-001 --slice C` (~90K)

---

## Dependencies & Sequencing

```
SPEC-AUTH-001  ──┐
                 │ (Actor, RBAC)
SPEC-ADMIN-001 ──┼──► SPEC-DOCUMENT-001 Slice A (packages 분리)
                 │                          │
SPEC-LAYOUT-001 ─┘                          ▼
(Phase 1)                          Slice B (tRPC + actions)
                                            │
                                            ▼
                                   Slice C (secret/draft/events + UI)
                                            │
                                            ▼
            ┌──────────────────┬────────────┴────────┬───────────────┐
            ▼                  ▼                     ▼               ▼
    SPEC-COMMENT-001    SPEC-BOARD-CRUD-001    SPEC-FILE-001  SPEC-POINT-001
    (Phase 2 parallel)   (Phase 2)              (Phase 3)      (Phase 3)
```

Slice A는 SPEC-COMMENT-001 Slice A와 병행 가능 (다른 src files).
Slice B/C는 SPEC-COMMENT-001 완료를 권장하나 강제는 아님 (Comment 관계는 schema에 이미 존재).

---

Version: 1.0.0
Status: draft
