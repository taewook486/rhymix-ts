---
spec: SPEC-DOCUMENT-001
phase: 2
parent-research: MASTER-PLAN-002/research.md
created: 2026-05-27
language: ko
---

# Research — SPEC-DOCUMENT-001 (Document Domain)

본 research는 MASTER-PLAN-002/research.md Section 1.3 (line 102~143) 를 단일 진실 공급원으로 인용하고, 본 SPEC 범위에 한정해 **스키마-Prisma 매핑**, **액션-tRPC 매핑**, **이벤트 핸들러 인벤토리**를 보강한다. 중복 서술은 금지하며 인용으로 갈음한다.

---

## 1. 인용 (Single Source of Truth)

다음 항목은 MP-002/research.md에서 이미 정리되었으므로 본 문서에서는 반복하지 않는다.

- 레거시 모듈 경로 및 응집 사항: MP-002/research.md line 102~118
- 핵심 이벤트 트리거: MP-002/research.md line 119~125
- 현재 Rhymix-TS 매핑 현황(`Document` Prisma 모델, `DocumentExtraKey`/`DocumentExtraVar`, FTS `search_vector`, `packages/board/src/document.ts` 응집): MP-002/research.md line 126~143

본 SPEC은 위 사실을 전제로 한다.

---

## 2. Legacy 스키마 → Prisma 모델 매핑 표

D:\project\rhymix\modules\document\schemas\ 의 12개 XML 스키마를 Prisma 모델과 1:1 매핑한다.

| Legacy schema | Prisma 모델 (현재) | 상태 | SPEC-DOCUMENT-001 처리 |
|---|---|---|---|
| documents.xml | Document | 존재 (packages/db/prisma/schema.prisma) | Slice A 분리 시 모델 인용만 (변경 없음) |
| document_categories.xml | Category | 존재 (parent_srl style tree) | Slice C 카테고리 트리 service 추출 |
| document_extra_keys.xml | DocumentExtraKey | 존재 | Slice A 분리 + extra-keys.ts 이동 |
| document_extra_vars.xml | DocumentExtraVar (또는 Document.extra_vars JSONB) | 부분 존재 | Slice A 시 JSONB 통합 여부 결정 (Open Question) |
| document_histories.xml | DocumentHistory | 존재 | Slice C history.ts 이동 |
| document_update_log.xml | (없음) | **GAP** | Slice C에서 모델 신설 필요 여부 결정 |
| document_aliases.xml | (없음) | **GAP** | Slice C에서 별칭 URL 모델 신설 (또는 백로그) |
| document_declared.xml | (Report 모델로 통합) | 존재 (board에서) | Slice A report.ts 이동 |
| document_declared_log.xml | (Report 모델로 통합) | 존재 | Slice A 함께 이동 |
| document_voted_log.xml | (Vote 모델) | 존재 (board에서) | Slice A vote.ts 이동 |
| document_readed_log.xml | (없음) | **GAP** | 백로그로 분류 (조회 추적은 cache로 대체 가능) |
| document_trash.xml | Document.deletedAt (soft delete) | 통합 | Slice C trash.ts 이동 |

**GAP 우선순위**:
- P1 (Slice C 포함): document_update_log, document_aliases
- P3 (백로그): document_readed_log

---

## 3. Legacy 액션 → tRPC 라우터 매핑

레거시 `modules/document/conf/module.xml`의 action 약 30개를 tRPC procedure로 매핑한다 (대표 항목만).

| Legacy action | HTTP method | tRPC procedure (proposed) | Slice |
|---|---|---|---|
| dispDocumentContent | GET | document.byId | B |
| dispDocumentList | GET | document.list | B |
| procDocumentInsertDocument | POST | document.create | B |
| procDocumentUpdateDocument | POST | document.update | B |
| procDocumentDeleteDocument | POST | document.delete | B |
| procDocumentVoteup / Votedown | POST | document.vote | B |
| procDocumentDeclareDocument | POST | document.report | B |
| dispDocumentTrash | GET | document.trashList (admin only) | C |
| procDocumentRestoreTrash | POST | document.restore | C |
| dispDocumentHistory | GET | document.history | C |
| procDocumentManageCategory | POST | document.category.upsert | C |
| dispDocumentAliasList | GET | document.alias.list | C (선택) |

전체 매핑은 Slice B 시점에 `packages/document/src/router.ts` 작성과 함께 1:1 표로 완결한다.

---

## 4. Event Handler 인벤토리 (cross-module dependency)

레거시 modules/document가 다른 모듈에 발신/수신하는 이벤트(MP-002 research.md line 119~125 인용 보강):

발신 이벤트(타 모듈이 후크 가능):
- `before document.insertDocument` → spamfilter, point, autolink
- `after document.insertDocument` → point.add, file.attach, search.index
- `before document.deleteDocument` → comment.bulkDelete, file.bulkDelete
- `after document.deleteDocument` → file/comment/point cascade
- `before document.updateDocument` → spamfilter, history.snapshot
- `after document.moveDocumentModule` → file.move, comment.move
- `before document.copyDocumentModule.each` → comment.copy

본 SPEC-DOCUMENT-001 구현 시 위 hook 지점은 **Phase 4 SPEC-ADDON-001 hook system** 전 단계로 함수 호출 또는 service injection 으로 임시 구현하고, ADDON-001 도입 후 hook으로 마이그레이션한다. (Open Question으로 spec.md에 명시)

수신 이벤트(document가 후크):
- `before module.dispAdditionSetup` → admin/modules/[id] 페이지에 document 탭 추가 (관리 UI 보강 — Phase 4-5로 연기)

---

## 5. 본 패키지가 수용하는 코드 인벤토리

`packages/board/src/`에서 `packages/document/src/`로 이전될 파일 (Slice A 대상):

```
document.ts          (≈555 LoC, CRUD 핵심)
document.test.ts
extra-keys.ts        (≈255 LoC, DocumentExtraKey CRUD)
extra-keys.test.ts
extra-vars-schema.ts (Zod 동적 폼 생성)
extra-vars-schema.test.ts
history.ts           (DocumentHistory snapshot)
history.test.ts
search.ts            (PostgreSQL FTS)
search.test.ts
report.ts            (Report 모델 CRUD)
report.test.ts
rate-limit.ts        (작성 빈도 제한)
rate-limit.test.ts
permissions.ts       (Document.status SECRET 접근 제어)
permissions.test.ts
trash.ts             (Document.deletedAt soft delete 흐름)
on-install.ts        (초기 board mid 1개 + default category 1개; document 만의 on-install로 재정의)
```

분리 후 `packages/board/` 는 위 모듈들을 `@rhymix-ts/document` 로 import 한다. category.ts는 board가 소유한 Category 모델 영역이므로 board에 잔류.

---

## 6. Open Questions (spec.md로 승격됨)

- DocumentExtraVar 컬럼 vs JSONB 통합 결정 (이미 spec.md Open Questions 1번에 명시)
- document_update_log/document_aliases 모델 신설 vs 백로그 분리
- Hook 도입 전 임시 service injection 패턴(예: PointService DI) 합의

---

Version: 1.0.0
Related: MASTER-PLAN-002/research.md Section 1.3
