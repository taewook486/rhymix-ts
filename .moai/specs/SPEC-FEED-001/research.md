---
spec-id: SPEC-FEED-001
type: research
created: 2026-06-20
updated: 2026-06-20
method: 레거시 PHP rss 모듈 1차 소스 직접 분석 (/mnt/d/project/rhymix/modules/rss/*) + rhymix-ts 라우팅/서비스/스키마 대조
parent: SPEC-MODULE-BACKLOG-001
related-master-plan: MASTER-PLAN-002 §5.13
language: ko
---

# SPEC-FEED-001 Research — 게시판별 RSS 2.0 / Atom 1.0 피드

## 0. 배경 및 방법

본 research는 SPEC-MODULE-BACKLOG-001(triage) §1.4가 KEEP으로 분류한 레거시 `rss` 모듈의 후속 구현 SPEC을 위한 근거 자료다. triage는 "피드 라우트가 전혀 없음(grep 0건), Next.js Route Handler로 저비용 구현"이라는 결론과 `app/board/[mid]/rss/route.ts` 구현 형상을 제시했다(REQ-MODBL-011). 본 research는 그 결론을 1차 소스로 검증하고, 실제 구현에 필요한 (1) 레거시 필드 매핑, (2) rhymix-ts 데이터 소스/라우팅 형상, (3) 설정 저장 위치를 확정한다.

방법:

- 레거시 rss 모듈 직접 분석: `/mnt/d/project/rhymix/modules/rss/` 의 `rss.view.php`(피드 출력 로직), `tpl/format/rss20.html`·`atom10.html`(필드 매핑), `rss.admin.controller.php`(관리 설정 옵션). 연구 갭 없음 — 간접 기술에 의존하지 않음.
- rhymix-ts 현재 상태 대조: `apps/web/app/[mid]/` 라우트 구조, `packages/document/src/document.ts` 의 `listDocuments` 시그니처, `packages/db/prisma/schema.prisma` 의 `Board`/`Document` 모델, `packages/document/src/events.ts` 이벤트 버스.

## 1. 레거시 rss 모듈 분석

### 1.1 액션/라우팅

- 두 개의 act: `rss`(기본, RSS 2.0), `atom`(Atom 1.0). 공유 `output($format, $obj)` 함수가 `format` 파라미터로 분기 — `atom`→atom10, `rss1.0`→rss10, `xe`→xe, 기본→rss20. 즉 **출력 포맷은 act + format 조합**이나 실질적으로 RSS 2.0과 Atom 1.0이 1차 시민이다(rss1.0/xe는 레거시 호환 잔재).
- 대상 모듈 결정: `$is_part_feed` = 특정 module_srl(게시판 인스턴스)이 지정되었는가. part feed면 해당 게시판의 `open_rss != 'N'` 일 때만 출력. total feed(`use_total_feed=Y`)면 `open_rss != 'N' && open_total_feed != 'T_N'` 인 게시판들을 합산.
- URL: `getFullUrl('', 'mid', $mid, 'act', $act, ...)` — 즉 `?mid={mid}&act=rss` 형태(레거시 query 라우팅). 본 SPEC은 이를 **Next.js path 세그먼트**(`/{mid}/rss`, `/{mid}/atom`)로 현대화.

### 1.2 문서 목록 쿼리 (데이터 소스)

`rss.view.php` 의 핵심 쿼리 인자:

```
$args->search_target = 'is_secret'; $args->search_keyword = 'N';   // 비밀글 제외
$args->module_srl    = array_keys($target_modules);                 // 대상 게시판
$args->list_count    = $config->feed_document_count > 0 ? ... : 20;  // 항목 수(기본 20)
$args->offset        = ($page > 1) ? list_count * (page-1) : 0;      // 페이지네이션
$args->sort_index    = 'regdate'; $args->order_type = 'desc';        // 최신순
```

→ **핵심 사실**: 레거시 피드는 (a) 비밀글(`is_secret='N'`) 제외, (b) 게시판 단위, (c) `regdate DESC` 최신순, (d) 기본 20개. 임시저장/삭제글은 `getDocumentList` 의 기본 필터가 처리.

### 1.3 RSS 2.0 항목 필드 매핑 (`tpl/format/rss20.html`)

| 피드 요소 | 레거시 소스 | rhymix-ts 매핑 |
|---|---|---|
| `channel/title` | module browser_title 또는 feed_title | `instance.browserTitle ?? board.name` |
| `channel/link` | `getFullUrl('', 'mid', mid)` | `/{mid}` 절대 URL |
| `channel/description` | `module_config->feed_description ?: module_info->description` | `feedConfig.description ?? board.description` |
| `channel/language` | `Context::getLangType()` | 사이트 기본 langCode(예: ko) |
| `channel/image` | `config->image` (피드 이미지) | `feedConfig.imageUrl` |
| `channel/copyright` | `feed_copyright` | `feedConfig.copyright` |
| `item/title` | `oDocument->getTitleText()` | `document.title` |
| `item/link` | `oDocument->getPermanentUrl()` | `/{mid}/{documentId}` 절대 URL |
| `item/description` | `open_rss=='Y'` → 본문 전체(HTMLFilter::fixRelativeUrls), else `getSummary(400)` | **full content vs excerpt 토글** → `feedConfig.fullContent` |
| `item/category` | 모듈명 + category_srl title + tag_list | `board.name` + category title + `document.tags[]` |
| `item/dc:creator` | `oDocument->getNickName()` | `document.author?.nickName ?? document.nickName` |
| `item/guid` (isPermaLink=true) | permanent url | `/{mid}/{documentId}` 절대 URL |
| `item/comments` (cond allowComment) | permanent url + `#comment` | `commentCount>0` 일 때 `/{mid}/{documentId}#comment` |
| `item/pubDate` | `date('r', regdate)` (RFC-822) | `document.regdate` → RFC-822 |

### 1.4 Atom 1.0 항목 필드 매핑 (`tpl/format/atom10.html`)

| 피드 요소 | 레거시 소스 | rhymix-ts 매핑 |
|---|---|---|
| `feed/title`,`subtitle`,`id`,`updated`(date 'c'=RFC-3339),`rights` | channel info | 동일 |
| `entry/title` | getTitleText | `document.title` |
| `entry/link rel=alternate` | permanent url | `/{mid}/{documentId}` |
| `entry/link rel=replies`(cond allowComment) | url+`#comment` | commentCount>0 |
| `entry/id` | permanent url | 동일(canonical) |
| `entry/published` | `date('c', regdate)` | `document.regdate` → RFC-3339 |
| `entry/updated` | `date('c', last_update)` | `document.lastUpdate` → RFC-3339 |
| `entry/author/name` | getNickName | author nickName |
| `entry/summary type=text` | getSummary(400) | excerpt(`contentText` 400자) |
| `entry/content type=html`(cond open_rss=='Y') | 본문 전체 | `feedConfig.fullContent` 일 때만 |
| `entry/category` | category_srl + tags | category title + tags |

→ **핵심 사실**: RSS는 `pubDate`(RFC-822), Atom은 `published`/`updated`(RFC-3339). full content 토글은 두 포맷 공통으로 `description`/`content`에 본문 전체를 넣을지 `getSummary(400)` 발췌를 넣을지 결정. 발췌 길이는 레거시 하드코딩 400자.

### 1.5 관리 설정 옵션 (`rss.admin.controller.php`)

- `feed_document_count` (1~1000, 기본 20) — 피드 항목 수
- `feed_description`, `feed_copyright`, `feed_title` — 채널 메타
- `image` — 피드 이미지(파일 업로드, `files/attach/images/rss/feed_image.*`)
- `open_rss` (Y=본문공개 / H=발췌 / N=비활성) — 게시판별 피드 활성화 + full/excerpt 토글이 **하나의 enum**에 결합
- `use_total_feed`, `open_total_feed` — 사이트 통합 피드 합산 여부 → **본 SPEC 범위 외**(아래 §3 참조)

→ **핵심 사실**: 레거시는 `open_rss` 단일 enum에 (활성/비활성)과 (본문/발췌)를 결합했다. rhymix-ts는 가독성을 위해 `enabled: boolean` + `fullContent: boolean` 두 필드로 분리한다.

## 2. rhymix-ts 현재 상태

### 2.1 라우팅 형상

- `apps/web/app/[mid]/page.tsx` — module index 디스패처. `getModuleInstanceByMid(siteId, mid)` 로 인스턴스 조회 → `def.routes.index` 위임. `x-site-id` 헤더로 멀티사이트 siteId 결정.
- `apps/web/app/[mid]/[id]/page.tsx` — 문서 상세. canonical URL = `/{mid}/{documentId}` (board routes `index-page.tsx:101` 에서 `href={/${instance.mid}/${doc.id}}` 확인).
- `apps/web/app/[mid]/write/page.tsx` — 리터럴 세그먼트가 `[id]` 동적 세그먼트보다 우선. → **`app/[mid]/rss/route.ts` 와 `app/[mid]/atom/route.ts` 는 `[id]` 와 충돌 없이 공존 가능**(리터럴 우선). 피드 라우트는 zero건(grep 확인).

### 2.2 데이터 소스 — `listDocuments`

`packages/document/src/document.ts:465`:

```ts
listDocuments(
  { moduleInstanceId, status='PUBLIC', categoryId?, tags?, sort='list_order', cursor?, limit? },
  { prisma }
): Promise<{ notices: Document[]; items: Document[]; nextCursor: string|null }>
```

- `status='PUBLIC'` 기본 → SECRET/TEMP 자동 제외. `deletedAt IS NULL` 자동. → **REQ-FEED 권한 요구의 절반을 이미 충족**.
- `board.listCount` 를 limit 기본값으로 사용. 피드는 별도 `feedConfig.itemCount` 를 limit으로 전달.
- 정렬: `sort='list_order'`(기본) 또는 `update_order`. 레거시는 `regdate DESC`. `listOrder` 는 통상 regdate 기반 BigInt이므로 근사 일치하나, 피드는 명시적으로 `regdate` 최신순 의도 → 본 SPEC은 `listOrder DESC`(=사실상 최신순)를 사용하되 의미를 문서화.
- `getDocument(id, {prisma})` 는 `author { id, userId, nickName }` 를 include → 피드 author 매핑 가능.

### 2.3 스키마 — Board / Document

- `Board`(schema.prisma:637): `listCount`, `exceptNotice`, `permissions Json @default("{}")`, `description`, `name` 보유. **피드 설정 컬럼 없음** → 추가 필요.
- `Document`(613~): `title`, `content`, `contentText`(plain text — 발췌 소스), `tags String[]`, `regdate`, `lastUpdate`, `commentCount`, `status`(PUBLIC/SECRET/TEMP), `categoryId`, `authorId`/`nickName`.
- `permissions Json` 패턴: board-owned JSON 컬럼이 이미 존재(`Record<Grant, number[]>`). 피드 설정도 동일 패턴(`Board.feedConfig Json`)이 일관적.

### 2.4 이벤트 버스 (캐시 무효화 훅)

`packages/document/src/events.ts` — `emitDocumentCreated/Updated/Deleted` 존재(`document.ts:426` 에서 `emitDocumentDeleted` 호출 확인). → **피드 캐시 tag 무효화(`revalidateTag`)를 이 이벤트에 구독**시키면 새 글 발행 시 피드가 즉시 갱신된다.

## 3. 범위 결정 근거 (레거시 대조)

- **통합 피드(use_total_feed) 제외**: 레거시는 사이트 전역 통합 피드를 지원했으나, 이는 SPEC-MODULE-BACKLOG-001 §1.13(integration_search, NEEDS-RESEARCH)의 "게시판 횡단" 관심사와 겹치며 별도 결정이 필요. 본 SPEC은 **게시판별(part) 피드만** 다룬다 — triage REQ-MODBL-011("per-board RSS 2.0 and Atom 1.0")과 정합.
- **피드 이미지 업로드 제외(URL 입력만)**: 레거시는 파일 업로드(`feed_image.*`)였으나, rhymix-ts는 SPEC-FILE-001 업로드 인프라를 재사용하지 않고 **이미지 URL 문자열 입력**으로 단순화(피드 이미지는 외부 URL이어도 무방). 업로드 통합은 백로그.
- **rss1.0 / xe 포맷 제외**: 레거시 호환 잔재. 현대 피드 리더는 RSS 2.0 + Atom 1.0 만으로 충분. 영구 제외.
- **WebSub/PubSubHubbub, 팟캐스트/미디어 RSS 제외**: 레거시 rss 모듈에 없던 기능 — 본 SPEC도 미포함(triage 범위 경계와 정합).

## 4. 미해결/판단 필요 (spec.md Implementation Notes에서 best-judgment로 확정)

1. 단일 통합 라우트(`?format=`) vs 분리 라우트(`/rss`,`/atom`) — **분리 권고**(§spec Implementation Notes).
2. 캐시 TTL 값 — **300초(5분) + SWR + 이벤트 tag 무효화 권고**.
3. 설정 저장 위치 — **`Board.feedConfig Json` 추가 컬럼 권고**(permissions Json 패턴 일관).
4. 발췌 길이 기본값 — 레거시 400자 유지, `feedConfig.excerptLength` 로 설정 가능.
5. ADMIN-002 의존 여부 — 피드 설정 UI는 BOARD-CRUD-001 의 board admin(`app/admin/boards/[mid]/`)을 확장하므로 **ADMIN-002 하드 의존 아님**.
