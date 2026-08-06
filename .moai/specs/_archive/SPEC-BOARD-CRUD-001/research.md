---
id: SPEC-BOARD-CRUD-001-research
title: 게시판 모듈 — 레거시 매핑 및 UI 요소 분석
created: 2026-05-27
status: complete
parent: SPEC-BOARD-CRUD-001
source-legacy: D:\project\rhymix\modules\board\
source-current: D:\project\rhymix-ts\packages\board\
language: ko
---

# Research — SPEC-BOARD-CRUD-001

본 문서는 SPEC-BOARD-CRUD-001 작성을 위해 수행된 사전조사 산출물이다. MASTER-PLAN-002 research.md Section 1.1(레거시 board 모듈 기본 사실)을 baseline으로 삼고, 본 SPEC 작성에 필요한 추가 분석만 한정적으로 다룬다.

---

## 0. 참조 자료

본 문서는 다음 자료를 baseline으로 삼는다. 중복 정보는 본 문서에서 다시 기술하지 않는다:

- **MASTER-PLAN-002/research.md Section 1.1 (board 모듈)** — 카테고리 `service`, grants 7개, 액션 ~50개, 이벤트 핸들러 3개, `documents`/`comments`/`document_categories` 의존 — 본 SPEC은 이를 ground truth로 인용
- **MASTER-PLAN-002/research.md Section 1.3 (document)** — Document 도메인 12개 테이블 + SPEC-DOCUMENT-001로 분리
- **MASTER-PLAN-002/research.md Section 1.4 (comment)** — Comment 도메인 5개 테이블 + SPEC-COMMENT-001로 분리
- **MASTER-PLAN-002/spec.md Section 5.6** — SPEC-BOARD-CRUD-001의 acceptance headlines, slice count, test count estimate
- **현재 코드**: `packages/board/src/permissions.ts`, `packages/board/src/index.ts`, `apps/web/app/[mid]/page.tsx`, `packages/core/src/modules/`

본 SPEC 작성을 위한 신규 분석만 다음 섹션에서 다룬다.

---

## 1. 레거시 board 액션 → Next.js 매핑

레거시 Rhymix `modules/board/conf/module.xml` 액션 ~50개 중 본 SPEC 범위(사용자 UI + 권한 매트릭스 admin)에 해당하는 것만 분류한다. 백로그/Phase 5/Phase 3로 미루는 항목은 명시한다.

### 1.1 사용자측 disp* 액션 (사용자가 화면에서 보는 것)

| 레거시 액션 | 의미 | 본 SPEC 매핑 | Phase |
|---|---|---|---|
| `dispBoardContent` | 글 상세 보기 | `routes.detail` + `apps/web/app/[mid]/[documentId]/page.tsx` | 2 (본 SPEC) |
| `dispBoardWrite` | 글쓰기 폼 | `routes.write` + `apps/web/app/[mid]/write/page.tsx` | 2 (본 SPEC) |
| `dispBoardModify` | 글 수정 폼 | `routes.edit` + `apps/web/app/[mid]/[documentId]/edit/page.tsx` | 2 (본 SPEC) |
| `dispBoardDelete` | 삭제 확인 폼 | Server Action 직접 호출 — 별도 disp 페이지 없음 | 2 (본 SPEC) |
| `dispBoardReplyComment` | 댓글 reply 폼 | 상세 페이지 내 inline 댓글 폼 | 2 (본 SPEC) |
| `dispBoardModifyComment` | 댓글 수정 폼 | 상세 페이지 내 inline 편집 | 2 (본 SPEC) |
| `dispBoardDeleteComment` | 댓글 삭제 확인 | inline 삭제 버튼 (확인 dialog 클라이언트) | 2 (본 SPEC) |
| `dispBoardCategory` | 카테고리 페이지 | `/{mid}?category=N` (필터로 처리) | 2 (본 SPEC) |
| `dispBoardSearchOption` | 검색 옵션 폼 | `/{mid}?q=...` (FTS) | 2 (본 SPEC) — UI는 간략화 |
| `dispBoardTrash` | 휴지통 보기 | `/admin/boards/[mid]/trash` | 5 (SPEC-ADMIN-EXTRAS) |
| `dispBoardAllArticleList` | 전체 글 목록 (cross-board) | 백로그 (별도 SPEC) |
| `dispBoardRSS` / `dispBoardAtom` | RSS/Atom 피드 | 백로그 (SPEC-MODULE-BACKLOG) |

### 1.2 proc* 액션 (Server Action으로 매핑)

| 레거시 액션 | 의미 | 본 SPEC 매핑 | Phase |
|---|---|---|---|
| `procBoardInsertDocument` | 글 작성 | `actions/create-document.ts` | 2 (본 SPEC) |
| `procBoardModifyDocument` | 글 수정 | `actions/update-document.ts` | 2 (본 SPEC) |
| `procBoardDeleteDocument` | 글 삭제 (휴지통) | `actions/delete-document.ts` | 2 (본 SPEC) |
| `procBoardInsertComment` | 댓글 작성 | `actions/comment-create.ts` | 2 (본 SPEC) |
| `procBoardModifyComment` | 댓글 수정 | `actions/comment-update.ts` | 2 (본 SPEC) |
| `procBoardDeleteComment` | 댓글 삭제 | `actions/comment-delete.ts` | 2 (본 SPEC) |
| `procBoardVoteUp` / `procBoardVoteDown` | 추천/비추천 | SPEC-DOCUMENT-001 service 위임 (UI 버튼만 본 SPEC) | 2 (본 SPEC UI / DOC service) |
| `procBoardDeclareDocument` | 신고 | SPEC-DOCUMENT-001 service 위임 + 최소 UI | 2 (본 SPEC UI) |
| `procBoardVerificationPassword` | 비밀번호 검증 | SPEC-DOCUMENT-001 service 위임 (UI는 본 SPEC) | 2 (본 SPEC UI / DOC service) |
| `procBoardTempSavedDoc` | 임시저장 | SPEC-DOCUMENT-001 service 위임 (UI 차후 — Phase 2 후반 또는 후속) | 백로그 |

### 1.3 admin* 액션 (관리자 UI 매핑)

| 레거시 액션 | 의미 | 본 SPEC 매핑 | Phase |
|---|---|---|---|
| `dispBoardAdminContent` | board admin 진입 | `/admin/boards/[mid]/` 셸 layout | 2 (본 SPEC) |
| `dispBoardAdminBoardInfo` | 게시판 기본 정보 편집 | `/admin/boards/[mid]/settings` (SPEC-ADMIN-001 일부) | 1 SPEC-ADMIN-001 |
| `dispBoardAdminGrant` | 권한 매트릭스 편집 | `/admin/boards/[mid]/permissions` | 2 (본 SPEC) ★ |
| `dispBoardAdminCategory` | 카테고리 편집 | `/admin/boards/[mid]/categories` | 2 (본 SPEC) ★ |
| `dispBoardAdminExtraVarSetup` | 추가 변수 설정 | `/admin/boards/[mid]/extra-keys` | 2 (본 SPEC) ★ |
| `dispBoardAdminTrash` | 휴지통 관리 | 5 (SPEC-ADMIN-EXTRAS) |
| `procBoardAdminInsertModuleConfig` | board 전역 설정 저장 | SPEC-ADMIN-001 일부 |
| `procBoardAdminInsertGrant` | 권한 매트릭스 저장 | `actions/admin-save-permissions.ts` | 2 (본 SPEC) ★ |
| `procBoardAdminInsertCategory` | 카테고리 저장 | `actions/admin-save-categories.ts` | 2 (본 SPEC) ★ |
| `procBoardAdminInsertExtraVar` | 추가 변수 저장 | `actions/admin-save-extra-keys.ts` | 2 (본 SPEC) ★ |

★ 표시는 본 SPEC Slice C에서 직접 다루는 항목.

### 1.4 본 SPEC에서 의도적으로 제외하는 액션

- `dispBoardManageCheckedDocument` (일괄 작업) — 5 (SPEC-ADMIN-EXTRAS)
- `procBoardCopyDocument` / `procBoardMoveDocument` — 5 (SPEC-ADMIN-EXTRAS)
- `dispBoardImage` (이미지 hosting) — 3 (SPEC-FILE-001)
- `procBoardAdminMakeXmlFile` — RSS/sitemap, 백로그
- `dispBoardAdminPointSetup` — 3 (SPEC-POINT-001)
- 글 임시저장 (`procBoardTempSavedDoc`, `dispBoardLoadTempSavedDoc`) — 후속 SPEC

---

## 2. 레거시 Smarty 템플릿 → React 컴포넌트 매핑

레거시 `D:\project\rhymix\modules\board\tpl\` 와 `D:\project\rhymix\modules\board\skins\xe_default\` 의 주요 템플릿을 분석하여 본 SPEC이 구현해야 할 UI 요소를 식별한다.

### 2.1 주요 Smarty 템플릿

| 레거시 템플릿 | 역할 | 본 SPEC 매핑 (mandatory/optional) | Component |
|---|---|---|---|
| `list.html` | 게시판 목록 | **mandatory** | `index-route.tsx` |
| `view.html` | 글 상세 | **mandatory** | `detail-route.tsx` |
| `write_form.html` | 글쓰기 폼 | **mandatory** | `write-form.tsx` |
| `comment_form.html` | 댓글 작성 폼 | **mandatory** | `comment-form.tsx` |
| `comment.html` | 댓글 단일 렌더 | **mandatory** | (comment-list 안의 재귀 컴포넌트) |
| `category.html` | 카테고리 select/tree 표시 | **mandatory** | (write-form / index-route 내부) |
| `search_form.html` | 검색 폼 | **mandatory** (간략) | (index-route header) |
| `header.html`, `footer.html` | 게시판 상하단 wrapper | optional (Phase 2는 layout이 제공) | — |
| `notice.html` | 공지 영역 | **mandatory** | (index-route 상단) |
| `extra_vars.html` | 추가 변수 폼 | **mandatory** | (write-form 내부 동적) |
| `consultation_view.html` | 상담형 게시판 (consultation_read grant) | optional (Phase 5) | — |
| `print.html` | 인쇄용 view | optional (백로그) | — |
| `mobile/*.html` | 모바일 전용 | **제외** (responsive-only 정책) | — |
| `rss.html`, `atom.html` | RSS feed | **제외** (백로그) | — |

### 2.2 mandatory UI 요소 체크리스트

본 SPEC Slice B가 반드시 구현해야 할 UI 요소들:

목록 페이지 (`index-route`):

- [ ] 게시판 제목/설명 (board.title, board.description)
- [ ] 카테고리 필터 (드롭다운 또는 탭) — REQ-BOARD-032
- [ ] 검색 입력 + 검색 옵션 (제목/내용/작성자) — REQ-BOARD-033 (Phase 2는 통합검색만)
- [ ] 공지글 핀 영역 (`[공지]` 표시) — REQ-BOARD-091
- [ ] 일반 문서 목록 (제목, 작성자, regdate, comment count, view count) — REQ-BOARD-031
- [ ] 페이지네이션 컨트롤 — REQ-BOARD-034
- [ ] 글쓰기 버튼 (권한 있을 때만) — REQ-BOARD-050

상세 페이지 (`detail-route`):

- [ ] 문서 제목, 작성자, regdate, view count, comment count
- [ ] sanitized content
- [ ] 추가 변수 표시 (board.extraKeys에 정의된 필드)
- [ ] 첨부파일 목록 (Phase 2는 placeholder, Phase 3 활성화)
- [ ] 추천/비추천 버튼 (SPEC-DOCUMENT-001 vote service 호출)
- [ ] 신고 버튼 (최소 UI)
- [ ] 수정/삭제 버튼 (작성자/admin만) — REQ-BOARD-053
- [ ] 댓글 트리 — REQ-BOARD-060
- [ ] 댓글 작성 폼 — REQ-BOARD-061
- [ ] admin only: 공지 토글 버튼 — REQ-BOARD-090

쓰기/수정 폼 (`write-form`):

- [ ] title input
- [ ] content textarea (Phase 2; WYSIWYG는 후속 SPEC)
- [ ] category select (board.categories에서 동적)
- [ ] extraKeys 동적 입력 (type별 input 분기) — REQ-BOARD-055
- [ ] 첨부파일 slot (Phase 2 disabled) — REQ-BOARD-055
- [ ] secret 체크박스 + 비밀번호 (옵션)
- [ ] notice 체크박스 (admin만) — REQ-BOARD-090
- [ ] 임시저장 버튼 (Phase 2는 비활성, 후속 SPEC)
- [ ] 작성/취소 버튼

권한 매트릭스 (`/admin/boards/[mid]/permissions`):

- [ ] 7개 grant 행 (list, view, write_document, write_comment, vote_log_view, update_view, consultation_read) — REQ-BOARD-071
- [ ] member group 열 (guest=0, member=1, +사이트 정의 그룹들)
- [ ] 체크박스 매트릭스
- [ ] 저장 버튼

카테고리 관리 (`/admin/boards/[mid]/categories`):

- [ ] 트리 표시 (parentId indent)
- [ ] 추가/수정/삭제 버튼
- [ ] 순서 변경 (up/down 버튼; 드래그는 Phase 5)
- [ ] 색상 picker (선택)
- [ ] 저장 버튼

extra_vars 관리 (`/admin/boards/[mid]/extra-keys`):

- [ ] key list (name, label, type, required, order)
- [ ] type select (text/textarea/select/checkbox/date)
- [ ] type=select일 때 options 입력
- [ ] required 토글
- [ ] 추가/수정/삭제 버튼
- [ ] 저장 버튼

### 2.3 optional UI 요소 (Phase 2 미포함)

본 SPEC에서 명시적으로 다음을 제외한다 (Section 1.4와 일관):

- 상담형 게시판 (consultation) 전용 UI
- 회원 카드 hover popup
- 작성자 아바타 / signature 풀세트 (SPEC-AUTH-POLISH-001)
- 인쇄용 view
- 모바일 전용 layout
- 트랙백 표시 영역
- 외부 위젯용 board renderer
- 이전 글/다음 글 navigation
- 카테고리별 색상 자동 적용 (manual color picker만 Phase 2)

---

## 3. Board.permissions vs rbac.ts — 관계 결정

본 SPEC Open Question 2의 baseline 분석.

### 3.1 현재 코드 분석

`packages/board/src/permissions.ts`:

- `canPerformAction(board, action, ctx)` — 단일 함수
- `PermissionContext = { userGroupSrl: number, isAdmin: boolean }`
- admin이면 무조건 true (line 48, escape hatch)
- permissions[action]이 정의되면 그 배열에 userGroupSrl 포함 여부
- 정의 없으면 default `[1]` (member only)
- 빈 배열 `[]`은 admin only 의미

`packages/auth/src/rbac.ts` (현재 미독해 — 본 SPEC 작성 시점에 grep 결과 미확인. 코드 작성 시 expert-backend가 확인 필요):

- site-admin 판별, 그룹 권한 평가 — 일반 RBAC
- 본 SPEC 권고: rbac.ts는 site/app 수준에서 효과, permissions.ts는 board 인스턴스 수준에서 효과

### 3.2 권장 권한 평가 순서

```
1. session 확인 (인증 여부)
2. rbac.ts → isAdmin 여부 (site admin escape)
3. board 조회 (Board.permissions 포함)
4. permissions.ts canPerformAction(board, action, { userGroupSrl, isAdmin })
5. false면 403, true면 통과
```

### 3.3 helper 권고

본 SPEC Slice B 구현 시 `packages/board/src/get-permission-context.ts` 신규 helper 작성:

```ts
export async function getEffectivePermissionContext({
  prisma,
  session,
}: {
  prisma: PrismaClient;
  session: Session | null;
}): Promise<PermissionContext> {
  if (!session?.user) return { userGroupSrl: 0, isAdmin: false }; // guest
  const isAdmin = await checkSiteAdmin(prisma, session.user.id); // rbac.ts 위임
  const groupSrl = await resolveGroupSrl(prisma, session.user.id); // primary group
  return { userGroupSrl: groupSrl, isAdmin };
}
```

이 helper 하나만 추가하면 rbac.ts와 permissions.ts의 관계가 명확해진다.

---

## 4. 현재 코드 자산 인벤토리

본 SPEC이 활용/이주/제거해야 하는 기존 자산.

### 4.1 packages/board 현재 파일 (40+개, MASTER-PLAN-002 research 검증)

활용 (board 고유, 본 SPEC 보강):

- `permissions.ts` — 본 SPEC Slice B에서 4 → 7 grant 확장
- `permissions.test.ts` — 본 SPEC에서 5+ 테스트 추가
- `config.ts` + `config` 관련 — boardConfig 확장
- `category.ts` + `category.test.ts` — 본 SPEC Slice C admin UI에서 활용
- `extra-keys.ts` + `.test.ts`, `extra-vars-schema.ts` + `.test.ts` — 본 SPEC Slice C admin UI에서 활용
- `attachment.ts` + `.test.ts` — Phase 3 SPEC-FILE-001 통합 지점
- `vote.ts` + `vote.test.ts` — SPEC-DOCUMENT-001 위임 후 UI만 본 SPEC
- `search.ts` + `.test.ts` — SPEC-DOCUMENT-001 위임 후 UI만 본 SPEC
- `report.ts` + `.test.ts` — SPEC-DOCUMENT-001/COMMENT-001 service에 통합
- `history.ts` + `.test.ts` — SPEC-DOCUMENT-001로 이동 (수정 이력은 document 도메인)
- `trash.ts` + `.test.ts` — board 일부 + document 일부로 분리 (이주 결정은 SPEC-DOCUMENT-001 Slice A 시점)
- `rate-limit.ts` + `.test.ts` — board action rate limit, 본 SPEC에서 활용
- `on-install.ts` — board 모듈 설치 hook, 본 SPEC에서 보강
- `actions/create-document.ts` — 본 SPEC Slice B에서 보강 (현재 미완성 가능)
- `storage/*.ts` — Phase 3 SPEC-FILE-001로 승격 (현 위치는 deprecated 예정)
- `routes/index-page.test.ts` — 본 SPEC Slice B에서 활용/확장
- `components/test-setup.ts` — 본 SPEC에서 활용

이주 대상 (Slice A):

- `document.ts` → `packages/document/src/service.ts`
- `document.test.ts` → `packages/document/src/service.test.ts`
- `comment.ts` → `packages/comment/src/service.ts`
- `comment.test.ts` → `packages/comment/src/service.test.ts`

### 4.2 apps/web 현재 자산

- `apps/web/app/[mid]/page.tsx` — 모듈 디스패처 (이미 존재, board moduleCode 자연 처리 확인됨)
- `apps/web/app/[mid]/page.test.tsx` — 본 SPEC에서 board case 추가
- `apps/web/lib/modules/register.ts` — 본 SPEC에서 boardModuleDefinition 등록

### 4.3 packages/core 자산

- `packages/core/src/modules/registry.ts` — `registerModule` API (이미 존재)
- `packages/core/src/widgets/` — Phase 1 SPEC-WIDGET-001 (본 SPEC 직접 의존 없음)
- `packages/core/src/theme/` — Phase 1 SPEC-LAYOUT-001 의존 (renderModuleWithLayout)

### 4.4 Prisma 스키마

이미 정의됨 (MASTER-PLAN-002 research 검증):

- `Board` model — line 471~509 가정 (research에 직접 인용은 없지만 board 코드가 존재하므로 모델 존재 확실)
- `Document` — line 608~664
- `Comment` — line 666~700
- `DocumentExtraKey` — line 728
- `FileAttachment` — line 748~777

본 SPEC은 새 Prisma 모델을 추가하지 않는다. 기존 모델만 사용.

---

## 5. 의존성 결정 — SPEC-DOCUMENT-001 / SPEC-COMMENT-001

본 SPEC은 두 패키지에 의존하는 wrapper다. 그 의존 표면을 명시한다.

### 5.1 @rhymix-ts/document에서 필요한 export

(SPEC-DOCUMENT-001 작성자에게 본 SPEC이 요구하는 surface 목록)

```ts
// Service
export function createDocument(input, { prisma }): Promise<Document>;
export function updateDocument(input, { prisma }): Promise<Document>;
export function deleteDocument(documentId, { prisma }): Promise<void>;
export function getDocumentById(documentId, { prisma }): Promise<Document | null>;
export function listDocuments({ moduleSrl, page, pageSize, category, q, includeNotice }, { prisma }): Promise<DocumentListResult>;
export function incrementReadedCount(documentId, { prisma }): Promise<void>;

// Vote (SPEC-DOCUMENT-001 search REQs)
export function voteUp(documentId, memberId, { prisma }): Promise<void>;
export function voteDown(documentId, memberId, { prisma }): Promise<void>;

// Verify (secret 문서)
export function verifyDocumentPassword(documentId, password, { prisma }): Promise<boolean>;
```

### 5.2 @rhymix-ts/comment에서 필요한 export

```ts
export function createComment(input, { prisma }): Promise<Comment>;
export function updateComment(input, { prisma }): Promise<Comment>;
export function deleteComment(commentId, { prisma }): Promise<void>;
export function listCommentsByDocument(documentId, { prisma }): Promise<CommentTree>;
export function verifyDepth(parentId, { prisma }): Promise<boolean>; // depth max 5 검증
```

`CommentTree`는 트리 구조로 직렬화된 형태. 본 SPEC `comment-list.tsx`는 이 트리를 재귀 렌더.

### 5.3 SPEC-DOCUMENT-001 / SPEC-COMMENT-001에 미확정 이슈

본 SPEC 작성 시점에 두 SPEC이 동시 진행 중이므로 다음은 확정되지 않았다:

1. **Document trash + history 이주 범위**: `packages/board/src/history.ts`, `trash.ts`가 document 패키지로 통째로 이동하는지, board에 남는지? — 권고: history는 document로 이동, trash는 document의 hook을 board가 호출하는 형태
2. **FTS 인터페이스**: SPEC-DOCUMENT-001의 listDocuments에 q 파라미터를 직접 지원할지, 별도 searchDocuments 함수로 분리할지 — 본 SPEC은 어느 쪽이든 호출 가능하면 OK
3. **vote/declare service의 위치**: document 도메인에 통합되는지 별도 분리되는지 — 본 SPEC은 `@rhymix-ts/document`에서 export되기만 하면 OK

위 3개는 SPEC-DOCUMENT-001 작성자가 결정. 본 SPEC은 follower 역할.

---

## 6. Acceptance Headline 추적

MASTER-PLAN-002 Section 5.6의 acceptance headlines가 본 SPEC의 REQ로 매핑되었는지 검증.

| MASTER-PLAN-002 headline | 본 SPEC 매핑 |
|---|---|
| WHEN board mid가 라우트에 매칭되면, THE SYSTEM SHALL 게시판 목록 페이지를 layout + skin 안에서 렌더한다 | REQ-BOARD-030, AC-BOARD-B1 |
| WHEN 비로그인 사용자가 글쓰기 폼에 접근하면, THE SYSTEM SHALL `/login`으로 redirect 한다 | REQ-BOARD-050, AC-BOARD-B8 |

두 headline 모두 본 SPEC에서 정확히 cover. 추가로 master plan에서 명시되지 않은 항목(권한 매트릭스, 카테고리, extra_vars admin UI, 공지 핀 등)은 본 SPEC scope에 명시적으로 포함.

---

## 7. 테스트 수 추정 검증

MASTER-PLAN-002 Section 5.6 estimate: +25 tests.

본 SPEC plan.md의 분해:

- Slice A characterization: 7
- Slice B 단위/통합: 약 15 (permissions 5 + routes 6 + actions 4)
- Slice B e2e: 2
- Slice C 단위: 약 13 (permissions 5 + admin actions 8) — 일부는 Slice B와 중복
- 합계: 약 25~30 (중복 제거 후 25에 근접)

추정 일치. 본 SPEC에서 더 많은 테스트가 필요하다고 판단되면 expert-backend/frontend가 implementation 시점에 추가.

---

## 8. 결론 및 다음 단계

본 research를 통해 다음이 명확해졌다:

1. **scope 확정**: 본 SPEC은 SPEC-DOCUMENT-001/COMMENT-001의 consumer + board 고유 UI/admin 매트릭스의 owner
2. **legacy 매핑 완료**: Section 1의 액션 매핑 표가 본 SPEC range를 모두 cover
3. **UI 요소 목록 확정**: Section 2의 mandatory 체크리스트가 spec.md REQ와 일치
4. **권한 시스템 결정**: Section 3의 helper(`getEffectivePermissionContext`) 채택으로 rbac.ts/permissions.ts 관계가 깔끔
5. **현재 자산 활용 계획 확정**: Section 4의 인벤토리로 이주/유지/추가 명확

본 research를 기반으로 spec.md, plan.md, acceptance.md 작성이 완료되었다. 다음 단계는:

1. plan-auditor agent 리뷰
2. 사용자 승인
3. SPEC-DOCUMENT-001, SPEC-COMMENT-001 우선 진행 (본 SPEC의 prerequisite)
4. 두 SPEC 머지 후 `/moai run SPEC-BOARD-CRUD-001`로 Slice A 시작

---

Version: 1.0.0
Status: complete (baseline analysis done; refinement on-demand)
