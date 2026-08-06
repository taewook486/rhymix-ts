---
spec: SPEC-COMMENT-001
phase: 2
parent-research: MASTER-PLAN-002/research.md
created: 2026-05-27
language: ko
---

# Research — SPEC-COMMENT-001 (Comment Domain)

본 research는 MASTER-PLAN-002/research.md Section 1.4 (line 145~174)를 단일 진실 공급원으로 인용하고, 본 SPEC 범위에 한정해 **스키마-Prisma 매핑**, **액션-tRPC 매핑**, **트리 구조 규칙**, **document와의 cross-cutting 이벤트**를 보강한다.

---

## 1. 인용 (Single Source of Truth)

다음은 MP-002/research.md에서 이미 정리되어 본 문서에서 반복하지 않는다.

- 레거시 모듈 경로 및 응집 사항: MP-002/research.md line 145~155
- 이벤트 핸들러 트리거(`after document.deleteDocument` 등): MP-002/research.md line 156~159
- 현재 Rhymix-TS 매핑 누락(packages/comment 미존재): MP-002/research.md line 172~174

본 SPEC은 위 사실을 전제로 한다.

---

## 2. Legacy 스키마 → Prisma 모델 매핑 표

D:\project\rhymix\modules\comment\schemas\ 의 5개 XML 스키마를 Prisma 모델과 매핑한다.

| Legacy schema | Prisma 모델 (현재 또는 신설) | 상태 | SPEC-COMMENT-001 처리 |
|---|---|---|---|
| comments.xml | Comment (존재) | 존재 | Slice A 분리 시 모델 인용 |
| comments_list.xml | (캐시 테이블, 없음) | **GAP — 채택 안 함** | DB 정규화로 대체. PostgreSQL CTE+index로 list 쿼리 처리 |
| comment_declared.xml | Report (commentId nullable) | 통합 | Slice C report.ts 분기 처리 |
| comment_declared_log.xml | Report 로그 통합 | 통합 | Slice C |
| comment_voted_log.xml | Vote (commentId nullable) | 통합 | Slice C vote.ts 분기 처리 |

**설계 결정**:
- `comments_list` 캐시 테이블은 채택하지 않는다 (PostgreSQL의 부모-자식 CTE + `list_order` 인덱스로 충분).
- `Report` / `Vote` 모델은 `documentId` / `commentId` 두 FK를 nullable 로 가져 단일 모델에서 양쪽을 표현 (이미 board 패키지에 구현됨).

---

## 3. Legacy 액션 → tRPC 라우터 매핑

레거시 `modules/comment/conf/module.xml`의 주요 action을 tRPC procedure로 매핑.

| Legacy action | HTTP method | tRPC procedure (proposed) | Slice |
|---|---|---|---|
| dispCommentList | GET | comment.list (documentId 기준) | B |
| procCommentInsertComment | POST | comment.create | B |
| procCommentUpdateComment | POST | comment.update | B |
| procCommentDeleteComment | POST | comment.delete | B |
| procCommentVoteup / Votedown | POST | comment.vote | C |
| procCommentDeclareComment | POST | comment.report | C |
| dispCommentManage (admin) | GET | comment.adminList | C |

전체 매핑은 Slice B 시점에 `packages/comment/src/router.ts` 작성과 함께 표로 완결한다.

---

## 4. Comment Tree 구조 규칙

레거시 Rhymix의 댓글 트리 구조는 다음 두 컬럼으로 표현된다 (`comments.xml`):

- `parent_srl`: 부모 댓글의 ID. 루트 댓글은 0 또는 null.
- `list_order`: 부모 댓글 srl을 prefix로 한 정수 (음수 또는 시간 역순 — Rhymix는 `-(unix_timestamp)` 패턴).

Prisma 모델은 다음과 같이 정규화한다:

```
Comment {
  id          Int   @id @default(autoincrement())
  documentId  Int
  parentId    Int?  @relation(...)
  listOrder   BigInt  // -(epoch_seconds * 1000) for descending time order
  depth       Int   // 0=root, 1=reply, ..., MAX_DEPTH=5
  ...
}
```

**Depth 제한**:
- 레거시는 명시적 depth 제한이 없음 (settings에서 board별 설정 가능).
- 본 SPEC은 **MAX_DEPTH=5**를 기본값으로 채택 (Open Question으로 spec.md에 명시되어 있음, EARS REQ-COMMENT-DEPTH-001).
- 사유: UI에서 5단계 이상 들여쓰기는 mobile에서 가독성 붕괴.

**Tree query**:
- 루트 + 후손 fetch: PostgreSQL recursive CTE
- list_order로 정렬하여 형제 순서 보장
- N+1 회피: documentId 단위로 한 번에 전체 트리 fetch (대형 게시판은 페이지네이션 — `cursor` 기반)

---

## 5. Cross-Module 이벤트 (document와의 결합)

MP-002/research.md line 156~159 인용 보강:

document → comment 방향 cascade:
- `after document.deleteDocument` → 해당 document의 모든 comment soft-delete
- `after document.moveDocumentModule` → comment.boardId 일괄 업데이트
- `before document.copyDocumentModule.each` → comment 복제 (옵션)

comment → document 방향 카운터:
- `after comment.create` → `Document.commentCount += 1`, `Document.lastCommentAt = now()`
- `after comment.delete` → `Document.commentCount -= 1` (트랜잭션 안에서)

본 SPEC-COMMENT-001 구현 시:
- Slice B의 tRPC mutation 안에서 위 카운터 갱신을 트랜잭션 안에서 처리
- document 측 cascade 트리거는 `packages/document` (SPEC-DOCUMENT-001)에서 service injection 으로 구현
- ADDON-001 hook system 도입 후(Phase 4) hook으로 마이그레이션

---

## 6. 본 패키지가 수용하는 코드 인벤토리

`packages/board/src/`에서 `packages/comment/src/`로 이전될 파일 (Slice A):

```
comment.ts           (≈168 LoC, comment CRUD)
comment.test.ts      (≈195 LoC)
```

부분 이전 (board와 comment 양쪽이 공유, comment 분기만 추출):
```
report.ts → comment.report.ts (commentId 처리부)
vote.ts   → comment.vote.ts (commentId 처리부)
```

원본 파일은 board에 유지하고 `@rhymix-ts/comment` 가 분기를 호출하는 형태로 분리.

---

## 7. 누락 기능 (백로그)

- 알림(notification) — 댓글 작성 시 작성자/언급된 사용자에게 알림. **P3, 별도 SPEC** (ncenterlite 모듈 포팅 필요)
- 비밀 댓글의 password 인증 — `Comment.status = SECRET` + 비밀번호 인증 (Slice C에 포함)
- 추천/비추천 anti-abuse — IP/유저별 1회 제한 (Slice C, 단순한 unique constraint)

---

## 8. Open Questions (spec.md로 승격됨)

- MAX_DEPTH 기본값 5 vs 설정 가능 (spec.md Open Questions 참조)
- comment voting/report를 SPEC-COMMENT-001 Slice C에서 처리할지, 별도 cross-cutting SPEC으로 분리할지
- 알림(ncenterlite) 포팅 시점

---

Version: 1.0.0
Related: MASTER-PLAN-002/research.md Section 1.4
