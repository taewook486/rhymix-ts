---
spec-id: SPEC-MODULE-BACKLOG-001
type: research
created: 2026-06-20
updated: 2026-06-20
method: 레거시 PHP 모듈 직접 분석 (/mnt/d/project/rhymix/modules/*) + rhymix-ts Prisma 스키마/코드 대조
related-master-plan: MASTER-PLAN-002 §8.1
language: ko
---

# SPEC-MODULE-BACKLOG-001 Research — 미포팅 레거시 모듈 14종 triage

## 0. 배경 및 방법

MASTER-PLAN-002 §8.1("백로그 모듈")과 §5.13(SPEC-MODULE-BACKLOG)은 Rhymix 코어 12개 모듈 포팅(Phase 1~6, 전부 구현 완료) 이후 남은 미포팅 레거시 모듈을 별도 SPEC에서 evaluation하도록 위임했다. 본 research는 그 evaluation의 근거 자료다.

방법:

- 레거시 PHP 모듈 소스를 직접 읽음: `/mnt/d/project/rhymix/modules/{name}/conf/info.xml`, `conf/module.xml`(action 인벤토리), `schemas/*.xml`(테이블 구조), `*.php`(파일 구성). 이 환경에서 레거시 코드베이스는 `/mnt/d/project/rhymix/`로 접근 가능했다(연구 갭 없음 — MASTER-PLAN-002/research.md의 간접 기술에 의존할 필요 없이 1차 소스를 확인).
- rhymix-ts 현재 상태 대조: `packages/db/prisma/schema.prisma`(모델/enum 인벤토리), `packages/*/src`, `apps/web/app/admin/` 구현 여부 grep.
- 이미 완료된 SPEC(특히 SPEC-ADMIN-002)이 흡수한 범위와 교차 확인하여 중복 제안을 방지.

대상 14종 (MASTER-PLAN-002 §8.1에서 이미 다른 SPEC에 흡수된 install/adminlogging/advanced_mailer/spamfilter/extravar 제외 후):

poll, tag, trash, rss, counter, importer, krzip, editor, session, communication, message, ncenterlite, integration_search, autoinstall

---

## 1. 모듈별 분석

각 항목: 레거시 책임 → rhymix-ts 현재 상태 → 판정.

### 1.1 poll (설문) — 판정: KEEP (프론트엔드 투표 위젯)

- 레거시: `schemas/` = poll, poll_item, poll_log, poll_title 4종. action = `procPoll`(투표), `procPollViewResult`, `dispPollAdminList/Result/Config` 등. 문서 본문에 삽입되는 콘텐츠 위젯이자 독립 관리 화면을 동시에 가짐.
- rhymix-ts: Prisma `Poll`/`PollOption`/`PollVote` 모델 존재(schema.prisma:1197~). **관리자 UI는 SPEC-ADMIN-002 Slice 3A에서 이미 구현**(REQ-ADMIN2-083~086 — 목록/생성/결과/설정).
- 갭: 공개 페이지에서 회원이 실제로 **투표하고 결과를 보는** 프론트엔드 위젯(`<rx-widget name="poll" />` 류)과 투표 트랜잭션·중복 방지 서비스. 관리 측은 끝났으나 사용자가 투표할 표면이 없다.
- 판정: **(a) KEEP** — 프론트엔드 투표 위젯 + 투표 서비스를 미래 SPEC(SPEC-POLL-WIDGET-001 가칭)으로 제안. 우선순위 P2.

### 1.2 tag (태그) — 판정: DROP 독립화 / 소규모 위젯만 NEEDS-RESEARCH

- 레거시: `schemas/tags.xml` 단일 테이블(문서별 태그 정규화 저장) + 태그 클라우드/태그별 문서 목록 화면.
- rhymix-ts: `document.tags String[]` 인라인 컬럼 + GIN 인덱스(schema.prisma:713,738)로 비정규화 저장. 태그 입력 파싱·태그 구분 방법 설정은 **SPEC-ADMIN-002 REQ-ADMIN2-087/156에서 완료**.
- 갭: 공개 "태그 클라우드" 위젯과 "이 태그가 달린 문서 목록" 페이지(`/tag/{name}`)만 부재.
- 판정: **(b) DROP** 독립 모듈화 — String[] + GIN 아키텍처가 정규화 테이블을 대체하며 충분(MASTER-PLAN §5.13에서 이미 "인라인 저장으로 임시 대응"이라 기록). 단 태그 클라우드/태그 목록 페이지는 작은 사용자 가시 갭으로, poll 위젯 SPEC에 합치거나 별도 소형 항목으로 둘 수 있음(NEEDS-RESEARCH, P3).

### 1.3 trash (휴지통 독립화) — 판정: DROP 독립화 / 댓글 휴지통만 소규모 갭

- 레거시: `schemas/trash.xml` 단일 범용 휴지통(문서·댓글 등 직렬화 저장 후 복원). `modules/trash`는 도메인 횡단 recycle bin.
- rhymix-ts: `Trash` 모델 = `document_trash`(documentId unique, expiresAt, deletedBy) + `DocumentStatus` 소프트삭제 + `/admin/trash` 화면(SPEC-DOCUMENT-001). 즉 **문서 단위 소프트삭제가 이미 도메인별로 구현**됨.
- 갭: 댓글 휴지통/복원이 별도로 없음(댓글은 `CommentStatus`/cascade 삭제). 범용 직렬화 휴지통은 rhymix-ts 도메인-우선 설계와 배치됨.
- 판정: **(b) DROP** 범용 trash 모듈 독립화 — rhymix-ts는 도메인별 soft-delete + 도메인별 trash 화면이 아키텍처 표준. 댓글 휴지통/복원은 NEEDS-RESEARCH 소규모 갭(P3, 필요 시 SPEC-COMMENT 후속).

### 1.4 rss (RSS/Atom 피드) — 판정: KEEP

- 레거시: `rss.view.php` + action `rss`, `atom`. 게시판/모듈 인스턴스별 피드 출력. `dispRssAdminIndex`로 피드 이미지·설정.
- rhymix-ts: 피드 라우트가 **전혀 없음**(`apps/web/app`에 rss/atom/feed 라우트 grep 결과 0건).
- 갭: 게시판별 RSS 2.0 / Atom 1.0 피드. MASTER-PLAN §5.13도 "Next.js route handler로 별도 구현 가능"으로 명시.
- 판정: **(a) KEEP** — Next.js Route Handler(`app/board/[mid]/rss/route.ts`)로 구현하는 미래 SPEC(SPEC-FEED-001 가칭). 우선순위 P2. 사용자/외부 구독자 가시 기능이고 구현 비용 낮음.

### 1.5 counter (접속통계) — 판정: DROP (이미 구현됨)

- 레거시: `schemas/` = counter_log, counter_status, counter_site_status. 일/월 방문 집계.
- rhymix-ts: `DailyVisit` 모델(schema.prisma:1106) + `/admin/stats`(SPEC-ADMIN-002 Slice 2F, REQ-ADMIN2-140~142) + 대시보드 방문 위젯(REQ-ADMIN2-001/009) + 비차단 카운팅 + IP 해시(`ip-hasher.ts`).
- 판정: **(b) DROP** — counter의 핵심 책임이 SPEC-ADMIN-002에서 이미 완결. 별도 SPEC 불필요.

### 1.6 importer (데이터 이전) — 판정: NEEDS-RESEARCH (마이그레이션 SPEC에 종속)

- 레거시: `extract.class.php`, `ttimport.class.php`, `queries/`. XE/Tistory 등에서 XML로 회원·게시글 import.
- rhymix-ts: JSON export/import는 SPEC-ADMIN-EXTRAS-001에 존재하나, 레거시 XML/타 CMS import는 없음.
- 갭: 실제 운영 데이터 이전. MASTER-PLAN-002 §8.4가 "운영 데이터 마이그레이션은 코드 포팅 완료 후 별도 SPEC"으로 명시 — importer는 이 결정에 종속.
- 판정: **(c) NEEDS-RESEARCH** — SPEC-MIGRATION-001(운영 데이터 이전, MASTER-PLAN §8.4) 착수 시점에 함께 결정. 단독 SPEC으로 분리하지 않음. P3.

### 1.7 krzip (한국 우편번호) — 판정: DROP

- 레거시: 공개 우편번호 검색 API 래퍼(주소 입력 폼 보조).
- rhymix-ts: 주소 필드 자체가 코어 회원 모델에 없음. 필요 시 외부 컴포넌트(예: Daum 우편번호 서비스)를 폼 단에서 직접 사용 가능.
- 판정: **(b) DROP** — 코어 CMS 기능 아님. 주소 수집이 필요한 사이트만 가입 양식(`member.extra_vars`, SPEC-AUTH-001)에 외부 위젯을 붙이면 됨. 모듈 포팅 불필요.

### 1.8 editor (에디터) — 판정: DROP (Tiptap으로 대체)

- 레거시: WYSIWYG 출력 + 에디터 컴포넌트(이미지/동영상 삽입 등) 중계 + `editor_autosave`/`editor_components` 스키마.
- rhymix-ts: `packages/board/src/components/TiptapEditor.tsx`로 WYSIWYG 구현. 임시저장은 `DocumentStatus.TEMP`로 흡수(MASTER-PLAN §5.13 "일부는 이미 document 안에 흡수").
- 갭: 레거시식 "에디터 컴포넌트" 플러그인 중계 레이어 — rhymix-ts에서는 Tiptap extension으로 대체되는 다른 아키텍처.
- 판정: **(b) DROP** — Tiptap이 에디터 책임을 대체. 컴포넌트 시스템은 SPEC-ADDON-001 hook + Tiptap extension으로 해소. 별도 SPEC 불필요.

### 1.9 session (세션 관리) — 판정: DROP (Auth.js로 대체)

- 레거시: `schemas/session.xml`. PHP 세션 저장·접속자 정보 제공.
- rhymix-ts: Auth.js v5(NextAuth) + `SessionRevocation`/`AutoLogin`/`MemberDevice` 모델(SPEC-AUTH-001). 세션은 프레임워크 책임으로 이동.
- 판정: **(b) DROP** — Auth.js가 세션 관리를 전면 대체. 모듈 개념 자체가 소멸.

### 1.10 communication (쪽지/친구) — 판정: KEEP

- 레거시: `schemas/` = member_friend, member_friend_group, member_message. action = `procCommunicationSendMessage`, `dispCommunicationMessages`, 친구 그룹 관리 등 다수. 회원 간 1:1 쪽지 + 친구 기능.
- rhymix-ts: **DB 모델 전무**(friend/message grep 0건). SPEC-ADMIN-002 REQ-ADMIN2-143은 "쪽지 설정" **화면만** 추가했고 실제 메시징 도메인은 없음.
- 갭: 회원 간 쪽지(받은편지함/보낸편지함/작성/삭제)와 친구 목록 전체.
- 판정: **(a) KEEP** — 실 사용자 기능, 완전 미구현. 미래 SPEC(SPEC-MESSAGE-001 가칭). 우선순위 P2(쪽지) + 친구 기능은 P3로 분리 가능.

### 1.11 message (오류 표시) — 판정: DROP (Next.js 에러 처리로 대체)

- 레거시: 이름과 달리 회원 쪽지가 **아님**. 시스템 오류·메시지 **표시** 모듈(에러 페이지 렌더링).
- rhymix-ts: Next.js App Router의 `error.tsx`/`not-found.tsx`/`global-error.tsx`가 이 책임을 가짐.
- 판정: **(b) DROP** — 프레임워크 기본 에러 바운더리로 완전 대체. 모듈 포팅 무의미.

### 1.12 ncenterlite (알림 센터) — 판정: KEEP

- 레거시: `schemas/` = ncenterlite_notify, ncenterlite_notify_type, ncenterlite_unsubscribe, ncenterlite_user_set. 새 댓글/멘션/쪽지 등에 대한 인앱 알림 센터.
- rhymix-ts: `document.notifyMessage` boolean 플래그만 존재, 알림 도메인·알림함 없음.
- 갭: 인앱 알림 생성/목록/읽음/구독해제/사용자별 알림 설정.
- 판정: **(a) KEEP** — 실 사용자 기능, 미구현. 미래 SPEC(SPEC-NOTIFICATION-001 가칭). 우선순위 P2. communication(쪽지)과 일부 의존(쪽지 도착 알림).

### 1.13 integration_search (통합검색) — 판정: NEEDS-RESEARCH

- 레거시: 선택한 여러 모듈을 가로질러 통합 검색. 비밀글 제외.
- rhymix-ts: 문서 단위 PostgreSQL FTS(`search_vector` GIN, SPEC-DOCUMENT-001)는 있으나 **게시판 횡단 통합 검색 페이지**는 없음. MASTER-PLAN §6.3는 "Meilisearch 전환은 별도 SPEC"으로 검색 백엔드 결정을 유보.
- 갭: 사이트 전역 검색 결과 페이지(여러 board/document 인스턴스 합산).
- 판정: **(c) NEEDS-RESEARCH** — 기존 FTS로 PoC 가능하나, 검색 백엔드(PostgreSQL FTS 확장 vs Meilisearch) 아키텍처 결정이 선행되어야 함. SPEC-SEARCH-001(가칭)로 분리하되 백엔드 결정 후 착수. P3.

### 1.14 autoinstall (쉬운 설치) — 판정: DROP (영구 제외)

- 레거시: 원격 마켓플레이스에서 모듈/스킨/레이아웃/위젯을 런타임 다운로드·설치.
- rhymix-ts: **SPEC-ADMIN-002에서 이미 영구 제외 확정**(Exclusions §12). Next.js/npm 빌드타임 패키지 아키텍처와 근본적으로 양립 불가. 로컬 애드온 토글은 `/admin/addons`(SPEC-ADDON-001)가 제공.
- 판정: **(b) DROP** — 영구 제외. 재평가 불필요.

---

## 2. Triage 요약 표

| 모듈 | 레거시 책임 | rhymix-ts 현재 | 판정 | 제안 미래 SPEC / 우선순위 |
|---|---|---|---|---|
| poll | 설문 위젯+관리 | 모델+관리 UI(ADMIN-002) | **KEEP** | SPEC-POLL-WIDGET-001 (프론트 투표) / P2 |
| rss | RSS/Atom 피드 | 없음 | **KEEP** | SPEC-FEED-001 / P2 |
| communication | 쪽지+친구 | 설정 화면만 | **KEEP** | SPEC-MESSAGE-001 / P2(쪽지)·P3(친구) |
| ncenterlite | 인앱 알림 센터 | notifyMessage flag만 | **KEEP** | SPEC-NOTIFICATION-001 / P2 |
| tag | 태그 정규화+클라우드 | 인라인 String[]+설정 | **DROP**(위젯만 NR) | (선택) 태그 페이지 위젯 / P3 |
| trash | 범용 휴지통 | 문서 soft-delete+`/admin/trash` | **DROP**(댓글휴지통 NR) | (선택) 댓글 휴지통 / P3 |
| importer | XML 데이터 이전 | export/import JSON | **NEEDS-RESEARCH** | SPEC-MIGRATION-001 종속 / P3 |
| integration_search | 횡단 통합검색 | 문서 단위 FTS | **NEEDS-RESEARCH** | SPEC-SEARCH-001(백엔드 결정 후) / P3 |
| counter | 접속통계 | DailyVisit+`/admin/stats`(ADMIN-002) | **DROP** | (구현 완료) |
| editor | WYSIWYG+컴포넌트 | Tiptap | **DROP** | (대체됨) |
| session | PHP 세션 | Auth.js v5 | **DROP** | (대체됨) |
| message | 오류 표시 | Next.js error.tsx | **DROP** | (대체됨) |
| krzip | 한국 우편번호 | 외부 컴포넌트로 충분 | **DROP** | (불필요) |
| autoinstall | 원격 마켓 설치 | 영구 제외(ADMIN-002) | **DROP** | (영구 제외) |

집계: KEEP 4 / DROP 8 / NEEDS-RESEARCH 2.

---

## 3. 교차 검증 노트

- counter·tag·poll(관리)·trash(문서)는 SPEC-ADMIN-002·SPEC-DOCUMENT-001에 이미 흡수되었으므로, 본 SPEC은 이들의 **관리/저장 측면을 재구현하지 않는다**. KEEP 항목 중 poll은 명시적으로 **프론트엔드 위젯 측면만** 제안한다.
- session·message·editor·autoinstall은 PHP 모듈 개념이 프레임워크/라이브러리(Auth.js, Next.js error boundary, Tiptap, npm)로 흡수되어 "포팅" 대상이 아니라 **아키텍처 대체** 대상이다.
- KEEP 4종은 모두 실제 사용자 가시 기능 갭이며, MASTER-PLAN §5.13 후보 목록과 일치한다.
