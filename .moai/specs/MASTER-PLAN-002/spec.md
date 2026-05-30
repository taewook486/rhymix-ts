---
id: MASTER-PLAN-002
title: Rhymix-TS 코어 CMS 마스터 플랜 (Ground Truth)
version: 1.1.0
status: approved
created: 2026-05-25
updated: 2026-05-25
author: MoAI manager-spec
priority: P0
issue_number: TBD
supersedes: REMEDIATION-PLAN-001
absorbs: [SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-CONTENT-001, SPEC-THEME-001, SPEC-INSTALL-001]
related-research: MASTER-PLAN-002/research.md
language: ko
---

# Master Plan 002 — Rhymix-TS 코어 CMS 포팅 마스터 플랜

## HISTORY

- 2026-05-25 (v1.1.0): 사용자 승인 완료. Section 9.1의 6개 결정 항목 모두 확정 (Phase 우선순위 OK, 모듈 매핑 OK, SPEC 흡수 매트릭스 OK, 신규 패키지 5개 추가 OK, 백로그 처분 OK, 열린 질문 5개 모두 권고안 채택). 다음 단계: SPEC-LAYOUT-001 작성을 위한 `/moai plan` 호출.
- 2026-05-25 (v1.0.0): 최초 작성. REMEDIATION-PLAN-001을 흡수하고, 5개 기존 SPEC을 재배치한다. 본 plan은 실제 레거시 코드 베이스(D:\project\rhymix) 분석에 기반한 첫 ground-truth 플랜이다. 이전의 5개 SPEC은 도메인 가정에 기반했으나 레거시 PHP 코드와의 실제 매핑은 검증되지 않았다. research.md가 이를 보강한다.

---

## Section 0. Executive Summary

### 0.1 본 plan은 무엇인가

본 plan은 Rhymix CMS의 코어 12개 모듈(member, board, document, comment, page, widget, file, point, menu, layout, module, addon)을 Next.js 16 + TypeScript + Prisma 환경으로 포팅하는 작업의 **최상위 청사진**이다. plan 자체는 코드를 작성하지 않으며, 다음 두 가지 역할을 한다:

1. **재배치(Re-rank)**: 기존 5개 SPEC을 새 우선순위 축에 맞게 재배치하고, 누락된 도메인(page, widget builtin, addon, point, file upload, comment 독립화)을 새 SPEC으로 추가한다.
2. **순서 결정(Sequencing)**: 5단계 phase로 작업 순서를 정의하여, 각 phase 완료 시점마다 **사용자가 화면에서 진전을 확인할 수 있다**는 원칙을 보장한다.

### 0.2 본 plan이 대체하는 것

REMEDIATION-PLAN-001은 archived 상태로 전환된다. REMEDIATION의 슬라이스 분해(THEME A~F, CONTENT Slice B, MailDispatcher, ADMIN G/H/I)는 본 plan에 그대로 흡수된다 — 단 phase 재배치를 거친다.

### 0.3 본 plan이 grounded되는 근거

본 plan의 모든 결정은 `MASTER-PLAN-002/research.md`에 검증된 레거시 사실에 기반한다. 다음과 같은 ground-truth가 확인되었다:

- 12개 모듈의 conf/info.xml, conf/module.xml, schemas/*.xml 직접 읽기
- 위젯 1개(content)의 class.php 읽기 — 위젯 API 패턴 도출
- 애드온 6개의 `called_position` grep — 후크 메커니즘 도출
- 현재 rhymix-ts의 Prisma 스키마 38개 모델 확인
- 현재 packages/core/src/theme/ 27개 파일 존재 확인 (THEME-001은 spec.md만 있는 게 아니라 일부 구현이 진행 중)

### 0.4 핵심 결정

1. **사용자 가시성 우선 (Visible UI First)**: Phase 1은 백엔드 완성도가 아니라 "사용자가 홈 화면에서 무언가를 본다"를 목표로 한다. 이를 위해 Layout + Page + Widget을 한 phase에 묶는다.
2. **콘텐츠 도메인 독립화**: document와 comment를 board에서 분리하여 독립 패키지로 만든다. board는 이들을 사용하는 wrapper로 재정렬된다.
3. **점진적 SPEC 분해**: 본 plan 승인 후 12개 모듈에 대응하는 SPEC을 5개 phase에 걸쳐 점진 작성한다. Phase 1 시작 SPEC은 SPEC-LAYOUT-001 또는 SPEC-PAGE-001 (Section 9 참조).
4. **레거시 단순화 회피**: addon/poll/wiki 같은 비핵심 기능은 백로그로 미루고, 핵심 CMS 동작에 필요한 12개만 다룬다.

---

## Section 1. Legacy → TS 모듈 매핑

본 표는 레거시 PHP 12개 모듈이 새 TS 패키지/앱 경로 어디로 가는지 정한다. 매핑은 research.md의 도메인 책임 분석에 기반한다.

| Legacy 모듈 (PHP)     | Target 패키지 / 앱 경로                           | 비고                                                                                          |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `modules/member`      | `packages/auth/`                                  | SPEC-AUTH-001에서 대부분 완료. 일부 누락(스크랩, SMS) 백로그                                  |
| `modules/board`       | `packages/board/`                                 | 일부 완료. tRPC + UI 미착수 (CONTENT Slice B)                                                 |
| `modules/document`    | `packages/document/` (신규 독립화)                | 현재 board 내부에 있음. 독립 패키지로 분리                                                    |
| `modules/comment`     | `packages/comment/` (신규 독립화)                 | 현재 board 내부에 있음. 독립 패키지로 분리                                                    |
| `modules/page`        | `packages/page/` (신규) + `apps/web/app/[mid]`    | 미구현. ModuleInstance.content + widget 토큰 파서                                             |
| `modules/widget`      | `packages/core/src/widgets/` + builtin 위젯들    | registry 골조 존재. token parser + 빌트인 2개 신규                                            |
| `modules/file`        | `packages/file/` (신규) + `apps/web/api/files/*` | 일부 `packages/board/src/storage`에 존재. 독립 패키지로 승격                                  |
| `modules/point`       | `packages/point/` (신규)                          | 미구현. Prisma `Point` 모델 + service                                                         |
| `modules/menu`        | (현재 ADMIN-001에 포함됨)                         | Menu CRUD 완료. cross-level DnD만 잔여 (ADMIN Slice I)                                        |
| `modules/layout`      | `packages/core/src/theme/` + `themes/default/`    | THEME-001 spec.md + 27개 core 파일 일부 구현 중. 실제 default 레이아웃 컴포넌트 미구현        |
| `modules/module`      | `packages/core/src/modules/`                      | ADMIN-001 Slice A에서 완료. lifecycle hooks, registry, mid-validator 모두 존재                |
| `modules/addon`       | `packages/core/src/addons/` (신규, 최소형)        | 선언적 hook system으로 재설계. Phase 4에서 시작                                               |

신규 패키지 5개 (`document`, `comment`, `page`, `file`, `point`, `addons`)를 추가하고, 기존 `board`는 위 3개에 의존하는 wrapper로 변경한다.

---

## Section 2. 기존 SPEC 흡수 매트릭스

각 기존 SPEC을 새 master plan 안에서 어떻게 처리할지 결정.

| SPEC                  | 처분               | 신규 위치                                          | 근거                                                                                                                          |
| --------------------- | ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SPEC-AUTH-001         | KEEP-AS-IS         | (그대로)                                          | A~H 완료, 482 테스트. 회원 시스템의 기반.                                                                                     |
| SPEC-ADMIN-001        | KEEP-AS-IS + 분할 | A~F 완료. G→Phase 1, H→Phase 5, I→Phase 5         | A~F는 module/menu/admin shell 완료. G(widgets)는 Phase 1로 옮긴다 (페이지 렌더링과 함께). H(export), I(잔여)는 Phase 5.       |
| SPEC-CONTENT-001      | ABSORB-INTO-PHASE-2 | Slice A 완료 유지. Slice B는 SPEC-DOCUMENT/COMMENT/BOARD-NEW로 분할 | 단일 SPEC으로는 너무 큼. 도메인 분리 원칙에 따라 document/comment/board 각각의 SPEC으로 쪼갠다.                                |
| SPEC-THEME-001        | ABSORB-INTO-PHASE-1+4 | Slice A~D → SPEC-LAYOUT-001 (Phase 1). Slice E~F → SPEC-THEME-POLISH-001 (Phase 4). | 130+ REQ는 너무 크다. 사용자 가시성 직결 부분만 Phase 1, 관리자 UI/dark mode는 Phase 4. SPEC-THEME-001 spec.md는 reference로 보존. |
| SPEC-INSTALL-001      | KEEP-AS-IS         | (그대로)                                          | 거의 완료. 일부 polish 필요할 수 있으나 master plan 범위 외.                                                                  |
| REMEDIATION-PLAN-001  | ARCHIVE            | (archived)                                        | 본 master plan으로 대체된다. 슬라이스 분해는 흡수.                                                                            |

### 2.1 ABSORB 세부 매핑 (REMEDIATION 슬라이스 → 신규 SPEC)

| REMEDIATION 슬라이스          | 신규 SPEC                  | Phase   |
| ----------------------------- | -------------------------- | ------- |
| THEME Slice A (Schema)        | SPEC-LAYOUT-001 Slice 1    | Phase 1 |
| THEME Slice B (Resolver)      | SPEC-LAYOUT-001 Slice 2    | Phase 1 |
| THEME Slice C (ThemeProvider) | SPEC-LAYOUT-001 Slice 3    | Phase 1 |
| THEME Slice D (default theme) | SPEC-LAYOUT-001 Slice 4    | Phase 1 |
| THEME Slice E (Admin UI)      | SPEC-THEME-POLISH-001 Slice 1 | Phase 4 |
| THEME Slice F (Dark mode)     | SPEC-THEME-POLISH-001 Slice 2 | Phase 4 |
| CONTENT Slice B (tRPC + UI)   | SPEC-DOCUMENT-001 + SPEC-COMMENT-001 + SPEC-BOARD-CRUD-001 | Phase 2 |
| MailDispatcher (SMTP)         | SPEC-MAIL-001              | Phase 3 |
| ADMIN Slice G (widgets)       | SPEC-WIDGET-001             | Phase 1 (master plan에서 우선순위 상향) |
| ADMIN Slice H (export/import) | SPEC-ADMIN-EXTRAS-001 Slice 1 | Phase 5 |
| ADMIN Slice I (잔여 REQ)      | SPEC-ADMIN-EXTRAS-001 Slice 2 | Phase 5 |

---

## Section 3. 의존성 그래프

본 그래프는 research.md Section 3에서 도출되었으며, 5개 phase 배치의 근거다. 상세 다이어그램은 `dependency-graph.mmd`를 참조.

핵심 관찰:

- **member + module**은 모든 것의 기반이고 이미 완료됨 (SPEC-AUTH-001, SPEC-ADMIN-001 A~F)
- **layout, page, widget**은 3자 동시 — 하나만으로는 사용자 가시성 없음
- **document, comment**는 board의 의존성이지만 page에서도 (page는 widget을 통해 document를 노출함)
- **file, point**는 cross-cutting — board/document/comment가 모두 사용
- **addon**은 가장 늦은 시점 (Phase 4)

요약 그래프 (텍스트):

```
[member + module] (DONE)
       │
       ├── layout ─┐
       ├── page  ──┼─► (Phase 1 visible UI)
       ├── widget ─┘
       │
       ├── document ─┐
       ├── comment  ─┼─► (Phase 2 content domain)
       └── board    ─┘ (uses document+comment)
       │
       ├── file ─┐
       └── point ┴── (Phase 3 cross-cutting)
       │
       └── addon (Phase 4 extension)
       │
       └── admin polish (Phase 5)
```

자세한 노드 표현은 mermaid 다이어그램 파일을 참조.

---

## Section 4. 우선순위 큐와 phase 정의

### Phase 1 (P0): VISIBLE UI FOUNDATION

목표: **클린 설치 직후, 도메인 홈 URL을 방문하면 의미 있는 페이지가 보인다**

포함:

- SPEC-LAYOUT-001: 레이아웃 시스템 + default theme + ThemeResolver
- SPEC-PAGE-001: page 모듈 (ModuleInstance.content + widget 토큰)
- SPEC-WIDGET-001: 위젯 시스템 (token parser + content + login_info 빌트인 2개)
- (ADMIN-001 Slice G는 SPEC-WIDGET-001 안에 흡수 — 위젯 admin UI)

성공 기준:

- `/` 또는 `/{mid}` 요청 시 default 레이아웃 안에서 page 모듈 콘텐츠가 렌더된다
- page 본문 안의 `<rx-widget name="login_info" />` 토큰이 실제 로그인 위젯으로 치환된다
- 관리자가 admin/widgets 페이지에서 위젯 인스턴스를 추가/수정할 수 있다

이유: 이 phase가 완료되지 않으면 사용자는 어떤 진전도 시각적으로 확인할 수 없다. 사용자가 명시적으로 표현한 통증을 직접 해소하는 phase.

### Phase 2 (P0): CONTENT DOMAIN

목표: 게시판, 문서, 댓글이 동작한다 (CRUD + 표시)

포함:

- SPEC-DOCUMENT-001: document 도메인 독립 패키지 (현재 board 안의 코드 분리)
- SPEC-COMMENT-001: comment 도메인 독립 패키지
- SPEC-BOARD-CRUD-001: board 모듈 완성 (tRPC + UI + write/view 페이지)

성공 기준:

- `/board/{mid}`에서 게시판 목록이 보인다
- 글쓰기 → 작성 → 목록에 반영 → 상세보기 → 댓글 → 삭제 라이프사이클이 동작한다
- FTS 검색이 동작한다 (이미 search_vector 인프라 존재)

이유: REMEDIATION CONTENT Slice B의 통증을 해소. board는 rhymix CMS의 핵심 기능.

### Phase 3 (P1): MEMBER ECOSYSTEM

목표: 회원 도메인을 보강하고 cross-cutting 도메인을 추가한다

포함:

- SPEC-FILE-001: file 모듈 독립 패키지 + 업로드 endpoint + 이미지 resize
- SPEC-POINT-001: point 시스템 + 모듈 통합 (board/document/comment에서 호출)
- SPEC-MAIL-001: SMTP MailDispatcher (NoopMailDispatcher 대체)
- SPEC-AUTH-POLISH-001: 회원 프로필 확장(profile image, signature 등 — 선택)

성공 기준:

- 글쓰기 시 첨부파일 업로드, cover image 지정, 이미지 미리보기 동작
- 글/댓글 작성 시 작성자에게 포인트 자동 부여
- 회원가입 / 이메일 인증 / 비밀번호 재설정에서 실제 이메일이 발송된다

이유: production 배포의 hard prerequisite (메일 + 파일). 사용자가 가입을 완료할 수 있어야 한다.

### Phase 4 (P1): EXTENSION INFRASTRUCTURE + THEME POLISH

목표: 확장 시스템과 테마 관리자 UI

포함:

- SPEC-ADDON-001: 선언적 hook system (`onContentTransform`, `onPageView`, `onUserRender`) — 최소형
- SPEC-ADDON-AUTOLINK-001: 빌트인 autolink transformer (선택)
- SPEC-ADDON-PHOTOSWIPE-001: 빌트인 photoswipe wrapper (선택)
- SPEC-THEME-POLISH-001: THEME-001의 Slice E/F (Admin Theme UI + Dark mode)
- SPEC-MODULE-EXTEND-001: module_extend 별칭 시스템 (선택)

성공 기준:

- 관리자가 admin/site/design 페이지에서 색상/폰트/레이아웃을 GUI로 변경할 수 있다
- 다크모드 토글이 동작한다
- 글/댓글 안의 URL이 자동 링크로 변환된다 (autolink hook 동작)

이유: 사용자 가시성은 Phase 1에 확보됐고, 콘텐츠는 Phase 2에 확보됐다. 이제 운영자 편의를 추가한다.

### Phase 5 (P2): ADMIN COMPLETION + 운영 도구

목표: 멀티 테넌트 운영을 위한 admin 기능 + 잔여 REQ 마무리

포함:

- SPEC-ADMIN-EXTRAS-001: ADMIN Slice H (export/import) + Slice I (잔여 REQ: 2FA 강제, cross-level DnD, AdminLog IP 필터, 모듈 일괄 작업)
- SPEC-OBSERVABILITY-001: 로그/감사 대시보드 정밀화 (선택)
- SPEC-MODULE-BACKLOG-001: 백로그 모듈 (poll, tag, trash 독립화 등)의 evaluation — 실제 SPEC 작성은 별도

성공 기준:

- 관리자가 메뉴/모듈 인스턴스/콘텐츠를 JSON으로 export/import 한다
- AdminFavorites 동작
- 관리자가 ban한 IP가 admin log에서 필터된다

이유: production 안정성과 운영 편의. 사용자 통증은 이미 Phase 1~3에서 해소됐다.

---

## Section 5. 모듈별 SPEC 로드맵

### 5.1 SPEC-LAYOUT-001 (Phase 1, P0)

- 흡수: REMEDIATION THEME Slice A~D, SPEC-THEME-001의 관련 REQ
- Scope: Theme/Layout/Skin 도메인 패키지 (Prisma 스키마는 이미 존재) + ThemeResolver + ThemeProvider RSC + default theme 1개 + Tailwind 4 token integration
- Acceptance headline:
  - WHEN 요청이 도착하면, THE SYSTEM SHALL module-instance → domain → site → fallback 순서로 layout을 resolve 한다 (REQ-THEME-010)
  - THE SYSTEM SHALL `--rx-` 접두사 CSS 커스텀 프로퍼티로 모든 토큰을 노출한다 (REQ-THEME-030)
- Test count estimate: +41 (REMEDIATION A~D 누계 +41)
- Slice count: 4 (스키마 + Resolver + Provider + default theme)

### 5.2 SPEC-PAGE-001 (Phase 1, P0)

- 흡수: 신규 (레거시 modules/page 포팅)
- Scope: `Page` Prisma 모델 또는 `ModuleInstance.content`/`mcontent` 필드 추가, `packages/page/` 패키지(서비스 + 모듈 등록), `apps/web/app/[mid]` 라우트에서 page 모듈 디스패치, WYSIWYG 에디터(또는 textarea + raw HTML)로 페이지 본문 편집
- Acceptance headline:
  - WHEN 도메인의 indexModuleInstance가 page 타입이면, THE SYSTEM SHALL page 본문을 layout 안에서 렌더한다
  - WHEN page 본문에 `<rx-widget name="X" />` 토큰이 있으면, THE SYSTEM SHALL 해당 토큰을 widget의 출력으로 치환한다 (의존: SPEC-WIDGET-001)
- Test count estimate: +25
- Slice count: 3 (Prisma 모델 + page service + 본문 편집/렌더 UI)

### 5.3 SPEC-WIDGET-001 (Phase 1, P0)

- 흡수: REMEDIATION ADMIN Slice G + 신규 빌트인 위젯
- Scope: `<rx-widget>` token parser (RSC), 빌트인 widget 2개(login_info, content), widget admin UI(코드 생성기 + 인스턴스 관리), Tailwind 기본 widget style
- Acceptance headline:
  - WHEN page/layout 본문에 `<rx-widget name="login_info" />`가 있으면, THE SYSTEM SHALL 로그인 폼 또는 로그인 정보를 렌더한다
  - WHEN 미등록 위젯 + 비관리자면, THE SYSTEM SHALL 빈 `<span>`을 출력한다 (관리자에게는 `data-widget-error` 가시화)
- Test count estimate: +30 (REMEDIATION ADMIN-G의 +15 포함 + 빌트인 위젯 +15)
- Slice count: 4 (registry 보강 + token parser + builtin 2 + admin UI)

### 5.4 SPEC-DOCUMENT-001 (Phase 2, P0)

- 흡수: SPEC-CONTENT-001 일부 (Slice A document 부분 + Slice B document tRPC)
- Scope: `packages/document/` 신규 독립 패키지 (현재 `packages/board/src/document.ts`를 분리), document CRUD service, tRPC document router, 추가 변수 (`DocumentExtraKey` + extra_vars JSON), 카테고리 트리, 비밀글, 임시저장, 검색(FTS), 휴지통, 수정 이력
- Acceptance headline:
  - WHEN 회원이 document를 작성하면, THE SYSTEM SHALL Document를 생성하고 Board.documentCount를 증가시킨다 (REMEDIATION 인용)
  - WHEN 검색어가 입력되면, THE SYSTEM SHALL `search_vector @@ to_tsquery(...)` 쿼리로 결과를 반환한다
  - WHILE document.status가 SECRET이면, THE SYSTEM SHALL 작성자/관리자/비밀번호 보유자만 열람을 허용한다
- Test count estimate: +30
- Slice count: 3 (도메인 분리 + tRPC + UI)

### 5.5 SPEC-COMMENT-001 (Phase 2, P0)

- 흡수: SPEC-CONTENT-001 일부 (comment 부분)
- Scope: `packages/comment/` 신규 독립 패키지, 트리 구조(parent_srl + list_order), 추천/비추천/신고, 비밀 댓글, 알림 (선택)
- Acceptance headline:
  - WHEN 회원이 댓글을 작성하면, THE SYSTEM SHALL Comment를 생성하고 Document.commentCount를 증가시킨다
  - IF 댓글 depth가 5단계를 초과하면, THEN THE SYSTEM SHALL 그 이상의 depth를 거부한다
- Test count estimate: +22
- Slice count: 3 (도메인 분리 + tRPC + UI)

### 5.6 SPEC-BOARD-CRUD-001 (Phase 2, P0)

- 흡수: SPEC-CONTENT-001 board UI 부분
- Scope: `packages/board`를 document/comment에 의존하는 wrapper로 재정렬, board 라우트 UI(`/board/[mid]` 그룹), 게시판별 권한 매트릭스(grants), 게시판별 카테고리, 게시판별 extra_vars 설정 UI, 공지글 고정
- Acceptance headline:
  - WHEN board mid가 라우트에 매칭되면, THE SYSTEM SHALL 게시판 목록 페이지를 layout + skin 안에서 렌더한다
  - WHEN 비로그인 사용자가 글쓰기 폼에 접근하면, THE SYSTEM SHALL `/login`으로 redirect 한다
- Test count estimate: +25
- Slice count: 3 (의존 정리 + UI 라우트 + 권한 매트릭스 admin)

### 5.7 SPEC-FILE-001 (Phase 3, P1)

- 흡수: 신규 (현재 `packages/board/src/storage`를 승격)
- Scope: `packages/file/` 신규 독립 패키지, `apps/web/app/api/files/upload` route handler, 이미지 resize(sharp), cover image 지정, MIME 검증, ClamAV 통합(선택), cascading delete 이벤트
- Acceptance headline:
  - WHEN document가 삭제되면, THE SYSTEM SHALL 첨부된 FileAttachment를 함께 soft-delete 한다
  - WHEN 이미지가 업로드되면, THE SYSTEM SHALL 썸네일을 자동 생성하고 `cover_image` 플래그 후보로 표시한다
- Test count estimate: +20
- Slice count: 2 (패키지 분리 + upload API)

### 5.8 SPEC-POINT-001 (Phase 3, P1)

- 흡수: 신규
- Scope: `Point` Prisma 모델, `packages/point/` 신규 패키지, board/document/comment의 작성 트랜잭션 안에서 point.add 호출, 모듈별 포인트 정책(`module_config`), 포인트 레벨(아이콘 매핑 — addon으로 후순위)
- Acceptance headline:
  - WHEN 회원이 document를 작성하면, THE SYSTEM SHALL board의 point_per_document 설정에 따라 작성자에게 포인트를 부여한다
  - IF 포인트가 음수가 되면, THEN THE SYSTEM SHALL 0으로 클램핑한다 (또는 설정에 따라 부정 허용)
- Test count estimate: +15
- Slice count: 2 (point service + 모듈 통합)

### 5.9 SPEC-MAIL-001 (Phase 3, P1)

- 흡수: REMEDIATION Section 3.2
- Scope: `SmtpMailDispatcher` (nodemailer 기반), 환경변수 기반 dispatcher 선택, 이메일 템플릿 3개 (verify-email, password-reset, welcome), 재시도 정책
- Acceptance headline:
  - WHEN `SMTP_HOST` 환경변수가 설정되면, THE SYSTEM SHALL `SmtpMailDispatcher`를 사용한다
  - WHERE `SMTP_HOST`가 없으면, THE SYSTEM SHALL `NoopMailDispatcher`로 fallback하고 console.warn으로 알린다
  - WHEN SMTP 발송이 실패하면, THE SYSTEM SHALL 3회 재시도 후 audit log에 실패를 기록한다
- Test count estimate: +12
- Slice count: 1

### 5.10 SPEC-ADDON-001 (Phase 4, P1)

- 흡수: 신규 (레거시 modules/addon을 선언적 hook으로 재설계)
- Scope: `packages/core/src/addons/` 신규, hook registry, hook types(`onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`), admin/addons 페이지 (활성화 토글), addon 실행 위치 통합(layout 렌더, document/comment 렌더, middleware)
- Acceptance headline:
  - WHEN content가 렌더되기 전에, THE SYSTEM SHALL 활성화된 모든 `onContentTransform` hook을 순서대로 실행한다
  - IF hook이 예외를 throw하면, THEN THE SYSTEM SHALL 해당 addon을 자동 비활성화하고 admin log에 기록한다
- Test count estimate: +18
- Slice count: 2 (registry + 통합 지점)

### 5.11 SPEC-THEME-POLISH-001 (Phase 4, P1)

- 흡수: REMEDIATION THEME Slice E + F
- Scope: admin/site/design 3-pane editor, Theme/Layout/Skin assignment UI, dark mode toggle, token 편집 UI (Zod schema → 자동 폼)
- Acceptance headline:
  - WHEN 관리자가 token 값을 변경하면, THE SYSTEM SHALL 다음 HTTP 응답에서 rebuild 없이 새 값을 반영한다
  - WHEN 사용자가 다크모드 토글을 누르면, THE SYSTEM SHALL `<html class="dark">` 를 적용하고 localStorage에 저장한다
- Test count estimate: +28
- Slice count: 2 (admin UI + dark mode)

### 5.12 SPEC-ADMIN-EXTRAS-001 (Phase 5, P2)

- 흡수: REMEDIATION ADMIN Slice H + I
- Scope: export/import (메뉴/모듈 인스턴스/콘텐츠 JSON), AdminFavorites, 2FA 강제 (REQ-ADMIN-023), cross-level DnD (REQ-ADMIN-031), WidgetInstance DB 프리셋 (REQ-ADMIN-043), AdminLog IP 필터 (REQ-ADMIN-072), 모듈 일괄 작업 UI (REQ-ADMIN-090)
- Acceptance headline:
  - WHEN 관리자가 export 버튼을 누르면, THE SYSTEM SHALL 선택된 entity의 JSON 파일을 생성한다
  - IF 회원이 admin 그룹에 속하고 admin_2fa_required = true 이면, THEN THE SYSTEM SHALL 2FA 인증을 강제한다
- Test count estimate: +35
- Slice count: 2 (export-import + 잔여 REQ)

### 5.13 SPEC-MODULE-BACKLOG (Phase 5+, P3, optional)

미포팅 모듈의 향후 처리. 실제 작업은 별도 SPEC에서 진행되며 본 master plan 범위 외. 후보 모듈:

- poll (투표) — pollWidget이 존재하나 module 자체 누락
- tag (태그) — document.tags 컬럼에 인라인 저장으로 임시 대응 중
- rss / atom feed — Next.js route handler로 별도 구현 가능
- importer — 운영 도구
- spamfilter — content middleware
- session / communication / message — 별도 도메인
- editor / extravar — 일부는 이미 document 안에 흡수됨

---

## Section 6. 크로스 컷팅 관심사

본 단원은 phase에 묶이지 않지만 모든 phase에 영향을 주는 관심사. master plan은 결정을 내리지 않고 SPEC 작성 시점에 user 선택을 요구한다.

### 6.1 Mail

- 결정 사항: SMTP만 지원할지, Resend/SendGrid SaaS도 옵션으로 지원할지
- Phase 3 SPEC-MAIL-001에서 SMTP 우선. SaaS 백엔드는 동일 인터페이스(MailDispatcher)로 후속 SPEC에서 추가 가능

### 6.2 File Storage

- 결정 사항: 로컬 디스크 vs S3 vs 모두 (selectable)
- 이미 `packages/board/src/storage`에 memory/s3 양쪽 존재. SPEC-FILE-001에서 selectable로 설계 권고

### 6.3 Search (FTS)

- 현재 board의 document에 PostgreSQL FTS(`search_vector` GIN 인덱스) 적용됨
- comment에는 미적용 — SPEC-COMMENT-001에서 결정
- 백로그: Meilisearch 전환 (별도 SPEC, master plan 범위 외)

### 6.4 Permissions (ACL)

- 레거시 Rhymix는 모듈별 grants(list, view, write_document, write_comment, ...) × member group 매트릭스
- 현재 `packages/auth/src/rbac.ts`가 일부 구현
- SPEC-BOARD-CRUD-001 + SPEC-DOCUMENT-001에서 grant 매트릭스 통합 결정 필요

### 6.5 Multi-Domain

- 이미 `Domain` 모델 + `x-site-id` 헤더 라우팅으로 구현됨 (SPEC-ADMIN-001)
- 도메인별 default layout + default menu + default index module 매핑은 SPEC-LAYOUT-001에서 통합

### 6.6 Mobile Layout

- 결정 사항: 별도 m.layouts vs responsive Tailwind only
- master plan 권고: Phase 1에서는 responsive-only (mlayout_srl=-2 의미). 별도 모바일 레이아웃은 Phase 4 옵션.

### 6.7 Caching

- module_cache, menu_cache, widget_cache는 레거시의 핵심 성능 메커니즘
- 현재 어떤 phase에도 명시적으로 포함되지 않음 — 백로그 (SPEC-CACHE-001 후속)

### 6.8 i18n

- 레거시는 13개 언어 지원
- 현재 한국어/영어 중심, next-intl 인프라 일부 (install wizard)
- 백로그 — 별도 SPEC

---

## Section 7. 위험요인 (Risk Register)

| 위험                                                                | 가능성 | 영향 | 완화책                                                                                                                                          |
| ------------------------------------------------------------------- | ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PHP/Smarty 템플릿 → JSX 패러다임 차이로 layout/skin 포팅 시 비용 폭증 | 높음    | 높음 | xedition 레이아웃은 SPEC 범위 외. default 레이아웃 1개만 Phase 1에 포함. 나머지는 백로그                                                       |
| widget token 파싱 시 보안(XSS, SSRF) 취약                          | 중간    | 높음 | DOMPurify 같은 sanitizer를 RSC 단에서 강제 + widget arg는 Zod로 strict validation                                                              |
| document/comment 독립화로 board 회귀                                 | 중간    | 중간 | 기존 board 테스트(40+개)를 회귀 가드로 사용. 분리 후 board는 document/comment service를 호출하는 thin wrapper                                  |
| file storage 경로/권한 (filesystem vs S3)                            | 중간    | 중간 | storage abstraction은 이미 존재. SPEC-FILE-001에서 default는 local, env로 S3 전환                                                              |
| addon hook의 실행 순서/예외 격리                                     | 중간    | 중간 | 선언적 hook system에서는 PHP처럼 임의 코드 실행 X. 각 hook는 TS function이며 try/catch + 자동 비활성화                                          |
| multi-domain 라우팅과 layout/skin assignment의 충돌                 | 낮음    | 중간 | ThemeAssignment scope = `module_instance > domain > site` 우선순위 명시. SPEC-LAYOUT-001 Slice 2(Resolver)에서 통합 테스트                       |
| Mail 발송 실패가 가입 UX 차단                                       | 중간    | 중간 | 가입 record 생성은 메일 발송과 독립적. 메일은 best-effort, 실패 시 재시도 큐 (Phase 5 운영 도구로 보강)                                         |
| 캐시 부재로 인한 성능 (Phase 1 출시 시)                              | 중간    | 중간 | Phase 1은 SSR 중심. cache는 백로그. 초기 트래픽 작을 것으로 가정                                                                                |
| 기존 SPEC들의 잔여 REQ가 phase 안에서 충돌                          | 낮음    | 낮음 | Section 2의 ABSORB 매핑이 모든 잔여 REQ를 새 SPEC에 할당함. SPEC 작성 시 cross-reference 강제                                                  |
| 사용자가 Phase 1만 보고 만족 후 다음 phase 진행이 정체              | 낮음    | 중간 | master plan에 phase 간 명시적 acceptance gate 정의. Phase 완료 시 user 승인 필수 (다음 phase 시작 전)                                          |

---

## Section 8. 비범위 (Out-of-Scope)

본 master plan은 다음을 다루지 않는다. 별도 SPEC 또는 백로그로 처리.

### 8.1 백로그 모듈 (SPEC-MODULE-BACKLOG-001 후속)

- poll, tag, trash(독립화), rss, counter, spamfilter, importer, krzip
- advanced_mailer, editor, extravar(이미 일부 흡수)
- session, communication, message, ncenterlite
- integration_search, install(완료), autoinstall, adminlogging(흡수됨)

### 8.2 인프라

- 캐싱 레이어 (Redis) — 별도 SPEC-INFRA-001 (후속)
- 메시지 큐 / 백그라운드 작업 — 별도 SPEC
- 모니터링 / 관측성 (OpenTelemetry) — 별도 SPEC
- E2E 테스트 자동화 — 부분 존재 (apps/web 안)

### 8.3 외부 통합

- 외부 OAuth (Google, GitHub, Naver) — SPEC-AUTH-OAUTH-001 후속
- 2FA TOTP 자체 구현 — REQ-AUTH-042 확장 포인트만 존재
- Meilisearch / Algolia 검색 백엔드 — 백로그

### 8.4 운영 데이터 마이그레이션

- 실제 운영 중인 Rhymix(PHP) → rhymix-ts로 데이터 이전은 코드 포팅 완료 후 별도 SPEC

### 8.5 Mobile Native

- PWA, React Native, Capacitor 등 — 본 master plan 범위 외

---

## Section 9. Acceptance & 다음 단계

### 9.1 사용자 승인 결과 (2026-05-25 확정)

본 master plan은 사용자 검토 후 다음과 같이 승인되었다 — 모든 6개 항목 권고안 채택:

1. **Phase 우선순위 확정** — APPROVED. Phase 1(Visible UI) → 2(Content) → 3(Member ecosystem) → 4(Extension) → 5(Admin polish) 순서로 진행한다.
2. **모듈 매핑 확정** — APPROVED. Section 1의 12개 모듈 → TS 패키지 매핑을 그대로 사용한다.
3. **SPEC 흡수 매트릭스 확정** — APPROVED. Section 2의 ABSORB 결정(특히 THEME-001 spec.md를 Phase 1+4로 분할)을 채택한다.
4. **신규 패키지 5개 추가 합의** — APPROVED. `packages/document`, `packages/comment`, `packages/page`, `packages/file`, `packages/point` (+ `packages/core/src/addons`)를 신규 추가한다.
5. **백로그 처분** — APPROVED. Section 8의 비범위 모듈/기능을 master plan에서 제외하고 별도 SPEC-MODULE-BACKLOG에서 평가한다.
6. **5개 열린 질문 결정**:
   - **모바일 레이아웃**: **Responsive CSS only** — Tailwind breakpoints로 통일. m.layouts 시스템 자체를 폐기. LayoutAssignment.deviceMode 필드는 SPEC-LAYOUT-001에서 제거 또는 default-only.
   - **File storage**: **S3 + 로컬 추상화 (StorageDriver 인터페이스)** — 환경변수 `STORAGE_BACKEND`(local|s3)로 선택. dev/소규모는 로컬, production은 S3. `packages/board`의 기존 storage abstraction을 `packages/file`로 승격하여 재사용.
   - **Addon system**: **선언적 hook만** — `defineAddon({ on: { 'document.created': handler, 'page.beforeRender': transform } })` API. 자유 코드 실행 없음. autolink/photoswipe/point_level_icon은 네이티브 TS로 재작성 후 컴파일 시 등록.
   - **Xedition 레이아웃**: **폐기** — `themes/default` 1개만 Phase 1에서 포팅. xedition은 백로그(필요 시 SPEC-XEDITION-001).
   - **Point system**: **Phase 3 cross-cutting** — file/mail과 함께 회원 생태계로. board/document/comment는 point 이벤트를 emit하지만 직접 의존하지 않는다 (event-based 약결합).

### 9.2 첫 번째 SPEC 권고 (Phase 1 시작점)

연구 결과 + 의존성 분석에 따라 다음 순서를 권장:

**시작 SPEC: SPEC-LAYOUT-001** (Phase 1 Slice 1: 스키마와 도메인 패키지)

근거:

- Layout 시스템은 page와 widget의 컨테이너이므로 가장 먼저 필요하다 (의존성 분석)
- REMEDIATION THEME Slice A~D는 이미 잘 분해되어 있어 그대로 흡수 가능
- 현재 `packages/core/src/theme/` 디렉토리에 27개 파일이 이미 시작되어 있으므로 진척 가속 가능 (zero from scratch가 아님)
- 첫 슬라이스(Prisma 스키마) 완료 시 user는 `prisma migrate` 출력에서 진전을 즉시 확인할 수 있다 (작은 가시적 승리)

병행 가능:

- SPEC-PAGE-001 Slice 1 (Page Prisma 모델 분리/추가) — 의존성 없음, layout과 동시 진행
- SPEC-WIDGET-001 Slice 1 (registry 정리) — 이미 골조 있으니 가볍게

Phase 1 완료 정의:

- 클린 설치 → 도메인 `example.com` 방문 → default 레이아웃 안에서 page 인스턴스가 로드되고 `<rx-widget name="login_info" />` 토큰이 실제 로그인 폼으로 치환되는 것을 사용자가 브라우저에서 직접 확인

### 9.3 SPEC 작성 순서 (제안)

승인 후 다음 순서로 individual SPEC을 작성:

```
Phase 1: SPEC-LAYOUT-001 → SPEC-WIDGET-001 → SPEC-PAGE-001
Phase 2: SPEC-DOCUMENT-001 → SPEC-COMMENT-001 → SPEC-BOARD-CRUD-001
Phase 3: SPEC-FILE-001 → SPEC-POINT-001 → SPEC-MAIL-001
Phase 4: SPEC-ADDON-001 → SPEC-THEME-POLISH-001
Phase 5: SPEC-ADMIN-EXTRAS-001
```

각 SPEC은 본 master plan의 Section 5에 정의된 Acceptance headline을 spec.md의 Acceptance Criteria 초안으로 사용한다. SPEC 작성 시 `/moai plan {SPEC-NAME}`이 manager-spec agent에 위임된다.

### 9.4 Master Plan의 생명주기

- 본 plan은 living document다. Phase 1 완료 시 phase 2~5의 detail이 보강된다.
- 각 phase 완료 시 본 spec.md HISTORY 섹션에 변경 사항이 추가된다.
- phase 간 trade-off가 발생하면 본 plan의 Section 6/7을 업데이트한다.
- 백로그 모듈은 추후 SPEC-MODULE-BACKLOG-001로 evaluation 진행.

---

## Exclusions (What NOT to Build)

본 master plan은 다음을 명시적으로 빌드하지 않는다 (Section 8 요약):

1. **백로그 모듈**: poll, tag(독립), rss, counter, spamfilter, importer, krzip, advanced_mailer, editor, extravar(독립), session, communication, message, ncenterlite, integration_search, autoinstall — 별도 SPEC-MODULE-BACKLOG에서 평가
2. **데이터 마이그레이션**: 실제 PHP Rhymix 데이터 → rhymix-ts 이전 스크립트 — 코드 포팅 완료 후 별도 SPEC
3. **외부 OAuth/SSO**: Google, GitHub, Naver, KakaoTalk 등 — SPEC-AUTH-OAUTH-001 후속
4. **2FA TOTP 자체 구현**: SPEC-AUTH-001의 REQ-AUTH-042 확장 포인트만 존재. 실제 구현은 후속 SPEC
5. **메시지 큐 / 백그라운드 작업**: Redis + BullMQ 등 — SPEC-INFRA-001 후속
6. **캐싱 레이어**: Redis 등 — SPEC-INFRA-CACHE-001 후속
7. **외부 검색 엔진**: Meilisearch, Algolia, Elasticsearch — PostgreSQL FTS로 충분. 후속 옵션
8. **모니터링 / 관측성**: OpenTelemetry, Sentry — 별도 SPEC
9. **xedition 레이아웃 포팅**: default 1개만 Phase 1. xedition은 백로그
10. **별도 모바일 레이아웃 (m.layouts)**: responsive-only로 통일. 별도 mobile-specific 레이아웃은 Phase 4 옵션
11. **임의 PHP 코드 실행 형태의 addon**: Phase 4 SPEC-ADDON-001은 선언적 hook system으로만 구현. 레거시 `*.addon.php` 형태의 자유 코드 삽입은 보안상 미지원
12. **PWA / Native App**: 본 plan 범위 외
13. **i18n 13개 언어 풀 지원**: 한국어 + 영어 기본. 13개 풀 지원은 별도 SPEC

---

## Acceptance Criteria (Master Plan 자체)

본 master plan 문서가 "유효한 master plan"이 되기 위한 자체 acceptance:

- GIVEN 본 spec.md, research.md, dependency-graph.mmd가 모두 존재하고, WHEN 사용자가 검토하면, THEN 다음이 모두 충족된다:
  - Section 1~5가 12개 레거시 모듈 모두를 다룬다
  - Section 2가 5개 기존 SPEC + REMEDIATION-PLAN-001의 처분을 명시한다
  - Section 4의 5개 phase가 각각 명확한 success criteria를 가진다
  - Section 9의 첫 SPEC 권고가 의존성 분석과 일관된다
  - Section 8의 Out-of-Scope가 명시적으로 나열되어 있다
- GIVEN 본 plan이 승인되고, WHEN 다음 `/moai plan SPEC-LAYOUT-001`이 호출되면, THEN manager-spec은 본 master plan의 Section 5.1을 입력으로 사용하여 SPEC-LAYOUT-001 spec.md를 생성한다

---

Version: 1.1.0
Status: approved (2026-05-25)
Next Action: `/moai plan SPEC-LAYOUT-001` 호출 → manager-spec이 본 master plan Section 5.1을 입력으로 SPEC-LAYOUT-001 spec.md 생성 → Phase 1 시작
