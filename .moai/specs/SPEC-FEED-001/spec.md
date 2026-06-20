---
id: SPEC-FEED-001
title: 게시판별 RSS 2.0 / Atom 1.0 피드 (Feed Output)
version: 1.0.0
status: draft
created: 2026-06-20
updated: 2026-06-20
author: MoAI manager-spec
priority: P2
phase: 7
parent: SPEC-MODULE-BACKLOG-001
depends-on: [SPEC-BOARD-CRUD-001, SPEC-DOCUMENT-001, SPEC-COMMENT-001]
issue_number: TBD
related-research: SPEC-FEED-001/research.md
language: ko
---

# SPEC-FEED-001 — 게시판별 RSS 2.0 / Atom 1.0 피드 (Phase 7 / P2)

## HISTORY

- 2026-06-20 (v1.0.0): 최초 작성. SPEC-MODULE-BACKLOG-001(triage) §1.4가 KEEP으로 분류한 레거시 `rss` 모듈의 후속 구현 SPEC. triage REQ-MODBL-011("WHEN SPEC-FEED-001 is authored, it SHALL deliver per-board RSS 2.0 and Atom 1.0 feeds as Next.js Route Handlers ... excluding secret/non-public documents, WITHOUT introducing a separate runtime module-installer mechanism")의 범위 경계를 입력 제약으로 사용. 레거시 `/mnt/d/project/rhymix/modules/rss/` 1차 소스(`rss.view.php`, `tpl/format/rss20.html`·`atom10.html`, `rss.admin.controller.php`)를 직접 분석하여 RSS 2.0 / Atom 1.0 필드 매핑과 관리 설정 옵션을 확정. 게시판별(part) 피드만 다루며 사이트 통합 피드·팟캐스트·WebSub는 명시적 제외. 근거 상세는 `research.md` 참조. status: draft — 평가 전용이던 parent와 달리 본 SPEC은 구현 대기 신규 SPEC.

---

## 1. Goal & Audience

### 1.1 Goal

**게시판(board 타입 모듈 인스턴스)을 방문하는 외부 구독자가 표준 RSS 2.0 / Atom 1.0 피드를 구독할 수 있다**를 달성한다. 즉:

- `GET /{mid}/rss` 는 해당 게시판의 RSS 2.0 피드를, `GET /{mid}/atom` 는 Atom 1.0 피드를 `text/xml`(또는 포맷별 정확한 MIME)로 출력한다.
- 피드 항목은 게시판의 공개(PUBLIC) 문서를 최신순으로 담으며, 비밀글·임시저장·삭제글·비공개 게시판은 노출하지 않는다.
- 운영자는 게시판별로 피드 활성/비활성, 항목 수, 본문 전체 vs 발췌, 피드 설명/이미지/저작권을 board admin에서 설정할 수 있다.
- 피드는 매 요청마다 DB를 치지 않도록 라우트 레벨 캐싱 + 문서 이벤트 기반 무효화로 신선도와 부하를 함께 관리한다.
- 게시판 목록/상세 페이지 `<head>` 에 피드 자동탐색(`<link rel="alternate">`) 링크를 노출한다.

### 1.2 Audience

- expert-frontend / expert-backend agent — Route Handler(`app/[mid]/rss/route.ts`, `app/[mid]/atom/route.ts`) + 피드 빌더 서비스 구현
- expert-performance agent — 캐싱 전략(revalidate + Cache-Control + tag 무효화) 검토
- expert-security agent — 비밀글/비공개 게시판 노출 차단, XML 이스케이핑(엔티티 인젝션) 검토
- 운영자 — 게시판별 피드 설정 + 외부 피드 리더(Feedly 등)로 구독 검증
- 외부 구독자 — 표준 피드 리더로 게시판을 구독하는 최종 사용자

### 1.3 Non-Goals (본 SPEC 범위 외)

- 사이트 전역 통합 피드(레거시 `use_total_feed`) — §`## Exclusions` 참조. 게시판 횡단 관심사(SPEC-MODULE-BACKLOG-001 §1.13 integration_search)와 겹치므로 분리.
- RSS 1.0 / XE 호환 포맷 — 레거시 잔재, 영구 제외.
- 팟캐스트/미디어 RSS 확장(`<enclosure>`, iTunes 네임스페이스) — 레거시 미보유, 제외.
- WebSub / PubSubHubbub 실시간 푸시 — 레거시 미보유, 제외.
- 피드 이미지 파일 업로드(SPEC-FILE-001 통합) — URL 입력만 지원. 업로드 통합은 백로그.
- 댓글 전용 피드(comment-only feed) — 백로그. 본 SPEC은 문서 피드만.

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. REQ ID는 `REQ-FEED-NNN`. 7개 계층으로 그룹화.

### 2.1 라우트 & 포맷 계층 (REQ-FEED-001 ~ 009)

**REQ-FEED-001 (Ubiquitous)**: The Feed system SHALL expose two Next.js Route Handlers: `apps/web/app/[mid]/rss/route.ts` (RSS 2.0) and `apps/web/app/[mid]/atom/route.ts` (Atom 1.0). Each SHALL export an async `GET` handler returning a `Response` with the feed XML body. (라우트 구조 판단 근거는 Implementation Notes Q1.)

**REQ-FEED-002 (Event-Driven)**: WHEN `GET /{mid}/rss` is requested AND the resolved `ModuleInstance.moduleCode === 'board'` AND the board feed is enabled, the Feed system SHALL respond `200` with `Content-Type: application/rss+xml; charset=utf-8` and a valid RSS 2.0 document.

**REQ-FEED-003 (Event-Driven)**: WHEN `GET /{mid}/atom` is requested under the same conditions as REQ-FEED-002, the Feed system SHALL respond `200` with `Content-Type: application/atom+xml; charset=utf-8` and a valid Atom 1.0 document.

**REQ-FEED-004 (Event-Driven)**: WHEN a feed route resolves the request, the system SHALL determine `siteId` from the `x-site-id` header and resolve the module instance via `getModuleInstanceByMid(siteId, mid, { prisma })`, consistent with `apps/web/app/[mid]/page.tsx`. IF the instance does not exist, THEN the system SHALL respond `404`.

**REQ-FEED-005 (Unwanted)**: The Feed system SHALL NOT emit RSS 1.0, XE-compatible, podcast/media-RSS, or any format other than RSS 2.0 and Atom 1.0. Requests for unsupported formats SHALL NOT be routed (no `?format=` negotiation surface is exposed).

**REQ-FEED-006 (Ubiquitous)**: The RSS 2.0 and Atom 1.0 output SHALL be produced by a single shared feed-builder service (e.g. `packages/board/src/feed/build-feed.ts`) that accepts `{ format: 'rss' | 'atom', instance, board, feedConfig, documents, baseUrl }` and returns a serialized XML string. The two route handlers SHALL differ only in the `format` argument and `Content-Type`.

**REQ-FEED-007 (Event-Driven)**: WHEN the board list route (`app/[mid]/page.tsx`) and detail route render for a feed-enabled board, the system SHALL include feed autodiscovery links in the document head: `<link rel="alternate" type="application/rss+xml" href="/{mid}/rss">` and `<link rel="alternate" type="application/atom+xml" href="/{mid}/atom">`.

### 2.2 피드 항목 필드 매핑 계층 (REQ-FEED-010 ~ 019)

**REQ-FEED-010 (Ubiquitous)**: For RSS 2.0, the Feed system SHALL map each document to an `<item>` with: `<title>` = `document.title`, `<link>` = canonical document URL, `<guid isPermaLink="true">` = canonical document URL, `<pubDate>` = `document.regdate` in RFC-822, `<dc:creator>` = author nickname, `<description>` = full content or excerpt (REQ-FEED-014). (레거시 `tpl/format/rss20.html` 매핑.)

**REQ-FEED-011 (Ubiquitous)**: For Atom 1.0, the Feed system SHALL map each document to an `<entry>` with: `<title>` = `document.title`, `<link rel="alternate">` = canonical document URL, `<id>` = canonical document URL, `<published>` = `document.regdate` in RFC-3339, `<updated>` = `document.lastUpdate` in RFC-3339, `<author><name>` = author nickname, `<summary type="text">` = excerpt, and `<content type="html">` = full content ONLY WHEN `feedConfig.fullContent === true`. (레거시 `tpl/format/atom10.html` 매핑.)

**REQ-FEED-012 (Ubiquitous)**: The canonical document URL SHALL be `{baseUrl}/{mid}/{document.id}` (absolute, including scheme + host derived from the request), consistent with the board detail route `/{mid}/{documentId}` (`packages/board/src/routes/index-page.tsx`).

**REQ-FEED-013 (Ubiquitous)**: The author nickname SHALL resolve to `document.author?.nickName ?? document.nickName ?? '익명'` (member nickname preferred, guest nickname fallback, anonymous default). `getDocument`/`listDocuments` already include the `author` relation.

**REQ-FEED-014 (State-Driven)**: WHILE `feedConfig.fullContent === true`, the RSS `<description>` and Atom `<content>` SHALL contain the document's sanitized full `content`. WHILE `feedConfig.fullContent === false`, the RSS `<description>` and Atom `<summary>` SHALL contain an excerpt derived from `document.contentText` truncated to `feedConfig.excerptLength` (default 400, matching legacy `getSummary(400)`).

**REQ-FEED-015 (Ubiquitous)**: The Feed system SHALL include category metadata per item: the board name and, where present, the document's category title and each entry in `document.tags[]` as `<category>` (RSS) / `<category term="...">` (Atom).

**REQ-FEED-016 (Event-Driven)**: WHEN a document has `commentCount > 0` AND comments are allowed on the board, the RSS item SHALL include `<comments>{url}#comment</comments>` and the Atom entry SHALL include `<link rel="replies" href="{url}#comment">`. (`commentCount` is owned by SPEC-DOCUMENT-001 / mutated by SPEC-COMMENT-001.)

**REQ-FEED-017 (Unwanted)**: The Feed system SHALL NOT emit unescaped user-supplied text into the XML. All title, content, excerpt, nickname, and category values SHALL be XML-escaped (or CDATA-wrapped for HTML content) such that no document content can break the feed document structure or inject entities.

**REQ-FEED-018 (Ubiquitous)**: The channel/feed-level metadata SHALL map as: `title` = `instance.browserTitle ?? board.name`, `link` = `{baseUrl}/{mid}`, `description` = `feedConfig.description ?? board.description ?? ''`, `language` = the site default language code, `copyright`/`rights` = `feedConfig.copyright` (when set), `image` = `feedConfig.imageUrl` (when set). For Atom, `<updated>` SHALL be the most recent document `lastUpdate` (or now() when empty).

### 2.3 데이터 소스 & 정렬 계층 (REQ-FEED-020 ~ 029)

**REQ-FEED-020 (Event-Driven)**: WHEN building a feed, the system SHALL fetch documents via `listDocuments({ moduleInstanceId: instance.id, status: 'PUBLIC', limit: feedConfig.itemCount }, { prisma })` from `@rhymix-ts/document`, consuming the existing `items` array. The Feed system SHALL NOT re-implement document querying.

**REQ-FEED-021 (Ubiquitous)**: Feed items SHALL be ordered newest-first. The system SHALL use the `listDocuments` default ordering (`listOrder DESC`, which tracks `regdate` newest-first per the document model), matching the legacy `regdate DESC` intent.

**REQ-FEED-022 (Ubiquitous)**: The number of items SHALL be bounded by `feedConfig.itemCount` (default 20, range 1..1000 matching legacy `feed_document_count`). WHERE `feedConfig.itemCount` is unset, the system SHALL fall back to `board.listCount`.

**REQ-FEED-023 (Unwanted)**: The Feed system SHALL NOT include pinned-notice deduplication logic beyond what `listDocuments` returns; notices MAY appear in the feed as ordinary items. (피드는 공지 고정 UI 개념이 없음 — 레거시도 동일.)

### 2.4 권한 & 가시성 계층 (REQ-FEED-030 ~ 039)

**REQ-FEED-030 (Unwanted)**: The Feed system SHALL NOT include any document whose `status !== 'PUBLIC'`. SECRET(비밀글) and TEMP(임시저장) documents SHALL be excluded. This is satisfied by the `status: 'PUBLIC'` filter in `listDocuments` and SHALL be asserted by test. (레거시 `search_target='is_secret', search_keyword='N'` 등가.)

**REQ-FEED-031 (Unwanted)**: The Feed system SHALL NOT include soft-deleted documents (`deletedAt IS NOT NULL`). This is satisfied by `listDocuments`' `deletedAt IS NULL` filter and SHALL be asserted by test.

**REQ-FEED-032 (State-Driven)**: WHILE the board's permission matrix does NOT grant `list` AND `view` to the guest (unauthenticated) member group, the Feed system SHALL treat the board as non-public and SHALL respond `403` (or `404` to avoid existence disclosure — see Implementation Notes Q5) WITHOUT emitting any document data. The feed is anonymous output; only content a guest could read SHALL appear.

**REQ-FEED-033 (State-Driven)**: WHILE `feedConfig.enabled === false`, the Feed system SHALL respond `404` for both `/{mid}/rss` and `/{mid}/atom` and SHALL NOT render autodiscovery links (REQ-FEED-007).

**REQ-FEED-034 (Unwanted)**: The Feed system SHALL NOT expose `document.password`, `document.ipAddress`, `author.email`, or any non-public field in feed output. Only the fields enumerated in REQ-FEED-010/011 SHALL appear.

### 2.5 캐싱 & 성능 계층 (REQ-FEED-040 ~ 049)

**REQ-FEED-040 (Ubiquitous)**: The Feed route handlers SHALL be cached at the route level using Next.js segment caching (`export const revalidate = 300`, i.e. 5 minutes) so that repeated requests within the window do not hit the database. (TTL 판단 근거는 Implementation Notes Q2.)

**REQ-FEED-041 (Ubiquitous)**: The Feed response SHALL include a `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` header so that CDNs / reverse proxies / aggregators cache and revalidate the feed without per-request origin load.

**REQ-FEED-042 (Event-Driven)**: WHEN a document in a board is created, updated, or deleted, the system SHALL invalidate that board's feed cache via `revalidateTag('feed:' + instance.id)`, subscribing to the existing document event bus (`emitDocumentCreated/Updated/Deleted` in `packages/document/src/events.ts`). Each feed response's cached data SHALL be associated with that tag.

**REQ-FEED-043 (Unwanted)**: The Feed system SHALL NOT perform N+1 queries per item. Author, category, and tag data SHALL come from the single `listDocuments` fetch (which includes the `author` relation) plus at most one category lookup batched for the page.

### 2.6 관리 설정 & 저장 계층 (REQ-FEED-050 ~ 059)

**REQ-FEED-050 (Ubiquitous)**: The Feed system SHALL persist per-board feed settings in an additive `Board.feedConfig Json @default("{}")` column, validated by a Zod schema `boardFeedConfigSchema` with fields: `enabled: boolean (default false)`, `itemCount: number (1..1000, default 20)`, `fullContent: boolean (default false)`, `excerptLength: number (default 400)`, `description: string? `, `imageUrl: string?  (URL)`, `copyright: string?`. (저장 위치 판단 근거는 Implementation Notes Q3. 마이그레이션은 additive only — 기존 컬럼 변경 금지.)

**REQ-FEED-051 (Ubiquitous)**: The Feed admin settings SHALL be delivered as a panel within the existing board admin space (e.g. `apps/web/app/admin/boards/[mid]/feed/page.tsx`), NOT as a new top-level admin section. It SHALL reuse the board admin shell from SPEC-BOARD-CRUD-001 Slice C.

**REQ-FEED-052 (Event-Driven)**: WHEN an admin saves the feed settings, the system SHALL persist the validated `boardFeedConfigSchema` payload to `Board.feedConfig` within a transaction, and SHALL invalidate the board's feed cache tag (REQ-FEED-042).

**REQ-FEED-053 (Unwanted)**: The Feed admin SHALL NOT be accessible to non-admins. IF a non-admin requests the feed settings page, THEN the system SHALL redirect to `/login` or return a 403-equivalent, consistent with the SPEC-ADMIN-001 admin guard.

**REQ-FEED-054 (State-Driven)**: WHILE `feedConfig.fullContent === true`, the admin UI SHALL hide/disable the `excerptLength` input (irrelevant when full content is emitted), and WHILE `false`, the `excerptLength` input SHALL be active with default 400.

### 2.7 품질 계층 (REQ-FEED-060 ~ 069)

**REQ-FEED-060 (Ubiquitous)**: All new files SHALL have unit tests using Vitest. Coverage for new code SHALL be at least 80%.

**REQ-FEED-061 (Ubiquitous)**: The feed-builder SHALL have tests asserting valid well-formed XML output for both formats (parseable by an XML parser), correct field mapping (title/link/guid/pubDate/author), and correct excerpt-vs-full-content switching (REQ-FEED-014).

**REQ-FEED-062 (Ubiquitous)**: There SHALL be at least one security/visibility test asserting that a SECRET document and a TEMP document do NOT appear in feed output (REQ-FEED-030), and that a feed-disabled or guest-restricted board returns 404/403 (REQ-FEED-032/033).

**REQ-FEED-063 (Ubiquitous)**: There SHALL be at least one escaping test asserting that a document title/content containing `<`, `>`, `&`, `]]>`, and a raw XML entity is safely escaped/CDATA-wrapped and does not break feed well-formedness (REQ-FEED-017).

**REQ-FEED-064 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL produce 0 type errors across all modified packages (`packages/board`, `packages/document`, `apps/web`).

**REQ-FEED-065 (Ubiquitous)**: All new code SHALL respect language settings: code comments in Korean (per `.moai/config/sections/language.yaml` `code_comments: ko`), strings/identifiers/feed element names in English.

**REQ-FEED-066 (Ubiquitous)**: There SHALL be at least one e2e test: seed a board with feed enabled + 3 public documents + 1 secret document → `GET /{mid}/rss` → assert 200 + `application/rss+xml` + exactly 3 `<item>` elements + secret document title absent.

---

## 3. Slices

본 SPEC은 3개 슬라이스로 분해된다. 각 슬라이스는 독립적으로 implementable + reviewable + testable.

### Slice A: 피드 빌더 + 라우트 핸들러 (핵심 출력)

종속성: SPEC-DOCUMENT-001(`listDocuments`/`getDocument`), SPEC-BOARD-CRUD-001(board 라우팅) 완료(모두 ✅).

작업 항목:

1. `Board.feedConfig Json @default("{}")` additive 마이그레이션 + `boardFeedConfigSchema` Zod 스키마 (`packages/board/src/feed/config.ts`).
2. 피드 빌더 서비스 `packages/board/src/feed/build-feed.ts` — `{ format, instance, board, feedConfig, documents, baseUrl }` → XML 문자열. RSS 2.0 / Atom 1.0 직렬화 + XML 이스케이프/CDATA.
3. Route Handler 2개: `apps/web/app/[mid]/rss/route.ts`, `apps/web/app/[mid]/atom/route.ts` — 인스턴스 조회 → feedConfig 게이트 → `listDocuments` → 빌더 호출 → `Response`.
4. 권한/가시성 게이트: PUBLIC-only(REQ-FEED-030/031), 게스트 read 게이트(REQ-FEED-032), enabled 게이트(REQ-FEED-033).
5. 단위 테스트: XML well-formed, 필드 매핑, full-vs-excerpt, 비밀글/임시저장 제외, 이스케이프.

검증: `pnpm test packages/board` 통과 / `pnpm tsc --noEmit` 0 error / 두 라우트가 유효 피드 반환.

EARS coverage: REQ-FEED-001~006, 010~018, 020~023, 030~034, 050, 060~065.

### Slice B: 캐싱 + 자동탐색 + 이벤트 무효화

종속성: Slice A 완료.

작업 항목:

1. `export const revalidate = 300` + `Cache-Control` 헤더(REQ-FEED-040/041).
2. 피드 캐시 tag(`feed:{instanceId}`) + 문서 이벤트(`events.ts`) 구독 → `revalidateTag`(REQ-FEED-042).
3. board 목록/상세 라우트 head에 autodiscovery `<link rel="alternate">`(REQ-FEED-007).
4. N+1 방지 검증(REQ-FEED-043).
5. e2e 테스트(REQ-FEED-066).

검증: 새 글 작성 후 피드가 무효화되어 즉시 반영 / e2e 통과.

EARS coverage: REQ-FEED-007, 040~043, 066.

### Slice C: 관리 설정 패널

종속성: Slice A 완료(Slice B와 병행 가능).

작업 항목:

1. `apps/web/app/admin/boards/[mid]/feed/page.tsx` — board admin 셸 확장 설정 패널(enabled/itemCount/fullContent/excerptLength/description/imageUrl/copyright).
2. save action → `Board.feedConfig` 트랜잭션 저장 + 캐시 tag 무효화(REQ-FEED-052).
3. admin 가드(REQ-FEED-053), fullContent 토글 시 excerptLength 비활성(REQ-FEED-054).
4. 단위 테스트: 설정 저장/검증, admin 가드.

검증: 설정 저장 → 피드 출력에 즉시 반영(캐시 무효화 동작).

EARS coverage: REQ-FEED-051~054.

---

## 4. Acceptance Criteria (요약)

핵심 6개 (Given-When-Then):

1. **AC-FEED-A1**: GIVEN feedConfig.enabled=true 인 board(mid=`notice`)에 PUBLIC 문서 3개 + SECRET 1개 시드, WHEN `GET /notice/rss`, THEN 200 + `application/rss+xml` + 정확히 3개 `<item>` + 비밀글 제목 부재 + XML well-formed.
2. **AC-FEED-A2**: GIVEN 동일 board, WHEN `GET /notice/atom`, THEN 200 + `application/atom+xml` + 각 `<entry>` 에 `<published>`(RFC-3339)·`<id>`(canonical url)·`<author><name>` 존재.
3. **AC-FEED-A3 (full vs excerpt)**: GIVEN `feedConfig.fullContent=false`, WHEN 피드 출력, THEN `<description>` 가 `contentText` 400자 발췌 / GIVEN `fullContent=true`, THEN `<description>`(또는 Atom `<content>`)가 sanitized 본문 전체.
4. **AC-FEED-A4 (visibility)**: GIVEN board 의 guest 그룹에 `list`/`view` grant 없음, WHEN `GET /{mid}/rss`, THEN 404/403 + 본문에 문서 데이터 부재.
5. **AC-FEED-B1 (cache invalidation)**: GIVEN 피드가 캐시됨, WHEN 해당 board 에 새 PUBLIC 문서 생성(`emitDocumentCreated`), THEN `revalidateTag('feed:{id}')` 호출 + 다음 요청에 새 문서 포함.
6. **AC-FEED-C1 (admin)**: GIVEN 관리자 세션, WHEN `/admin/boards/{mid}/feed` 에서 `enabled=true`, `itemCount=10` 저장, THEN `Board.feedConfig` 갱신 + `GET /{mid}/rss` 가 최대 10개 항목 반환.

상세 Given-When-Then 은 구현 시 `acceptance.md` 로 확장.

---

## 5. Technical Approach

### 5.1 패키지 위치

피드 빌더 + 라우트 보조 로직은 `packages/board/src/feed/` 에 둔다(board 도메인의 출력 표면이며, `Board.feedConfig` 와 `listDocuments` 소비가 board wrapper의 책임 범위와 일치). 별도 `packages/feed` 신설은 over-engineering으로 판단 — board 외 도메인(wiki/blog)이 피드를 요구하면 그때 추출(Enforce Simplicity).

### 5.2 라우트 세그먼트 충돌 없음

`app/[mid]/rss/route.ts` 와 `app/[mid]/atom/route.ts` 는 리터럴 세그먼트로, 동적 `app/[mid]/[id]/page.tsx` 보다 우선 매칭된다(Next.js 라우팅 규칙). 기존 `app/[mid]/write/page.tsx`(리터럴) 와 동일 패턴이므로 회귀 위험 없음.

### 5.3 데이터 소스 재사용

`listDocuments({ moduleInstanceId, status:'PUBLIC', limit })` 가 PUBLIC·non-deleted 필터 + author include 를 이미 제공 → 권한/가시성 요구의 절반이 무료로 충족. 피드는 `items` 만 사용(`notices` 는 REQ-FEED-023 에 따라 별도 처리 안 함, 단순 병합 가능).

### 5.4 캐싱: 3중 방어

(1) 라우트 `revalidate=300` (origin DB 보호), (2) `Cache-Control s-maxage/SWR` (CDN/aggregator 보호), (3) 문서 이벤트 → `revalidateTag` (신선도). 5분 TTL 은 레거시(캐싱 없음) 대비 명백한 개선이며, 이벤트 무효화로 새 글은 즉시 반영되므로 TTL 을 보수적으로 잡아도 체감 신선도 손실이 없다.

### 5.5 XML 안전성

본문은 HTML 을 포함하므로 `<content>`/`<description>` 은 CDATA 래핑 또는 엔티티 이스케이프. `]]>` 시퀀스 방어(CDATA 종료 인젝션) 필수. 직렬화는 검증된 XML 빌더 라이브러리 또는 엄격한 자체 이스케이프 헬퍼 사용(Context7 로 라이브러리 확인 후 선택).

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 비밀글/임시저장이 피드로 노출 | `status:'PUBLIC'` 필터 + 명시적 visibility 테스트(REQ-FEED-062). 게스트 read 게이트 추가. |
| 본문 HTML 이 피드 XML 구조를 깨뜨림(`]]>` 인젝션) | CDATA 종료 시퀀스 방어 + 이스케이프 테스트(REQ-FEED-063). |
| 캐시 무효화 누락으로 새 글이 피드에 늦게 반영 | 이벤트 버스 구독(REQ-FEED-042) + 보수적 TTL(5분) 병행. 둘 중 하나만 실패해도 최대 5분 지연으로 bound. |
| `Board.feedConfig` 추가가 기존 마이그레이션 깨뜨림 | additive Json 컬럼 only(REQ-FEED-050). 기존 컬럼 변경 금지. |
| 라우트 세그먼트가 `[id]` 와 충돌 | 리터럴 세그먼트 우선(5.2). 기존 `write` 세그먼트로 패턴 검증됨. |
| baseUrl(scheme+host) 오결정으로 상대 링크 깨짐 | 요청 헤더(`x-forwarded-host`/`host` + proto)에서 baseUrl 도출. 멀티사이트 `x-site-id` 와 일관. |

---

## 7. Open Questions

본 SPEC 작성 시점 미해결 항목. 모두 Implementation Notes 에서 best-judgment 로 잠정 확정(서브에이전트는 사용자 직접 질의 불가). `/moai run` 전 운영 확인 권장.

- **Q1. 단일 라우트(`?format=`) vs 분리 라우트(`/rss`,`/atom`)** — 잠정: **분리 라우트**.
- **Q2. 캐시 TTL** — 잠정: **300초(5분) + SWR 600초 + 이벤트 무효화**.
- **Q3. 설정 저장 위치** — 잠정: **`Board.feedConfig Json` 추가 컬럼**.
- **Q4. 비공개 게시판 응답 코드(403 정보노출 vs 404 은폐)** — 잠정: **404**(게시판 존재 은폐).
- **Q5. ADMIN-002 의존 여부** — 잠정: **하드 의존 아님**(피드 설정은 BOARD-CRUD-001 board admin 확장).

---

## Exclusions (What NOT to Build)

[HARD] 본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **사이트 전역 통합 피드** (레거시 `use_total_feed`/`open_total_feed`) — 게시판 횡단 관심사(SPEC-MODULE-BACKLOG-001 §1.13 integration_search)와 겹치며 별도 결정 필요. 본 SPEC은 게시판별(part) 피드만(triage REQ-MODBL-011 정합).
2. **RSS 1.0 / XE 호환 포맷** — 레거시 잔재. RSS 2.0 + Atom 1.0 만으로 충분. 영구 제외.
3. **팟캐스트 / 미디어 RSS 확장** (`<enclosure>`, iTunes 네임스페이스) — 레거시 미보유. 제외.
4. **WebSub / PubSubHubbub 실시간 푸시** — 레거시 미보유. 제외.
5. **피드 이미지 파일 업로드** (SPEC-FILE-001 통합) — URL 입력만. 업로드 통합은 백로그.
6. **댓글 전용 피드 / 통합 댓글 피드** — 백로그. 본 SPEC은 문서 피드만(댓글은 item 의 `<comments>`/`replies` 링크로만 참조).
7. **피드 인증 토큰 / 비공개 게시판 시크릿 피드 URL** — 본 SPEC은 공개 피드만. 비공개 게시판은 피드 미노출(REQ-FEED-032).
8. **별도 런타임 모듈-설치 메커니즘** — triage REQ-MODBL-011 명시 제약. 피드는 빌드타임 Route Handler 로만 제공.
9. **카테고리별 분리 피드** (`/{mid}/rss?category=N`) — 백로그. 본 SPEC은 게시판 전체 피드만.

위 항목이 필요해질 경우 명시적으로 후속 SPEC에서 다루며 본 SPEC range를 확장하지 않는다.

---

## Implementation Notes

본 SPEC은 구현 SPEC(draft)이며, 서브에이전트인 manager-spec 은 사용자에게 직접 질의할 수 없어 다음 설계 모호 지점을 best-judgment 로 확정하고 근거를 명시한다. `/moai run` 전 운영자 검토 권장.

### Q1 판단 — 분리 라우트 (`/{mid}/rss`, `/{mid}/atom`)

**결정: 두 개의 분리된 Route Handler.** 근거: (a) 레거시도 `rss`/`atom` 두 act 를 구분했고 외부 피드 리더는 포맷별 고유 URL 을 북마크한다, (b) path 세그먼트 기반 라우팅이 rhymix-ts 의 house idiom(`write` 세그먼트와 동일 패턴)이고 `?format=` query 협상보다 캐시·자동탐색(SEO) 친화적이다, (c) 빌더 로직은 단일 서비스(REQ-FEED-006)로 공유하므로 중복이 없다. 대안(`/{mid}/feed?format=atom`)은 캐시 키 분산·자동탐색 링크 모호성 때문에 기각.

### Q2 판단 — 캐시 TTL 300초 + SWR + 이벤트 무효화

**결정: `revalidate = 300`(5분) + `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` + 문서 이벤트 `revalidateTag` 병행.** 근거: 레거시는 캐싱이 전혀 없어 매 폴링이 DB 를 쳤다 — 어떤 캐싱도 개선이다. 5분은 피드 리더의 통상 폴링 주기와 균형이 맞고, 이벤트 기반 무효화가 새 글을 즉시 반영하므로 TTL 을 보수적으로 잡아도 체감 신선도 손실이 없다. TTL 은 향후 `feedConfig.cacheTtl` 로 게시판별 설정 가능하게 확장할 수 있으나 본 SPEC 은 단일 기본값으로 단순화(Enforce Simplicity).

### Q3 판단 — `Board.feedConfig Json` 추가 컬럼

**결정: additive `Board.feedConfig Json @default("{}")` 컬럼 + Zod 검증.** 근거: board 레벨 피드 설정은 개념적으로 board-owned 이며 `Board.permissions Json` 과 동일한 기존 패턴을 따른다. `listDocuments` 가 이미 `Board` row 를 조회하므로 같은 row 에서 feedConfig 를 읽으면 추가 쿼리가 없다. 7개 컬럼을 개별 추가하는 대안은 마이그레이션이 무겁고 nullable 컬럼 난립을 부른다. 마이그레이션은 additive only — 기존 컬럼 변경 금지.

### Q4 판단 — 비공개/비활성 게시판 응답 404

**결정: feed-disabled(REQ-FEED-033) 및 guest-restricted(REQ-FEED-032) 게시판은 `404`.** 근거: 404 는 게시판 존재 자체를 은폐하여 정보 노출을 줄인다. 단, guest-restricted 의 경우 게시판은 존재하나 피드만 비공개일 수 있어 403 도 합리적 — 운영 정책에 따라 조정 가능하도록 Open Question 으로 명시. 기본값은 보안 보수적으로 404.

### Q5 판단 — ADMIN-002 하드 의존 아님

**결정: `depends-on` 에 SPEC-ADMIN-002 를 포함하지 않는다.** 근거: 피드 설정 UI(REQ-FEED-051)는 SPEC-BOARD-CRUD-001 Slice C 가 만든 board admin 셸(`app/admin/boards/[mid]/`)을 확장하는 것이지, ADMIN-002 의 전역 admin 패널 영역이 아니다. 레거시도 `dispRssAdminIndex` 가 게시판별 모듈 설정의 일부였다. 따라서 의존은 BOARD-CRUD-001 / DOCUMENT-001 / COMMENT-001 세 개로 충분하다.

### 의존성 근거 요약

- **SPEC-DOCUMENT-001**: `listDocuments`/`getDocument` 데이터 소스 + `events.ts` 캐시 무효화 훅 + `contentText`(발췌) + `Document` 필드.
- **SPEC-BOARD-CRUD-001**: `Board` 모델 소유 + `/{mid}` 라우팅 + canonical URL `/{mid}/{id}` + board admin 셸 + `permissions` 게이트.
- **SPEC-COMMENT-001**: `Document.commentCount`(REQ-FEED-016 의 `<comments>`/replies 링크 조건).

---

Version: 1.0.0
Status: draft (구현 대기 — `/moai run SPEC-FEED-001` 대상)
Estimated REQ Count: 36 (7개 계층: 라우트/포맷 7, 필드매핑 9, 데이터소스 4, 권한 5, 캐싱 4, 관리설정 5, 품질 7 — 일부 그룹 내 번호 여유)
Estimated Slice Count: 3 (A: 빌더+라우트, B: 캐싱+자동탐색, C: 관리 설정)
Dependencies (upstream): SPEC-BOARD-CRUD-001 ✅, SPEC-DOCUMENT-001 ✅, SPEC-COMMENT-001 ✅
Next Action: `/moai run SPEC-FEED-001` (Slice A 부터)
