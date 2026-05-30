---
id: SPEC-POINT-001-research
title: 포인트 시스템 사전조사 (Legacy Point Module + Cross-Module Integration Analysis)
created: 2026-05-27
status: complete
parent: SPEC-POINT-001
source-legacy: D:\project\rhymix\modules\point (PHP)
source-current: D:\project\rhymix-ts
related-master-research: MASTER-PLAN-002/research.md (Section 1.8)
language: ko
---

# Research — 포인트 도메인 실측 조사 및 설계 결정

본 문서는 SPEC-POINT-001의 사전 분석 산출물이다. MASTER-PLAN-002 research.md Section 1.8(line 272~291)을 기반으로 하되, 본 SPEC 작성에 필요한 세부 결정(스키마 모양, 통합 전략, 레벨 시스템 deferral 근거, 멱등성 메커니즘)을 추가 조사하여 정리한다.

---

## 0. 조사 범위와 방법

조사 대상:

- 레거시 PHP `modules/point/`: `point.controller.php`, `point.model.php`, `conf/module.xml`, `schemas/point.xml`
- 레거시 PHP `addons/point_level_icon/`: 레벨 시스템이 addon으로 분리된 사유
- MASTER-PLAN-002 research.md Section 1.8 (사실 인용)
- 현재 rhymix-ts:
  - `packages/db/prisma/schema.prisma`: Point 모델 존재 여부 확인 ✗ (없음)
  - `packages/db/prisma/schema.prisma`: Board 모델 컬럼 확인 (point 관련 컬럼 없음)
  - `packages/db/prisma/schema.prisma`: User 모델 (pointBalance 캐시 컬럼 없음)
  - `packages/auth/src/signup.*`: 회원가입 트랜잭션 진입점 확인
  - `packages/board/src/`: board 도메인 fixture 영향 평가
  - SPEC-DOCUMENT-001 spec.md: REQ-DOC-132 이벤트 버스 stub 가용성 확인 ✓
  - SPEC-COMMENT-001 spec.md: 진행 상태 확인 (병행 진행 중)

본 문서가 다루지 않는 것:

- 운영 데이터 마이그레이션 (PHP `point` → TS `Point` ETL) — 별도 SPEC
- 부하/성능 테스트 — 백로그
- 다국어 reason 라벨 시스템 — SPEC-I18N-001

---

## 1. 레거시 PHP `modules/point/` 사실 정리

### 1.1 디렉토리 구조 및 인터페이스

레거시 `D:\project\rhymix\modules\point\`의 핵심 파일:

```
modules/point/
├── point.controller.php     # procPointAdjustPoint, addPoint, deletePoint, setPoint
├── point.model.php          # getPoint(memberSrl), getPointList, getMemberGroupByPoint
├── point.view.php           # frontend (거의 미사용 — admin이 본체)
├── point.admin.controller.php  # 일괄 작업 (recal, apply, reset)
├── point.admin.model.php
├── point.admin.view.php
├── conf/
│   ├── info.xml             # 모듈 메타 (category: member)
│   └── module.xml           # 액션 정의 (admin) + 권한 grants
└── schemas/
    └── point.xml            # 단일 테이블 정의
```

### 1.2 레거시 `point` 테이블 (검증된 사실)

`D:\project\rhymix\modules\point\schemas\point.xml` 직접 읽기 결과 — MASTER-PLAN-002 research.md line 276 인용:

```xml
<table name="point">
  <column name="member_srl" type="number" size="11" notnull="notnull" primary_key="primary_key" />
  <column name="point" type="number" size="11" notnull="notnull" default="0" />
</table>
```

핵심 관찰:
- **단일 테이블**, 회원당 **1 row**.
- 컬럼 2개: `member_srl` (PK + FK to member) + `point` (signed integer, default 0).
- **이력(history) 없음** — 잔액만 저장. 누가, 언제, 왜 포인트가 변동했는지 기록 없음.
- **음수 허용 여부 컬럼 없음** — 정책은 controller 코드에 하드코딩 (`addPoint`가 음수 허용, `setPoint`가 0 클램프 옵션 plait 사용).

→ 이 데이터 모델은 운영 시 "어느 게시판에서 글 작성 보너스로 얼마를 받았는지" 같은 사후 조회가 불가능. CMS 운영 경험상 사용자 문의("내 포인트가 왜 줄었나요") 응답이 어려운 구조.

### 1.3 레거시 `module.xml` 액션 매핑

`D:\project\rhymix\modules\point\conf\module.xml`에서 추출:

- `procPointAdjustPoint` (admin): admin이 회원의 포인트를 수동 조정 (사이트 운영 도구).
- `dispPointAdminList` (admin): 회원 목록 + 포인트 표시 (정렬/필터).
- `dispPointAdminConfig` (admin): 포인트 정책 설정 (사이트 전역) — 가입 보너스, 음수 허용, 모듈별 default 등.
- `procPointAdminInsertConfig`: 정책 저장.
- `procPointAdminRecalculate`: 일괄 재계산 (잔액 재산정 — 본 SPEC 범위 외, recompute API만 제공).
- `procPointAdminReset`: 일괄 0 리셋 — 운영 도구, 본 SPEC 범위 외.

→ TS 포팅 시 매핑:
| 레거시 액션 | TS 매핑 | 본 SPEC 위치 |
|---|---|---|
| `procPointAdjustPoint` | `apps/web/app/admin/members/[id]/points/actions.ts` Server Action | Slice B (REQ-POINT-060, 061) |
| `dispPointAdminList` | `apps/web/app/admin/members/[id]/points/page.tsx` (회원별) — 사이트 전체 리스트는 본 SPEC 범위 외 (Phase 5) | Slice B |
| `dispPointAdminConfig` + `procInsertConfig` | `apps/web/app/admin/site/points/page.tsx` + actions | Slice B (REQ-POINT-062) |
| `procPointAdminRecalculate` | `PointService.recompute(memberId)` API만; CLI는 별도 | Slice A (REQ-POINT-027) — admin 일괄 도구는 Phase 5 |
| `procPointAdminReset` | 본 SPEC 범위 외 | — |

### 1.4 레거시 cross-module 호출 사이트

레거시 PHP에서 `point.controller.php::addPoint()` 호출 위치 (grep 결과 기반 — MASTER-PLAN-002 research.md Section 1.8 line 282 인용 + 본 SPEC에서 추가 확인):

| 호출 위치 (PHP) | 호출 시점 | 부여량 결정 |
|---|---|---|
| `modules/document/document.controller.php::insertDocument` | 글 작성 성공 후 | `module_config[point_per_document]` |
| `modules/document/document.controller.php::deleteDocument` | 글 삭제 시 (역부여 — 회수) | `-module_config[point_per_document]` (선택; 본 SPEC은 회수 미구현, REQ-POINT-044) |
| `modules/comment/comment.controller.php::insertComment` | 댓글 작성 후 | `module_config[point_per_comment]` |
| `modules/document/document.controller.php::voteDocument` | 추천/비추천 시 | `module_config[point_per_vote]` (content author에게) |
| `modules/file/file.controller.php::procFileDownload` | 파일 다운로드 시 | `module_config[point_per_download]` (downloader 차감) |
| `modules/file/file.controller.php::insertFile` | 파일 업로드 후 | `module_config[point_per_file_upload]` (uploader 부여) |
| `modules/member/member.controller.php::insertMember` | 회원가입 완료 후 | `config[signup_point]` (사이트 전역) |

→ TS 매핑 시 7개 진입점 중 **Phase 3 본 SPEC이 다루는 것**:
- ✓ document.create (REQ-POINT-040)
- ✓ comment.create (REQ-POINT-041)
- ✓ vote (REQ-POINT-042)
- ✓ signup (REQ-POINT-043, 070)
- ✗ document.delete 역부여 (REQ-POINT-044 명시적 미구현)
- ✗ file.download / file.upload (SPEC-FILE-001 Phase 3 후속 — enum만 예약, REQ-POINT-002)

### 1.5 레거시 정책 저장 위치

레거시 PHP에서 포인트 정책(가입 보너스, 음수 허용, 모듈별 default)은 `module_extra_vars` 또는 `module_config` 테이블에 JSON으로 저장. TS 매핑:
- 사이트 전역 정책 → 신규 `sitePointConfig` (ModuleConfig 재사용, `moduleCode='point'`, `moduleInstanceId=null`) — REQ-POINT-006
- 게시판별 정책 → 신규 `Board.pointPer*` 6개 컬럼 (Q3 결정 — Prisma column 채택) — REQ-POINT-005

### 1.6 레거시 음수 허용 정책

`point.controller.php::addPoint`는 `point + $point_to_add` 계산 후 0 클램핑 옵션 적용. config에 `point_force_zero_when_negative` 또는 유사 키가 있음. 본 SPEC은 이를 `sitePointConfig.clampToZero`로 단순화 (Q1 결정 — default true).

레거시 `allow_negative` 같은 명시적 컬럼은 없음 — 컨트롤러 로직에 묻혀있음. TS 매핑은 명시적 config 컬럼으로 분리 (`allowNegativeBalance`).

### 1.7 레벨 시스템 deferral 근거

레거시 `addons/point_level_icon/` 디렉토리 직접 확인 (`D:\project\rhymix\addons\point_level_icon\`):
- `point_level_icon.addon.php`: `before_display_content` hook (MASTER-PLAN-002 research.md line 504)
- `conf/info.xml`: extra_vars로 사이트 운영자가 레벨 threshold + icon URL 매핑 정의
- 핵심: **레벨 매핑은 addon 영역**. 사이트별 정책 변동성이 크며, 모듈 코어가 아니라 plugin이 처리하는 것이 합리적.

→ 본 SPEC은 `getLevel(memberId)` stub만 ship (REQ-POINT-007, 028). Phase 4 SPEC-ADDON-001 또는 SPEC-POINT-LEVEL-001 산하 addon에서 실제 룩업 구현. addon은 본 SPEC의 `point.changed` 이벤트를 subscribe하여 회원의 nickname 옆 레벨 아이콘 갱신.

### 1.8 레거시 멱등성 부재

레거시 PHP는 `(member_srl, source)` 멱등성 보장 없음 — controller 코드가 매번 `addPoint` 호출. 동일 글에 대해 `insertDocument`가 두 번 호출되면 (e.g., 폼 재제출) 포인트도 두 번 부여. 운영상 알려진 issue.

→ 본 SPEC은 명시적 멱등성 추가 (REQ-POINT-080, Q4 결정). DB 레벨 `@@unique([sourceType, sourceId])` + silent skip default. 레거시 대비 운영 안전성 향상.

---

## 2. 현 rhymix-ts 코드 베이스 실측

### 2.1 Point 관련 모델 부재 확인

`packages/db/prisma/schema.prisma` 검증:
- ✗ `model Point` — 없음
- ✗ `enum PointSourceType` — 없음
- ✗ `User.pointBalance` 컬럼 — 없음
- ✓ `User.id Int @id` — Point의 memberId FK 대상 가능
- ✓ `Board` model 존재 (line 573~610) — point 정책 컬럼 추가 대상
- ✗ `Board.pointPerDocument` 등 6개 컬럼 — 없음

→ 본 SPEC Slice A 마이그레이션이 신규 추가하는 첫 SPEC. 충돌 없음.

### 2.2 신규 패키지 디렉토리 부재 확인

- ✗ `packages/point/` — 없음 (zero from scratch)
- 패키지 골조 (package.json, tsconfig.json, vitest.config.ts) 신규 작성 필요
- 참고 모델: `packages/document/` (SPEC-DOCUMENT-001가 ship한 패키지 골조) — 동일 패턴 복제

### 2.3 의존 SPEC 진행 상태

| SPEC | 본 SPEC 의존 사유 | 현재 상태 (2026-05-27 시점) |
|---|---|---|
| SPEC-AUTH-001 | Actor type, User 모델, signup 진입점 | 완료 (482 tests) |
| SPEC-ADMIN-001 | ModuleConfig 모델, admin shell RBAC | A~F 완료 |
| SPEC-DOCUMENT-001 | document.create 트랜잭션 진입점, REQ-DOC-132 이벤트 버스 stub | draft (Slice A~C 정의됨) |
| SPEC-COMMENT-001 | comment.create 트랜잭션 진입점 | 진행 중 (병행) |

→ 본 SPEC Slice A는 의존 SPEC 진행도와 무관 (단독 패키지 + 마이그레이션만). Slice B의 document/comment 통합은 두 SPEC의 createDocument/createComment 진입점 가용 시점에 wire-up. 만약 미완료라면 hook helper만 ship + 통합 시점은 의존 SPEC implementation phase로 이관 (plan.md Section 4.3 참조).

### 2.4 이벤트 버스 stub 가용성

SPEC-DOCUMENT-001 REQ-DOC-132: `document.created/updated/deleted/restored/purged` 이벤트 emit, typed event bus stub 제공. 본 SPEC의 `point.changed` 이벤트도 동일 stub 인스턴스를 재사용할 것인지, 별도 EventEmitter를 가질 것인지 선택:

- 옵션 (a) **공유 stub**: `packages/core/src/events/bus.ts` 같은 위치에 단일 EventEmitter 인스턴스 + 모든 도메인이 namespace로 사용 (`'document.created'`, `'point.changed'`)
- 옵션 (b) **도메인별 EventEmitter**: 각 패키지가 자체 EventEmitter (`pointEventBus`, `documentEventBus`)

권고: **옵션 (b) 도메인별**. 이유:
- 의존성 단순 (각 패키지가 자체 emitter export)
- 테스트 격리 용이
- Phase 4 SPEC-ADDON-001이 addon system을 도입하면 그때 통합 bus로 마이그레이션

본 SPEC Slice A는 `packages/point/src/events.ts`에 자체 `pointEventBus: EventEmitter<PointEventMap>` 정의.

---

## 3. 통합 전략 결정 사유 (Direct Injection 채택 근거)

### 3.1 두 가지 옵션 비교

**옵션 A — Direct Injection (Phase 3 채택)**:
- document/comment service가 트랜잭션 안에서 `pointHooks.onDocumentCreated(tx, ctx)` 명시 호출
- 장점: atomicity 보장 (Point row + Document row 같은 트랜잭션)
- 단점: 의존성 명시화 (document → point import)

**옵션 B — Event Bus Subscribe (Phase 4 마이그레이션 target)**:
- document service는 `document.created` emit만, point는 subscribe
- 장점: 약결합 (MASTER-PLAN-002 Section 9.1-6 결정)
- 단점: event listener는 commit 후 실행 → atomicity 깨짐. listener 실패 시 보상 트랜잭션 필요.

### 3.2 결정: Phase 3 = A, Phase 4 = A+B 병행

핵심 이유:
- 운영 안전성: 사용자가 글을 작성했는데 포인트가 부여 안 되면 운영 컴플레인. Phase 3는 신뢰성 최우선.
- MASTER-PLAN-002 Section 9.1-6 "약결합" 결정은 **장기 방향**. 단기에는 atomicity가 우선.
- Phase 4에서 SPEC-ADDON-001이 도착하면 `pointHooks`가 addon subscriber 형태로 마이그레이션. 그러나 critical path(board가 명시한 point per X)는 transactional path 유지. 약결합은 보조 보너스(예: 이벤트 기간 더블 포인트)에만 적용.

### 3.3 의존성 방향

```
@rhymix-ts/point        (no deps to other domains)
   ↑
@rhymix-ts/document  →  imports pointHooks.onDocumentCreated
@rhymix-ts/comment   →  imports pointHooks.onCommentCreated
@rhymix-ts/board     →  imports pointHooks (vote, attachment 향후)
@rhymix-ts/auth      →  imports pointHooks.onMemberSignedUp
```

`madge --circular` 체크로 회귀 가드. point는 import 받기만, 발신 없음.

---

## 4. 핵심 도출 (SPEC.md로 가져갈 것)

### 4.1 데이터 모델 — 이벤트 소싱 + 캐시

레거시: 단일 row (잔액만). → 본 SPEC: 이력 row + User.pointBalance 캐시.

장점:
- audit trail (관리자 문의 응답)
- 시간대별 분석 (운영 대시보드 — Phase 5)
- 멱등성 (sourceType + sourceId unique)
- Phase 4 레벨 시스템이 history를 기반으로 도달 시점 계산 가능

단점:
- write 부하 증가 (row insert + cache update)
- DB 크기 증가 (회원당 N rows)

→ trade-off 수용. 캐시(`User.pointBalance`)로 read 부하 최소화. `recompute` API로 캐시 손상 시 복구.

### 4.2 게시판 정책 컬럼 — Prisma column 6개

Q3 결정: JSON config 대비 Prisma column 선호.

근거:
- admin UI 폼 자동 생성 (Zod로 Board 스키마 → 폼 매핑)
- SQL 집계 용이 (어떤 게시판이 포인트를 가장 많이 부여하는가 등)
- 마이그레이션 단순 (Slice B 마이그레이션 1개)
- 컬럼 수 6개 — 적당 (10+ 되면 JSON 검토)

### 4.3 음수 허용 정책 — 사이트 단위 single source of truth

레거시는 컨트롤러 코드에 묻힌 정책 → 본 SPEC은 `sitePointConfig.clampToZero` + `allowNegativeBalance`로 명시.

trade-off:
- 사이트 단위로 통일 (board별로 다르게 적용하지 않음) → Phase 3 단순화
- 향후 board별 음수 정책이 필요해지면 `Board.allowNegativeBalance` boolean 추가 가능 (additive)

### 4.4 레벨 시스템 deferral

레거시는 addon으로 분리되어 있음 → 본 SPEC은 stub만, Phase 4 addon에서 본격 구현.

근거:
- 사이트별 정책 변동성 큼 (어떤 사이트는 100/500/1000 threshold, 어떤 사이트는 50/200/1000 ...)
- 아이콘은 시각적 자산 — content team이 변경 시 schema migration 불필요한 addon 방식 적합
- Phase 3 본 SPEC은 잔액 + 이력 + 정책 + 통합에 집중. 레벨까지 묶으면 단일 SPEC이 비대해짐 (4 slice 이상 필요).

### 4.5 멱등성 메커니즘

레거시 부재 → 본 SPEC 신규 추가.

설계:
- DB 레벨: `@@unique([sourceType, sourceId])` (sourceId NULL은 PG에서 distinct 처리되어 MANUAL 다행 허용)
- 코드 레벨: silent skip default (option a) + strict mode opt-in (option b)

이점:
- signup retry safe (REQ-POINT-071)
- document.create 폼 재제출 safe
- 운영 데이터 마이그레이션 시 idempotent 재실행 가능 (MANUAL/SYSTEM은 unique 제외이므로 추가 lookup 필요 — 마이그레이션 스크립트 책임)

### 4.6 회원가입 보너스

레거시: `config[signup_point]` → TS: `sitePointConfig.signupBonus` (number, default 0).

처리 위치: `packages/auth/src/signup.ts`의 signup 완료 트랜잭션 마지막. `onMemberSignedUp(tx, { memberId })` 호출.

idempotency: `(sourceType='SIGNUP', sourceId=newUserId)` unique → 동일 user의 signup 후처리가 N번 호출되어도 1 row만 생성.

---

## 5. 사용자가 결정해야 할 열린 질문 (재확인)

본 SPEC spec.md Section 7과 동일. 4개 모두 권고안 채택:

1. **Q1 clamp_to_zero default** — 옵션 (a) 채택. 안전 우선.
2. **Q2 레벨 시스템 deferral** — 옵션 (b) 채택. Phase 4 addon으로.
3. **Q3 정책 저장 위치** — 옵션 (a) Prisma column 채택. 6개 INT.
4. **Q4 멱등성 동작** — 옵션 (a) silent skip default + opt-in strict 채택.

위 4개 결정은 본 SPEC spec.md HISTORY에 반영되었다. 사용자가 `/moai run` 시작 전 변경을 원하면 spec.md HISTORY 업데이트 필요.

---

## 6. 위험요인 추가 분석

본 SPEC spec.md Section 6에 정리. 핵심 추가 관찰:

### 6.1 캐시 일관성 (User.pointBalance ↔ SUM(Point.amount))

핵심 회귀 위험. 완화책:
- 모든 mutation에서 `UPDATE users SET point_balance = point_balance + $delta` atomic pattern 강제 (SELECT-THEN-UPDATE 금지)
- 코드 리뷰 게이트 (Slice A acceptance gate item 7)
- `recompute(memberId)` API + 주기적 background reconciliation은 Phase 5 운영 도구로 이관 (백로그)

### 6.2 시그널 vs 노이즈 — amount=0 row 생성 여부

REQ-POINT-022는 amount=0 입력 시 no-op. 그러나 REQ-POINT-053은 clamped subtract on zero balance 시 row 생성 (audit). 모순처럼 보이나:
- REQ-POINT-022: caller가 의도적으로 0을 보낸 경우 (Board.pointPer*가 0) → no-op
- REQ-POINT-053: caller가 N을 보냈는데 clamp 결과 0이 된 경우 → row 생성 (시도 기록)

이 구분이 헷갈릴 수 있음. Slice A 구현 시 명확한 주석 + 별도 테스트 권장.

### 6.3 vote에서 author == voter인 경우

REQ-POINT-042 note: 자기 글 추천 시 no-op (caller-side guard). 그러나 잘못 호출되면 voter가 자기 자신에게 포인트 부여하는 어뷰징. 가드 위치:
- 옵션 (a) `pointHooks.onVoteCast` 내부에서 `if (voterId === authorId) return`
- 옵션 (b) vote service가 호출 전 체크

권고: **둘 다**. defense-in-depth. hook 내부 가드가 마지막 방어선.

---

## 7. 향후 SPEC과의 인터페이스

### 7.1 SPEC-FILE-001 (Phase 3 후속)

- `PointSourceType.DOWNLOAD` / `FILE_UPLOAD` enum 값 활성화
- `Board.pointPerDownload` / `pointPerFileUpload` 컬럼은 본 SPEC Slice B에서 이미 추가
- file 다운로드/업로드 트랜잭션에 `pointHooks.onFileDownloaded` / `onFileUploaded` 추가 (본 SPEC 범위 외, file SPEC implementation phase에서 추가)

### 7.2 SPEC-ADDON-001 (Phase 4)

- `pointHooks` 헬퍼가 addon subscriber 형태로 마이그레이션
- direct injection path는 유지 (transactional critical path)
- addon은 보조 보너스, 이벤트 기간 더블 포인트 등 약결합 use case
- `point.changed` 이벤트가 addon subscriber에게 전달

### 7.3 SPEC-POINT-LEVEL-001 (Phase 4, 옵션)

- 신규 `PointLevel` 모델: `id`, `threshold`, `name`, `iconUrl`, `siteId?`
- `PointService.getLevel(memberId)` stub을 실제 룩업으로 교체
- addon이 nickname 옆에 레벨 아이콘 렌더 (RSC slot)
- 본 SPEC의 `User.pointBalance` 캐시를 그대로 사용 — schema 변경 없음

### 7.4 운영 데이터 마이그레이션 SPEC (별도)

- PHP `point.point` row → TS `Point(sourceType='SYSTEM', amount=legacy, reason='migration.v1', sourceId=null)` 1 row per member
- `recompute(memberId)` 호출
- 멱등성: 마이그레이션 스크립트가 lookup-before-insert (SYSTEM sourceId=null은 unique 적용 안 됨)

---

## 8. 검증 자료 (Verified Files)

- D:\project\rhymix\modules\point\schemas\point.xml (legacy 테이블 정의 — MASTER-PLAN-002 research.md line 276 인용)
- D:\project\rhymix\modules\point\conf\module.xml (legacy 액션 정의 — research.md line 277 인용)
- D:\project\rhymix\addons\point_level_icon\point_level_icon.addon.php (레벨 시스템이 addon인 사유 — MASTER-PLAN-002 research.md line 504 인용)
- D:\project\rhymix-ts\packages\db\prisma\schema.prisma (Point/User/Board 모델 확인 — grep으로 Point 없음 확인)
- D:\project\rhymix-ts\.moai\specs\MASTER-PLAN-002\spec.md Section 5.8 (line 320~328 직접 흡수)
- D:\project\rhymix-ts\.moai\specs\MASTER-PLAN-002\research.md Section 1.8 (line 272~291 직접 인용)
- D:\project\rhymix-ts\.moai\specs\SPEC-DOCUMENT-001\spec.md (REQ-DOC-132 이벤트 버스 stub 가용성 확인)
- D:\project\rhymix-ts\.moai\specs\SPEC-DOCUMENT-001\spec.md Section 5.1 (패키지 분리 패턴 — packages/point 골조 참조 모델)

---

Version: 1.0.0
Last Verified: 2026-05-27
Key Decisions (Q1-Q4 권고안 채택, spec.md Section 7과 일치):
- Q1 clamp_to_zero default = true
- Q2 level system = Phase 4 addon defer (stub only)
- Q3 board policy = Prisma column (6 INT columns)
- Q4 idempotency = silent skip default + strict opt-in
