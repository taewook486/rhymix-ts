---
id: SPEC-BOARD-CRUD-001-plan
title: SPEC-BOARD-CRUD-001 구현 계획
version: 1.0.0
status: completed
created: 2026-05-27
updated: 2026-06-12
parent: SPEC-BOARD-CRUD-001
language: ko
---

# SPEC-BOARD-CRUD-001 — Implementation Plan

본 plan은 spec.md의 3 Slice를 실제 파일 단위로 분해하고, 각 Slice의 작업 순서, 산출물 파일 목록, server action 시그니처, 테스트 scaffold를 명세한다.

---

## 0. 사전 점검 (Slice A 시작 전)

다음이 충족되어야 Slice A를 안전히 시작할 수 있다:

- [ ] SPEC-DOCUMENT-001 Slice A 머지 완료 — `packages/document/src/{service,types,index}.ts` 존재
- [ ] SPEC-COMMENT-001 Slice A 머지 완료 — `packages/comment/src/{service,types,index}.ts` 존재
- [ ] `packages/db/prisma/schema.prisma`에 `Document`, `Comment`, `Board` 모델 모두 존재 (이미 존재 — research.md 참조)
- [ ] `pnpm install` 후 `pnpm tsc --noEmit` 0 error 베이스라인 확보

---

## 1. Slice A — 의존성 재배치 (Refactor)

### 1.1 목적

`packages/board`가 document/comment를 직접 보유하던 monolithic 구조를 깨고, `@rhymix-ts/document`, `@rhymix-ts/comment`에 의존하는 thin wrapper로 변환한다. 회귀 없이 안전하게 진행하기 위해 DDD ANALYZE-PRESERVE-IMPROVE 사이클을 적용한다.

### 1.2 파일 목록

**신규**:

- `packages/board/src/__characterization__/api-snapshot.test.ts` — 기존 export 시그니처 스냅샷
- `packages/board/src/__characterization__/behavior-document.test.ts` — createDocument/deleteDocument happy-path
- `packages/board/src/__characterization__/behavior-comment.test.ts` — createComment/deleteComment happy-path
- `packages/board/src/__characterization__/behavior-vote.test.ts` — voteUp/voteDown happy-path

**이주 (board → document)**:

- `packages/board/src/document.ts` → `packages/document/src/service.ts` (SPEC-DOCUMENT-001 Slice A에서 수행 완료 가정; 본 SPEC은 board 측 참조 제거)
- `packages/board/src/document.test.ts` → `packages/document/src/service.test.ts`

**이주 (board → comment)**:

- `packages/board/src/comment.ts` → `packages/comment/src/service.ts`
- `packages/board/src/comment.test.ts` → `packages/comment/src/service.test.ts`

**수정**:

- `packages/board/package.json` — `dependencies`에 추가:
  ```json
  "@rhymix-ts/document": "workspace:*",
  "@rhymix-ts/comment": "workspace:*"
  ```
- `packages/board/src/index.ts` — board 고유 모듈만 export, document/comment 함수는 `@deprecated` re-export
- `packages/board/src/attachment.ts` — document import를 `@rhymix-ts/document`로 변경
- `packages/board/src/vote.ts` — document/comment import를 외부 패키지로 변경
- `packages/board/src/report.ts`, `history.ts`, `search.ts`, `trash.ts` — document/comment 참조 갱신

### 1.3 deprecation re-export 예시

```ts
// packages/board/src/index.ts
/**
 * @deprecated Import from `@rhymix-ts/document` instead.
 * Will be removed in Phase 3 cleanup SPEC.
 */
export {
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentById,
} from '@rhymix-ts/document';

/**
 * @deprecated Import from `@rhymix-ts/comment` instead.
 * Will be removed in Phase 3 cleanup SPEC.
 */
export {
  createComment,
  updateComment,
  deleteComment,
} from '@rhymix-ts/comment';

// board 고유 모듈은 변경 없음
export { canPerformAction } from './permissions';
export { getCategory, createCategory } from './category';
export * from './config';
// ... 등
```

### 1.4 작업 순서

1. characterization 테스트 작성 (현재 board 상태 기준) → 기준 통과 확인
2. SPEC-DOCUMENT-001 Slice A 산출물(document 패키지) 확인
3. SPEC-COMMENT-001 Slice A 산출물(comment 패키지) 확인
4. `packages/board/src/document.ts`, `comment.ts` 삭제
5. `packages/board/package.json` workspace deps 추가
6. `packages/board/src/index.ts` re-export 갱신
7. board 내부의 다른 모듈(attachment, vote, report, history, search, trash)의 import 경로 갱신
8. characterization 테스트 재실행 → 100% 통과 확인
9. 기존 board 테스트 전체 재실행 → 100% 통과 확인

### 1.5 검증 명령

```bash
pnpm install
pnpm --filter @rhymix-ts/board test
pnpm --filter @rhymix-ts/document test
pnpm --filter @rhymix-ts/comment test
pnpm tsc --noEmit
pnpm --filter @rhymix-ts/board build
```

### 1.6 추정 테스트 수

- characterization snapshot: 1
- characterization behavior (document): 2
- characterization behavior (comment): 2
- characterization behavior (vote): 2
- 합계: 7

기존 board 테스트는 모두 보존(이주된 것 포함) — 회귀 가드.

---

## 2. Slice B — 사용자 라우트 UI

### 2.1 목적

사용자가 `/{mid}`를 방문하면 게시판이 동작하는 첫 가시적 결과를 달성한다. 목록 → 상세 → 쓰기 → 댓글 → 수정/삭제 라이프사이클이 완주된다.

### 2.2 파일 목록

**신규 — packages/board**:

- `packages/board/src/module.ts` — `boardModuleDefinition` 등록
- `packages/board/src/routes/index-route.tsx` — 목록 RSC
- `packages/board/src/routes/detail-route.tsx` — 상세 RSC
- `packages/board/src/routes/write-route.tsx` — 쓰기 RSC + 폼 마운트
- `packages/board/src/routes/edit-route.tsx` — 수정 RSC
- `packages/board/src/routes/write-form.tsx` — 쓰기 폼 client component
- `packages/board/src/routes/comment-list.tsx` — 트리 RSC
- `packages/board/src/routes/comment-form.tsx` — 댓글 폼 client
- `packages/board/src/routes/forbidden-fragment.tsx` — 403 표시 fragment
- `packages/board/src/routes/index-route.test.tsx`, `detail-route.test.tsx`, `write-route.test.tsx`, `comment-list.test.tsx`
- `packages/board/src/actions/create-document.ts` (기존 — 보강)
- `packages/board/src/actions/update-document.ts` — 신규
- `packages/board/src/actions/delete-document.ts` — 신규
- `packages/board/src/actions/comment-create.ts` — 신규
- `packages/board/src/actions/comment-update.ts` — 신규
- `packages/board/src/actions/comment-delete.ts` — 신규
- `packages/board/src/actions/*.test.ts` — 각 action 단위 테스트

**신규 — apps/web**:

- `apps/web/app/[mid]/[documentId]/page.tsx` — 상세 라우트
- `apps/web/app/[mid]/[documentId]/edit/page.tsx` — 수정 라우트
- `apps/web/app/[mid]/write/page.tsx` — 쓰기 라우트
- `apps/web/e2e/board-list-detail.e2e.ts` — Playwright e2e
- `apps/web/e2e/board-write-redirect.e2e.ts` — 비로그인 redirect e2e

**수정**:

- `apps/web/lib/modules/register.ts` — `registerModule(boardModuleDefinition)` 추가
- `packages/board/src/permissions.ts` — `BoardAction` 타입 확장: 4개 → 7개 grant
- `packages/board/src/permissions.test.ts` — 새 grant 테스트 5개 이상 추가

### 2.3 Server Action 시그니처

```ts
// packages/board/src/actions/create-document.ts
'use server';
export interface CreateDocumentInput {
  instanceId: number;
  title: string;
  content: string;
  categoryId?: number;
  extraVars?: Record<string, unknown>;
  guestNickname?: string;
  guestPassword?: string;
}
export interface CreateDocumentResult {
  ok: true;
  documentId: number;
  redirectTo: string;
} | {
  ok: false;
  error: 'FORBIDDEN' | 'VALIDATION' | 'INTERNAL';
  message: string;
}
export async function createDocumentAction(
  input: CreateDocumentInput,
): Promise<CreateDocumentResult>;
```

```ts
// packages/board/src/actions/update-document.ts
'use server';
export interface UpdateDocumentInput {
  documentId: number;
  title: string;
  content: string;
  categoryId?: number;
  extraVars?: Record<string, unknown>;
}
export type UpdateDocumentResult =
  | { ok: true; documentId: number; redirectTo: string }
  | { ok: false; error: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION'; message: string };
export async function updateDocumentAction(
  input: UpdateDocumentInput,
): Promise<UpdateDocumentResult>;
```

```ts
// packages/board/src/actions/comment-create.ts
'use server';
export interface CommentCreateInput {
  documentId: number;
  parentCommentId?: number;
  content: string;
  isSecret?: boolean;
  guestNickname?: string;
  guestPassword?: string;
}
export type CommentCreateResult =
  | { ok: true; commentId: number }
  | { ok: false; error: string };
export async function commentCreateAction(
  input: CommentCreateInput,
): Promise<CommentCreateResult>;
```

(comment-update, comment-delete, delete-document는 유사 패턴)

### 2.4 ModuleDefinition 시그니처

```ts
// packages/board/src/module.ts
import type { ModuleDefinition } from '@rhymix-ts/core/modules';
import { boardConfigSchema } from './config';
import { indexRoute } from './routes/index-route';
import { detailRoute } from './routes/detail-route';
import { writeRoute } from './routes/write-route';
import { editRoute } from './routes/edit-route';

export const boardModuleDefinition: ModuleDefinition = {
  moduleCode: 'board',
  configSchema: boardConfigSchema,
  routes: {
    index: indexRoute,
    detail: detailRoute,
    write: writeRoute,
    edit: editRoute,
  },
  onInstall: undefined, // 기존 on-install.ts 보존 또는 통합
};
```

### 2.5 권한 가드 패턴

모든 Server Action의 첫 줄:

```ts
const ctx = await getEffectivePermissionContext({ prisma, session });
if (!canPerformAction(board, 'write_document', ctx)) {
  return { ok: false, error: 'FORBIDDEN', message: '권한이 없습니다.' };
}
```

route handler 진입 시:

```tsx
const ctx = await getEffectivePermissionContext({ prisma, session });
if (!canPerformAction(board, 'list', ctx)) {
  return <ForbiddenFragment />;
}
```

### 2.6 e2e 시나리오

**board-list-detail.e2e.ts**:

```ts
test('게시판 목록 → 상세 → 댓글', async ({ page }) => {
  // setup: install + default theme + board instance with 3 docs + 1 comment
  await page.goto('/free');
  await expect(page.getByText('샘플 문서 1')).toBeVisible();
  await page.getByText('샘플 문서 1').click();
  await expect(page.url()).toMatch(/\/free\/\d+$/);
  await expect(page.getByText('댓글')).toBeVisible();
});
```

**board-write-redirect.e2e.ts**:

```ts
test('비로그인 쓰기 접근 → /login redirect → callbackUrl 복귀', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/free/write');
  await expect(page.url()).toMatch(/\/login\?callbackUrl=%2Ffree%2Fwrite/);
  // login form submit
  await page.fill('input[name="user_id"]', 'tester');
  await page.fill('input[name="password"]', 'tester-pw');
  await page.click('button[type="submit"]');
  await expect(page.url()).toMatch(/\/free\/write$/);
});
```

### 2.7 작업 순서

1. permissions.ts 확장 (BoardAction 타입 + default 매핑 + 테스트 추가)
2. boardModuleDefinition 등록 + module.ts 작성
3. index-route.tsx (목록) — 카테고리/검색/페이지네이션/공지 핀 포함
4. detail-route.tsx (상세) — 권한 가드 + secret 가드 + comment list
5. write-route.tsx, write-form.tsx, create-document action — 비로그인 redirect 분기 포함
6. edit-route.tsx, update-document action
7. comment-list.tsx (트리), comment-form.tsx, comment-create/update/delete actions
8. apps/web 라우트 파일 작성 + register.ts 갱신
9. e2e 2개 작성 + 통과 확인
10. 단위 테스트 15개 이상 통과 확인

### 2.8 추정 테스트 수

- permissions.test.ts 신규 grant 테스트: 5
- index-route.test: 3 (정상 / 빈 결과 / 권한 없음)
- detail-route.test: 3 (정상 / secret / 권한 없음)
- write-route.test: 2 (정상 / 비로그인 redirect)
- create-document action: 2 (정상 / 권한 거부)
- update-document action: 2 (정상 / non-author 거부)
- comment-list.test: 2 (트리 렌더 / depth-5 가드)
- comment-create action: 2
- comment-update/delete action: 2
- e2e: 2
- 합계: 25 (Slice B 단독은 약 13, 누계로 25+)

---

## 3. Slice C — 관리자 UI (권한 매트릭스, 카테고리, extra_vars)

### 3.1 목적

관리자가 게시판을 운영 가능 상태로 만든다. 권한 매트릭스, 카테고리, extra_vars 모두 admin UI에서 편집 가능.

### 3.2 파일 목록

**신규**:

- `apps/web/app/(admin)/admin/boards/[mid]/permissions/page.tsx`
- `apps/web/app/(admin)/admin/boards/[mid]/categories/page.tsx`
- `apps/web/app/(admin)/admin/boards/[mid]/extra-keys/page.tsx`
- `apps/web/app/(admin)/admin/boards/[mid]/layout.tsx` — 보드 admin 공통 셸
- `packages/board/src/admin/permissions-matrix.tsx` — 매트릭스 client component
- `packages/board/src/admin/categories-editor.tsx` — 카테고리 트리 편집 client
- `packages/board/src/admin/extra-keys-editor.tsx` — extra_vars 편집 client
- `packages/board/src/actions/admin-save-permissions.ts`
- `packages/board/src/actions/admin-save-categories.ts`
- `packages/board/src/actions/admin-save-extra-keys.ts`
- `packages/board/src/actions/admin-toggle-notice.ts` — 공지 토글
- 각 action `*.test.ts`
- `packages/board/src/admin/*.test.tsx`

**수정**:

- `packages/board/src/permissions.ts` — 7-grant 매핑 보강 (Slice B에서 일부 완료된 경우 검증)
- `packages/board/src/config.ts` — boardConfigSchema에 categories/extraKeys 명시
- `packages/board/src/routes/detail-route.tsx` — admin이면 "공지로 지정/해제" 버튼 노출

### 3.3 admin Server Action 시그니처

```ts
// packages/board/src/actions/admin-save-permissions.ts
'use server';
export interface SavePermissionsInput {
  boardId: number;
  permissions: Record<BoardAction, number[]>; // grant → allowed group srls
}
export type SavePermissionsResult =
  | { ok: true }
  | { ok: false; error: 'FORBIDDEN' | 'VALIDATION' | 'NOT_FOUND'; message: string };
export async function savePermissionsAction(
  input: SavePermissionsInput,
): Promise<SavePermissionsResult>;
```

(categories, extra-keys, toggle-notice는 유사)

### 3.4 admin 가드

모든 admin route page.tsx의 첫 줄:

```tsx
const session = await getServerSession();
if (!session?.user?.isAdmin) {
  redirect('/login?callbackUrl=' + encodeURIComponent(currentUrl));
}
```

action 내부 역시 동일 가드 + `boardId` ownership 확인.

### 3.5 카테고리 / extra_vars 저장 위치

`ModuleConfig.config.board`의 JSONB 안에 namespaced 저장:

```json
{
  "board": {
    "categories": [
      { "id": 1, "title": "공지사항", "parentId": null, "order": 0, "color": "#f00" },
      { "id": 2, "title": "자유", "parentId": null, "order": 1 }
    ],
    "extraKeys": [
      { "id": 1, "name": "field1", "label": "추가필드1", "type": "text", "required": false, "order": 0 }
    ],
    "pageSize": 20,
    "allowAnonymousWrite": false,
    "requirePasswordForGuest": true
  }
}
```

권한 매트릭스만 `Board.permissions` JSON 컬럼(기존)에 저장 — 평가 부하 최소화.

### 3.6 작업 순서

1. permissions-matrix.tsx (체크박스 매트릭스 UI) + save action
2. categories-editor.tsx (트리 + add/edit/delete + up/down) + save action
3. extra-keys-editor.tsx (key list + type select + required) + save action
4. apps/web admin 라우트 페이지 3개 작성
5. detail-route.tsx의 admin 부분 (공지 토글 버튼) 활성화 + action
6. 단위 테스트 작성

### 3.7 추정 테스트 수

- permissions 7-grant evaluator: 5 (Slice B에서 누락 시 본 슬라이스에서 보강)
- admin-save-permissions action: 2 (정상 / FORBIDDEN)
- admin-save-categories action: 2 (CRUD)
- admin-save-extra-keys action: 2 (CRUD)
- admin-toggle-notice action: 2 (정상 / 비admin)
- 합계: 13 (단, 일부는 Slice B와 중복 가능 — 누계 25+ 목표 유지)

---

## 4. 통합 검증 (Slice A/B/C 완료 후)

### 4.1 전체 테스트 통과

```bash
pnpm install
pnpm --filter @rhymix-ts/board test
pnpm --filter @rhymix-ts/document test
pnpm --filter @rhymix-ts/comment test
pnpm --filter @rhymix-ts/web test
pnpm --filter @rhymix-ts/web e2e
pnpm tsc --noEmit
```

### 4.2 수동 검증 (smoke)

1. 클린 DB로 install → admin 가입 → site → domain 생성
2. admin → modules → board 인스턴스 생성 (mid='free')
3. admin → /admin/boards/free/permissions → guest 그룹에 list/view 부여 → save
4. admin → /admin/boards/free/categories → "공지사항", "자유" 추가
5. logout → /free 방문 → 빈 목록 + 페이지네이션 표시
6. login (일반 회원) → /free/write → 카테고리 select에 2개 표시 → 제출
7. /free → 작성한 글이 목록에 표시
8. 글 클릭 → 상세 → 댓글 작성 → 표시
9. admin → 글에 "공지" 토글 → /free → 상단 핀 영역에 표시
10. admin → /admin/boards/free/extra-keys → "분류2" 추가 → 새 글쓰기 폼에 동적 입력 표시

### 4.3 Quality Gate

- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm lint` clean
- [ ] coverage >= 80% on new files
- [ ] Playwright e2e 2개 통과
- [ ] characterization 테스트 (Slice A) 통과

---

## 5. 위험 및 완화 (구현 시점)

| 위험 | 완화 |
|---|---|
| document/comment 패키지가 본 SPEC 시작 시점에 미완 | 본 plan의 사전 점검(섹션 0) 필수. SPEC-DOCUMENT-001 + SPEC-COMMENT-001 머지 전 Slice A 시작 금지 |
| `Board.permissions` JSON schema mismatch | Zod schema로 read-time validate. invalid시 default 적용 + warning log (REQ-BOARD-074) |
| Next.js App Router의 `[mid]/[documentId]` vs `[mid]/write` 충돌 | `apps/web/app/[mid]/write/page.tsx`를 별도 segment로 분리 (Section 5.2 권고). `[documentId]`는 숫자 검증 strict |
| Server Action에서 csrf 누락 | Next.js Server Action은 기본 csrf 보호 적용. 추가 token 불필요 (검증 필요 — auth 팀 확인) |
| 트리 댓글 렌더 무한 루프 | depth max 5 + cycle detect (Map<commentId, visited>) + 5단계 초과 시 flat fallback |
| admin 가드 누락 — Server Action에서 우회 가능 | 각 action 진입 시 isAdmin 재검증. lint rule (선택) + 코드 리뷰 체크리스트 |

---

## 6. 후속 SPEC 연결

- SPEC-FILE-001 (Phase 3): write-form의 file slot 활성화
- SPEC-POINT-001 (Phase 3): createDocument/createComment 트랜잭션에 point.add 호출 주입
- SPEC-WYSIWYG-001 (후속): textarea를 Tiptap 등으로 교체
- SPEC-ADMIN-EXTRAS-001 (Phase 5): vote_log_view, consultation_read grant enforcement + module_admins 위임
- SPEC-CLEANUP (후속): board의 deprecation re-export 제거

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
