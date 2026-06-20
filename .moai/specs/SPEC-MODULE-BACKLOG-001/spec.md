---
id: SPEC-MODULE-BACKLOG-001
title: 미포팅 레거시 모듈 14종 평가 및 처분 (Triage)
version: 1.0.0
status: completed
created: 2026-06-20
updated: 2026-06-20
author: MoAI manager-spec
priority: P3
phase: 5+
parent: MASTER-PLAN-002
depends-on: [SPEC-ADMIN-002, SPEC-DOCUMENT-001, SPEC-COMMENT-001, SPEC-AUTH-001, SPEC-ADMIN-EXTRAS-001]
issue_number: TBD
related-research: SPEC-MODULE-BACKLOG-001/research.md
language: ko
---

# SPEC-MODULE-BACKLOG-001 — 미포팅 레거시 모듈 14종 평가 및 처분 (Phase 5+ / P3)

## HISTORY

- 2026-06-20 (v1.0.0): 최초 작성. MASTER-PLAN-002 §8.1(백로그 모듈)·§5.13(SPEC-MODULE-BACKLOG)의 위임에 따라, Phase 1~6 코어 포팅 완료 이후 남은 미포팅 레거시 PHP 모듈 14종(poll/tag/trash/rss/counter/importer/krzip/editor/session/communication/message/ncenterlite/integration_search/autoinstall)을 1차 소스(`/mnt/d/project/rhymix/modules/*`) 직접 분석으로 evaluation. 각 모듈을 KEEP(미래 SPEC 후보)·DROP(rhymix-ts 아키텍처로 대체/제외)·NEEDS-RESEARCH(선행 결정 종속)로 분류. 본 SPEC은 **triage 문서**이며 어떤 모듈의 실제 구현도 포함하지 않는다 — KEEP 항목의 구현은 각자의 후속 SPEC에서 진행한다. 근거 상세는 `research.md` 참조.

---

## 1. Overview

### 1.1 목적

본 SPEC은 **미포팅 레거시 모듈을 실제로 구현하기 위한 SPEC이 아니다**. 코어 12개 모듈 포팅(MASTER-PLAN-002 Phase 1~6, 전부 구현 완료)으로 다루지 않은 14종 레거시 모듈 각각에 대해 "rhymix-ts에 여전히 필요한가, 이미 대체되었는가, 더 조사가 필요한가"를 결정하는 **평가/처분(triage) 문서**다.

이 평가가 산출하는 것:

1. **KEEP** 모듈 → 향후 작성할 개별 SPEC 후보로 우선순위와 함께 등록.
2. **DROP** 모듈 → rhymix-ts 아키텍처(Auth.js, Next.js, Tiptap, npm)로 대체되었거나 이미 다른 SPEC에 흡수되었음을 근거와 함께 확정. 별도 포팅 SPEC을 만들지 않는다.
3. **NEEDS-RESEARCH** 모듈 → 선행 아키텍처 결정(데이터 마이그레이션, 검색 백엔드)에 종속되므로 그 결정 시점까지 보류.

### 1.2 대상 모듈 14종

poll, tag, trash, rss, counter, importer, krzip, editor, session, communication, message, ncenterlite, integration_search, autoinstall

(MASTER-PLAN-002 §8.1 원 목록에서 install→SPEC-INSTALL-001, adminlogging→흡수, advanced_mailer→SPEC-MAIL-001, spamfilter→SPEC-ADMIN-002, extravar→흡수 처리된 항목 제외 후 잔여 14종.)

### 1.3 대상 (Audience)

- manager-spec agent — KEEP 판정 모듈을 향후 개별 SPEC으로 구체화할 때 본 문서의 우선순위와 범위 경계를 입력으로 사용
- MoAI 오케스트레이터 — 본 평가 결과로 INDEX.md 백로그 섹션을 갱신하고, 사용자에게 다음 작업 후보를 제시
- 운영자/제품 결정권자 — DROP 판정의 근거를 검토하고 KEEP 우선순위를 조정

### 1.4 본 SPEC이 구현하지 않는 것

본 SPEC은 어떤 모듈도 구현하지 않는다(코드 변경 0건). KEEP 모듈의 실제 구현은 각 후속 SPEC(SPEC-POLL-WIDGET-001, SPEC-FEED-001, SPEC-MESSAGE-001, SPEC-NOTIFICATION-001 — 모두 가칭)에서 진행한다. 상세는 `## Exclusions` 참조.

---

## 2. Evaluation Result (Triage 요약)

| 모듈 | 판정 | 근거 요약 | 후속 SPEC 후보 / 우선순위 |
|---|---|---|---|
| poll | **KEEP** | 모델·관리 UI는 ADMIN-002 완료, 프론트 투표 위젯 부재 | SPEC-POLL-WIDGET-001 / P2 |
| rss | **KEEP** | 피드 라우트 전무, Next.js Route Handler로 저비용 구현 | SPEC-FEED-001 / P2 |
| communication | **KEEP** | 쪽지/친구 도메인 전무(설정 화면만 존재) | SPEC-MESSAGE-001 / P2·P3 |
| ncenterlite | **KEEP** | 인앱 알림 센터 전무(flag만 존재) | SPEC-NOTIFICATION-001 / P2 |
| tag | **DROP** | 인라인 `String[]`+GIN+설정으로 충분(정규화 모듈 불요) | (선택) 태그 페이지 위젯 / P3 |
| trash | **DROP** | 도메인별 soft-delete+`/admin/trash`가 아키텍처 표준 | (선택) 댓글 휴지통 / P3 |
| importer | **NEEDS-RESEARCH** | 운영 데이터 이전 SPEC(MASTER-PLAN §8.4)에 종속 | SPEC-MIGRATION-001 종속 / P3 |
| integration_search | **NEEDS-RESEARCH** | 검색 백엔드 결정(FTS vs Meilisearch) 선행 필요 | SPEC-SEARCH-001 / P3 |
| counter | **DROP** | DailyVisit+`/admin/stats`로 ADMIN-002에서 완결 | (구현 완료) |
| editor | **DROP** | Tiptap이 WYSIWYG 책임 대체 | (대체됨) |
| session | **DROP** | Auth.js v5가 세션 관리 전면 대체 | (대체됨) |
| message | **DROP** | Next.js error.tsx/not-found.tsx로 대체(회원 쪽지 아님) | (대체됨) |
| krzip | **DROP** | 코어 기능 아님, 외부 우편번호 컴포넌트로 충분 | (불필요) |
| autoinstall | **DROP** | ADMIN-002에서 영구 제외 확정(npm 아키텍처 비양립) | (영구 제외) |

집계: **KEEP 4 / DROP 8 / NEEDS-RESEARCH 2**.

근거 상세는 `research.md` §1(모듈별 분석)·§2(요약 표) 참조.

---

## 3. Requirements (EARS Format)

REQ ID는 `REQ-MODBL-XXX`. 본 SPEC의 요구사항은 (1) 평가 산출물의 완결성 조건과 (2) KEEP 판정 모듈이 향후 SPEC으로 분리될 때 지켜야 할 범위 경계를 기술한다. 구현 요구가 아니라 **평가·게이트 요구**임에 유의.

### 3.A 평가 완결성

**REQ-MODBL-001** (Ubiquitous) — *P3*: The triage SHALL classify each of the 14 candidate modules into exactly one of {KEEP, DROP, NEEDS-RESEARCH} with a recorded rationale grounded in legacy source inspection (`/mnt/d/project/rhymix/modules/*`) and rhymix-ts code comparison.

**REQ-MODBL-002** (Ubiquitous) — *P3*: For every KEEP module, the triage SHALL record a proposed follow-up SPEC name and a priority label (P1/P2/P3) WITHOUT specifying implementation details (no schema, function, or API design — deferred to the follow-up SPEC).

**REQ-MODBL-003** (Unwanted) — *P3*: The triage SHALL NOT re-specify or re-implement any responsibility already delivered by a completed SPEC; where a candidate module's responsibility is already covered (counter, poll-admin, tag-config, document-trash), the module SHALL be marked DROP or its KEEP scope SHALL be narrowed to the uncovered surface only.

**REQ-MODBL-004** (State-Driven) — *P3*: WHILE a candidate module's correct disposition depends on an unresolved upstream architecture decision (data migration strategy, search backend selection), the module SHALL be marked NEEDS-RESEARCH and SHALL NOT be promoted to a standalone follow-up SPEC until that decision is made.

### 3.B KEEP 모듈 범위 경계 (후속 SPEC 작성 시 게이트)

**REQ-MODBL-010** (Event-Driven) — *P2*: WHEN SPEC-POLL-WIDGET-001 (poll, 가칭) is authored, it SHALL scope to the **frontend voting surface and vote transaction only** (public poll render, vote submission, duplicate-vote prevention, result display), reusing the existing `Poll`/`PollOption`/`PollVote` models and the admin UI delivered in SPEC-ADMIN-002 Slice 3A WITHOUT re-implementing them.

**REQ-MODBL-011** (Event-Driven) — *P2*: WHEN SPEC-FEED-001 (rss, 가칭) is authored, it SHALL deliver per-board RSS 2.0 and Atom 1.0 feeds as Next.js Route Handlers (e.g. `app/board/[mid]/rss/route.ts`), excluding secret/non-public documents, WITHOUT introducing a separate runtime module-installer mechanism.

**REQ-MODBL-012** (Event-Driven) — *P2*: WHEN SPEC-MESSAGE-001 (communication, 가칭) is authored, it SHALL deliver member-to-member private messaging (inbox/outbox/compose/delete) backed by new domain models, and MAY split the friend/friend-group feature into a P3 follow-up; the messaging-settings screen already delivered by SPEC-ADMIN-002 REQ-ADMIN2-143 SHALL be reused, not rebuilt.

**REQ-MODBL-013** (Event-Driven) — *P2*: WHEN SPEC-NOTIFICATION-001 (ncenterlite, 가칭) is authored, it SHALL deliver an in-app notification center (notification creation on new comment/mention/message, list, mark-as-read, per-user notification preferences, unsubscribe), and IF private messaging exists THEN message-arrival SHALL be one of the notification triggers.

### 3.C DROP 모듈 확정 (재평가 차단)

**REQ-MODBL-020** (Unwanted) — *P3*: The DROP modules (counter, editor, session, message, krzip, autoinstall, plus tag-independence and trash-independence) SHALL NOT receive standalone porting SPECs; each is either already delivered by a completed SPEC or superseded by a framework/library primitive (Auth.js, Next.js error boundaries, Tiptap, npm packaging) as recorded in `research.md` §1.

**REQ-MODBL-021** (Optional) — *P3*: Where a small user-visible gap remains inside a DROP module's domain (public tag-cloud / tag-listing page for tag; comment trash/restore for trash), the gap MAY be addressed as a minor item appended to an adjacent domain SPEC, but SHALL NOT justify reviving the legacy module as an independent package.

---

## 4. Disposition Detail (모듈별 처분 근거)

> 각 항목의 1차 소스 분석은 `research.md` §1에 있다. 본 절은 처분 결정만 요약한다.

### 4.1 KEEP (4)

- **poll** → SPEC-POLL-WIDGET-001 (P2). `Poll`/`PollOption`/`PollVote` 모델과 ADMIN-002 관리 UI는 완료. 갭은 공개 투표 위젯 + 투표 트랜잭션뿐. 범위 경계는 REQ-MODBL-010.
- **rss** → SPEC-FEED-001 (P2). 피드 라우트 전무. Next.js Route Handler로 게시판별 RSS/Atom. 범위 경계는 REQ-MODBL-011.
- **communication** → SPEC-MESSAGE-001 (P2 쪽지 / P3 친구). 메시징 도메인 전무. ADMIN-002 REQ-143은 설정 화면만 추가했음. 범위 경계는 REQ-MODBL-012.
- **ncenterlite** → SPEC-NOTIFICATION-001 (P2). 인앱 알림 센터 전무(`notifyMessage` flag만). communication과 약결합. 범위 경계는 REQ-MODBL-013.

### 4.2 DROP (8)

- **counter** — DailyVisit + `/admin/stats` + 대시보드 위젯으로 SPEC-ADMIN-002에서 완결(REQ-ADMIN2-140~142, 001/009).
- **tag** (독립화) — `document.tags String[]` + GIN + 태그 설정(REQ-ADMIN2-087/156)으로 충분. 정규화 모듈 불요.
- **trash** (독립화) — 문서 soft-delete + `/admin/trash`(SPEC-DOCUMENT-001)가 표준. 범용 직렬화 휴지통은 도메인-우선 설계와 배치.
- **editor** — Tiptap(`packages/board/src/components/TiptapEditor.tsx`)이 WYSIWYG 대체. 임시저장은 `DocumentStatus.TEMP`로 흡수.
- **session** — Auth.js v5 + `SessionRevocation`/`AutoLogin`/`MemberDevice`(SPEC-AUTH-001)로 전면 대체.
- **message** — 시스템 오류 표시 모듈(회원 쪽지 아님). Next.js `error.tsx`/`not-found.tsx`/`global-error.tsx`로 대체.
- **krzip** — 한국 우편번호 검색. 코어 CMS 기능 아님. 필요 시 가입 양식에 외부 우편번호 컴포넌트 부착.
- **autoinstall** — 원격 마켓 런타임 설치. SPEC-ADMIN-002에서 영구 제외 확정. npm/빌드타임 아키텍처와 비양립.

### 4.3 NEEDS-RESEARCH (2)

- **importer** — XML/타 CMS 데이터 import. MASTER-PLAN-002 §8.4 "운영 데이터 마이그레이션 별도 SPEC"에 종속. SPEC-MIGRATION-001 착수 시 함께 결정. P3.
- **integration_search** — 게시판 횡단 통합 검색. 문서 단위 FTS는 존재하나, 검색 백엔드(PostgreSQL FTS 확장 vs Meilisearch, MASTER-PLAN §6.3 유보)를 선행 결정해야 함. SPEC-SEARCH-001은 그 결정 이후 착수. P3.

---

## 5. Expert Consultation Recommendations

본 평가의 KEEP 항목을 후속 SPEC으로 구체화할 때 권장되는 전문가 검토:

- **expert-backend** — SPEC-MESSAGE-001(쪽지 도메인 모델·트랜잭션), SPEC-NOTIFICATION-001(알림 생성 트리거·팬아웃), SPEC-POLL-WIDGET-001(투표 중복 방지)
- **expert-frontend** — SPEC-NOTIFICATION-001(알림 드롭다운/벨 UI), SPEC-MESSAGE-001(편지함 UI)
- **expert-security** — SPEC-MESSAGE-001(쪽지 권한·스팸/도배 가드 — SPEC-ADMIN-002 스팸필터 재사용), SPEC-FEED-001(비밀글 노출 차단)
- **expert-performance** — SPEC-FEED-001(피드 캐싱), SPEC-SEARCH-001(통합 검색 백엔드 평가)

본 triage SPEC 자체는 코드를 생산하지 않으므로 전문가 호출이 필요 없다.

---

## Exclusions (What NOT to Build)

[HARD] 본 SPEC은 다음을 **구현하지 않는다**. 본 SPEC은 평가 문서이며 코드 변경이 없다.

1. **KEEP 모듈의 실제 구현** — poll 위젯, rss 피드, 쪽지, 알림 센터의 코드는 본 SPEC에 포함되지 않는다. 각 후속 SPEC(SPEC-POLL-WIDGET-001 / SPEC-FEED-001 / SPEC-MESSAGE-001 / SPEC-NOTIFICATION-001, 모두 가칭)에서 별도 작성·구현한다.
2. **DROP 모듈의 포팅** — counter, editor, session, message, krzip, autoinstall, 그리고 tag/trash의 독립 모듈화는 포팅하지 않는다(REQ-MODBL-020). 각각 이미 완료된 SPEC 또는 프레임워크 기본 기능으로 대체되었다.
3. **이미 완료된 책임의 재구현** — SPEC-ADMIN-002의 설문 관리 UI·태그 설정·통계, SPEC-DOCUMENT-001의 문서 휴지통, SPEC-AUTH-001의 세션, SPEC-MAIL-001의 메일은 재구현하지 않는다.
4. **NEEDS-RESEARCH 모듈의 선행 결정** — 데이터 마이그레이션 전략(importer)과 검색 백엔드 선택(integration_search)은 본 SPEC에서 결정하지 않는다. 각각 SPEC-MIGRATION-001·SPEC-SEARCH-001(가칭)에서 다룬다.
5. **autoinstall(쉬운 설치) 재평가** — SPEC-ADMIN-002에서 영구 제외 확정된 사항이므로 본 SPEC에서도 재론하지 않는다.

---

## Open Questions

- Q1. KEEP 4종의 상대 우선순위 — 사용자 가시 가치 기준으로는 rss(저비용·외부 구독자 가치) → ncenterlite(참여 유도) → communication(커뮤니티) → poll-widget(콘텐츠 보조) 순을 잠정 권고하나, 제품 우선순위는 운영 결정 사항.
- Q2. communication의 친구(friend/friend-group) 기능을 SPEC-MESSAGE-001에 포함할지, 별도 P3 SPEC으로 분리할지 — 쪽지만 먼저 출시하고 친구는 후순위로 분리하는 안을 잠정 권고.
- Q3. integration_search를 기존 PostgreSQL FTS 확장으로 충분히 커버할 수 있는지(Meilisearch 불요) — SPEC-SEARCH-001 착수 시 PoC로 판단 필요.
- Q4. tag 클라우드 페이지·댓글 휴지통 같은 소규모 잔여 갭(REQ-MODBL-021)을 인접 도메인 SPEC에 부록으로 붙일지, 아니면 백로그로 영구 보류할지 — 사용자 수요 발생 시 결정.

---

## Implementation Notes

본 SPEC은 평가(triage) 문서로, 구현 작업이 없다. 코드 변경 0건.

### 평가 방법 및 신뢰도

- 레거시 코드베이스가 이 환경에서 `/mnt/d/project/rhymix/modules/`로 직접 접근 가능하여, 14종 모두 1차 소스(info.xml/module.xml action 인벤토리/schemas)를 직접 확인했다. MASTER-PLAN-002/research.md의 간접 기술에 의존하지 않았다 — **연구 갭 없음**.
- rhymix-ts 현재 상태는 `packages/db/prisma/schema.prisma` 모델/enum 인벤토리와 `apps/web/app/admin/`·`packages/*/src` grep으로 교차 확인했다.
- 판정이 "이미 구현됨"인 모듈(counter, poll-admin, tag-config, trash-document)은 해당 완료 SPEC의 REQ ID를 근거로 명시하여 중복 제안을 차단했다(REQ-MODBL-003).

### 사용자 확인이 필요한 판단 (flagged, 본 SPEC 범위 내에서 best-judgment로 진행)

본 에이전트는 subagent로서 사용자에게 직접 질의할 수 없어, 다음 모호 지점은 best-judgment로 처리하고 Open Questions에 명시했다:

1. **poll 판정** — 모델·관리 UI가 이미 있어 "DROP(이미 구현)"으로 볼 여지가 있으나, 공개 투표라는 핵심 사용자 동작이 미구현이므로 **KEEP(범위를 프론트 위젯으로 한정)**으로 판정했다. 근거: 관리자가 설문을 만들어도 회원이 투표할 수 없으면 기능이 미완이다.
2. **message 모듈 혼동 방지** — 레거시 `message`는 회원 쪽지가 아니라 시스템 오류 표시 모듈이다. 회원 쪽지는 `communication`이다. 이름 유사성으로 인한 오분류를 피하기 위해 둘을 명시적으로 분리했다.
3. **tag/trash "독립화"** — MASTER-PLAN §8.1이 "tag/trash 독립화"를 후보로 적었으나, rhymix-ts의 인라인 태그 배열 + 도메인별 soft-delete가 이미 표준 아키텍처이므로 독립 모듈화는 **DROP**으로 판정했다. 잔여 소규모 갭(태그 페이지·댓글 휴지통)은 REQ-MODBL-021로 인접 SPEC 부록 처리 가능성만 열어 두었다.

### 후속 작업

- INDEX.md 백로그/다음 단계 섹션에 본 SPEC과 KEEP 4종 후속 SPEC 후보를 등록한다(본 작업에서 수행).
- KEEP 항목 착수 시 `/moai plan SPEC-POLL-WIDGET-001` 등으로 manager-spec에 위임하며, 본 SPEC §3.B의 범위 경계 REQ(REQ-MODBL-010~013)를 입력 제약으로 사용한다.

---

Version: 1.0.0
Status: completed (평가 문서 — 구현 작업 없음)
Next Action: KEEP 4종(poll-widget / feed / message / notification) 중 우선순위 선택 후 개별 `/moai plan` 호출
