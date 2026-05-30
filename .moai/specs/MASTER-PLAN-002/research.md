---
id: MASTER-PLAN-002-research
title: Legacy Rhymix → rhymix-ts 포팅 사전조사 (Ground Truth)
created: 2026-05-25
status: complete
source-legacy: D:\project\rhymix (PHP Rhymix CMS, running at http://localhost:8080/)
source-current: D:\project\rhymix-ts
scope: Core CMS 12 modules + Widget/Layout/Addon subsystems
related-specs: SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-CONTENT-001, SPEC-THEME-001, SPEC-INSTALL-001, REMEDIATION-PLAN-001
---

# Research — 레거시 Rhymix 코드 베이스 실측 조사

본 문서는 MASTER-PLAN-002의 사전 분석 산출물이다. 추측이 아닌 실제 레거시 파일(D:\project\rhymix) 직접 읽기를 통해 도출된 사실들만 정리한다. 모든 주장은 적어도 하나의 검증 가능한 파일 경로를 동반한다.

---

## 0. 조사 범위와 방법

조사 대상:

- 레거시 12개 코어 모듈: addon, board, comment, document, file, layout, member, menu, module, page, point, widget
- 레거시 widget 디렉토리: 6개 (content, counter_status, language_select, login_info, mcontent, pollWidget)
- 레거시 widgetstyles: 1개 (simple)
- 레거시 layouts: 3개 (default, user_layout, xedition)
- 레거시 m.layouts: 3개 (colorCode, default, simpleGray)
- 레거시 addons: 6개 (autolink, photoswipe, point_level_icon, counter, member_extra_info, adminlogging)

검증 자료:

- 각 모듈의 `conf/info.xml` (모듈 메타데이터)
- 각 모듈의 `conf/module.xml` (액션/이벤트 핸들러/메뉴 정의)
- 각 모듈의 `schemas/*.xml` (DB 테이블 정의)
- 각 모듈의 `queries/*.xml` (도메인 연산 — board, member에서 200+개 확인)
- 1개 위젯 클래스 (`widgets/content/content.class.php`) — 위젯 API 패턴 도출용
- 1개 애드온 (`addons/autolink/autolink.addon.php`) — 훅 호출 위치 도출용
- Grep 결과: `called_position` 모든 출현 (6개 addon에서 후크 명세 추출)

본 문서가 다루지 않는 것:

- PHP 컨트롤러/뷰의 라인 단위 분석 (너무 큼 — 토큰 효율)
- 레거시 Smarty 템플릿의 변환 규칙 (별도 SPEC에서 진행)
- 운영 데이터 마이그레이션 (포팅 완료 후 별도 SPEC)

---

## 1. 레거시 12개 모듈 분석 결과

### 1.1 member 모듈 (회원)

- 경로: `D:\project\rhymix\modules\member\`
- 카테고리: `member` (info.xml line 23)
- 쿼리 수: 100+개 (queries/*.xml). `getMemberInfo*`, `insertMember`, `updateMember`, `deleteMember`, `insertAuthMail`, `insertAutologin`, `insertMemberDevice`, `chkDenied*`, `getJoinForm*`, `getMemberGroups`, `getDeniedIDList`, `getLoginCountByIp` 등.
- 핵심 테이블 (schemas/*.xml): `member`, `member_agreed`, `member_auth_mail`, `member_auth_sms`, `member_autologin`, `member_count_history`, `member_denied_nick_name`, `member_denied_user_id`, `member_devices`, `member_group`, `member_group_member`, `member_join_form`, `member_login_count`, `member_managed_email_hosts`, `member_nickname_log`, `member_scrap`, `member_scrap_folders` (총 17개)

도메인 책임:

- 회원 가입/수정/탈퇴, 다중 식별자 로그인(user_id / email / phone)
- 그룹 권한 (`member_group`, `member_group_member`)
- 자동 로그인 (`member_autologin`, security_key 회전)
- 디바이스 추적 (`member_devices`)
- 이메일/SMS 인증 (`member_auth_mail`, `member_auth_sms`)
- 가입 폼 커스터마이징 (`member_join_form`)
- 차단 목록 (`member_denied_user_id`, `member_denied_nick_name`)
- IP 기반 레이트 리미팅 (`member_login_count`)
- 회원 스크랩 (`member_scrap`, `member_scrap_folders`)
- 이메일 호스트 관리 (`member_managed_email_hosts`)

PHP→TS 매핑 노트:

- 17개 레거시 테이블 → Prisma 12개 모델로 압축 (`User`, `MemberGroup`, `MemberGroupMember`, `AutoLogin`, `MemberDevice`, `EmailAuthToken`, `JoinFormField`, `MemberAgreement`, `LoginAttempt`, `DeniedIdentifier`, `ContentRateLimit`, `MemberNicknameLog`). 일부는 이미 `packages/db/prisma/schema.prisma`에 존재 (line 272~466에서 확인).
- 회원 스크랩(`member_scrap`)은 백로그로 미루기 — 필수 아님.
- SMS 인증은 SPEC-AUTH-001에서 확장 포인트로 보존됨 (REQ-AUTH-042).

### 1.2 board 모듈 (게시판)

- 경로: `D:\project\rhymix\modules\board\`
- 카테고리: `service` (info.xml line 23)
- module.xml 권한(`grants`): `list`, `view`, `write_document`, `write_comment`, `vote_log_view`, `update_view`, `consultation_read` (총 7개)
- 액션 ~50개 (module.xml line 58~129). 라우팅 패턴: `/$document_srl`, `/category/$category`, `/page/$page`, `/write`, `/comment/$comment_srl/edit` 등.
- 이벤트 핸들러:
  - `after member.getMemberMenu` → 회원 메뉴에 게시판 항목 삽입
  - `after menu.getModuleListInSitemap` → 사이트맵에 게시판 인스턴스 추가
  - `after module.procModuleAdminCopyModule` → 모듈 복제 시 게시판 설정 복제
- 자체 schemas는 없음 — `documents`/`comments`/`document_categories` 등에 의존

도메인 책임:

- 게시판 인스턴스 (모듈 인스턴스 + 게시판 특화 설정)
- 카테고리(category) 관리
- 추가 변수(`extra_keys`/`extra_vars`)
- 권한 매트릭스(`grants`)
- 공지글 처리
- 글쓰기 폼 라우팅

PHP→TS 매핑 노트:

- board는 **document/comment에 의존하는 thin wrapper 성격**. 도메인 entity는 document/comment가 소유한다.
- 현재 rhymix-ts에는 `packages/board`가 이미 존재 — service/category/permission/vote/search/attachment/trash/history 등 30+개 파일이 이미 구현됨.
- 현재 누락: tRPC 라우터, board UI(`/board/[mid]` 페이지 그룹).

### 1.3 document 모듈 (문서)

- 경로: `D:\project\rhymix\modules\document\`
- 카테고리: `content`
- 핵심 테이블 (schemas/*.xml 12개):
  - `documents` (PK: document_srl) — title, content, member_srl, module_srl, category_srl, regdate, list_order, update_order, voted_count, blamed_count, comment_count, status (PUBLIC/SECRET/TEMP)
  - `document_aliases` — 별칭 URL
  - `document_categories` — 카테고리 트리
  - `document_declared`, `document_declared_log` — 신고
  - `document_extra_keys`, `document_extra_vars` — 동적 필드
  - `document_histories` — 수정 이력
  - `document_readed_log` — 조회 추적
  - `document_trash` — 휴지통
  - `document_update_log` — 변경 로그
  - `document_voted_log` — 추천 로그
- module.xml 액션: vote up/down, declare(신고), tempSave, manage, deleteChecked, alias 관리, extraVar 관리, trash 관리
- 이벤트 핸들러:
  - `after module.deleteModule` → 모듈 삭제 시 문서 일괄 삭제
  - `after file.deleteFile` → 파일 삭제 시 인용 자동 정리
  - `before module.dispAdditionSetup` → 모듈 추가 설정 화면에 document 탭 주입

도메인 책임:

- 문서 CRUD + 상태(PUBLIC/SECRET/TEMP)
- 카테고리 분류(트리)
- 태그 (`tags` text 컬럼, GIN 인덱스 후보)
- 추가 변수 (extra_keys 정의 + extra_vars 값)
- 추천/비추천/신고 + 로그
- 수정 이력(`document_histories`, `document_update_log`)
- 휴지통 (soft delete)
- 비밀번호 보호(`password`)
- 별칭 URL(`document_aliases`)

PHP→TS 매핑 노트:

- 현재 Prisma `Document`(schema.prisma line 608~664)는 일부 컬럼을 보존 (title, content, member_srl, list_order 등). FTS는 `search_vector` GENERATED column로 이미 구현됨.
- `document_extra_keys`/`document_extra_vars`는 Prisma `DocumentExtraKey`(line 728)에 정의. JSONB 컬럼으로 압축할 여지 있음.
- 현재 누락:
  - tRPC 라우터 (REMEDIATION-PLAN Section 3.1에서 미착수로 명시됨)
  - `Document` 독립 모듈 등록 (board 외에서 document를 직접 노출하는 wiki/blog 모듈 등)
  - 수정 이력 UI
  - 신고 워크플로우 UI

### 1.4 comment 모듈 (댓글)

- 경로: `D:\project\rhymix\modules\comment\`
- 카테고리: `content`
- 핵심 테이블 (schemas/*.xml 5개):
  - `comments` (PK: comment_srl, parent_srl로 트리, list_order 시간순)
  - `comments_list` — 댓글 목록 캐시
  - `comment_declared`, `comment_declared_log`
  - `comment_voted_log`
- module.xml 액션: voteUp/Down, declare, declareCancel, admin list, admin moveToTrash
- 이벤트 핸들러:
  - `after document.deleteDocument` → 문서 삭제 시 댓글 일괄 삭제
  - `after module.deleteModule` → 모듈 삭제 시 댓글 일괄 삭제
  - `after document.moveDocumentModule` → 문서 이동 시 댓글도 함께 이동
  - `before document.copyDocumentModule.each` → 문서 복제 시 댓글 복제

도메인 책임:

- 댓글 CRUD (인접리스트 트리 구조: parent_srl + list_order)
- 추천/비추천 + 로그
- 신고 + 로그
- 비밀 댓글(`is_secret` Y/N)
- 비밀번호 보호(`password`)

PHP→TS 매핑 노트:

- 현재 Prisma `Comment`(schema.prisma line 666~700)는 핵심 컬럼 구비.
- 트리 구조는 `parentId Int? + listOrder Int + status enum` 로 매핑 가능.
- 현재 누락: 댓글 독립 도메인 패키지 (`packages/comment`가 없음 — board 패키지 안에 `comment.ts`만 존재).
- comment를 독립 패키지로 빼야 하는 이유: document와 마찬가지로 board 외 다른 모듈(예: wiki, page)도 댓글 기능을 공유해야 함.

### 1.5 page 모듈 (페이지)

- 경로: `D:\project\rhymix\modules\page\`
- 카테고리: `service`
- module.xml grants: `modify` (manager만)
- 액션 (module.xml line 9~32): `dispPageIndex`, `dispPageAdminContent`, `dispPageAdminContentModify`, `dispPageAdminMobileContent`, `procPageAdminInsert/Update/Delete/InsertContent`
- 자체 schemas 없음 — `modules.content` / `modules.mcontent` 컬럼을 직접 사용 (modules.xml line 18~19 `content type=bigtext`, `mcontent type=bigtext`)
- 페이지 모듈은 **WYSIWYG로 작성된 단일 HTML 블록을 모듈 인스턴스에 직접 저장**하는 가장 단순한 모듈 타입. 게시판처럼 다중 문서 없음.

도메인 책임:

- "고정 페이지"(랜딩, 회사소개 등)를 mid 단위로 노출
- 페이지 본문(`content` 컬럼)에 `<rx-widget>` 토큰을 박아서 widget을 임베드 (XE에서는 `<img class="zbxe_widget_output">` 형태 - widget controller의 `triggerWidgetCompile`이 `before display` 시점에 파싱)
- 데스크톱(`content`)과 모바일(`mcontent`)을 별도 저장

PHP→TS 매핑 노트:

- 게시판처럼 documents 테이블을 쓰지 않음. **모듈 인스턴스 자체에 본문이 저장됨**.
- 현재 Prisma `ModuleInstance.content` 컬럼이 없음 — 추가 필요. 또는 별도 `PageContent` 모델 도입.
- widget 토큰 파싱 로직(`<rx-widget>` → React Component)이 필수.
- page는 본질적으로 **레이아웃 안에서 widget을 조립하는 컨테이너** — 사이트 home, About, 메인 랜딩 등 모든 정적 페이지가 이 모듈로 만들어진다.
- 사용자가 "홈 화면이 비었다"는 통증을 호소한 근본 원인은 **page 모듈이 없기 때문**. 도메인의 `indexModuleInstance`가 일반적으로 page 인스턴스를 가리키도록 설정되는데, 이 모듈이 없으므로 어떤 도메인도 의미 있는 홈을 가질 수 없다.

### 1.6 widget 모듈 (위젯 시스템)

- 경로: `D:\project\rhymix\modules\widget\`
- 카테고리: `construction`
- module.xml 액션: `dispWidgetInfo`, `dispWidgetGenerateCode`, `procWidgetGenerateCode`, `dispWidgetAdminDownloadedList` 등
- 이벤트 핸들러: `before display` → `triggerWidgetCompile` (HTML 응답 직전에 위젯 토큰을 실제 위젯 출력물로 치환)
- 자체 schemas 없음 — 위젯 설정은 페이지/레이아웃 본문의 `<img class="zbxe_widget_output">` 토큰에 직접 인코딩됨 (즉 위젯 인스턴스는 별도 테이블이 아닌 본문 임베드)
- 위젯 구현체는 `D:\project\rhymix\widgets\{widgetName}\` 디렉토리:
  - 6개 위젯: content, counter_status, language_select, login_info, mcontent, pollWidget
  - 각 위젯은 `{widgetName}.class.php` + `conf/info.xml` (extra_vars 명세) + `skins/{skin}/skin.xml` + skin HTML 템플릿으로 구성

위젯 API (content.class.php 기준):

- `class content extends WidgetHandler`
- `function proc($args)` — extra_vars에서 받은 args로 출력 HTML 반환
- `$args` 필드는 conf/info.xml의 `<extra_vars>` 정의에서 자동 매핑
- 위젯 출력은 skin HTML (.html) 템플릿으로 렌더됨

위젯 스타일 (widgetstyles/simple):

- 위젯 출력을 감싸는 외곽 데코레이션 (제목, more 링크, 컬러셋)
- skin.xml + style.css + widgetstyle.html

위젯 토큰 인라인 임베드 (legacy):

```
<img class="zbxe_widget_output" widget="content" target_module_srl="123" list_count="5" ... />
```

`display` 이벤트가 발생하면 widget controller가 위 이미지 토큰을 파싱하여 `widget.proc($args)`를 호출하고 출력 HTML로 치환한다.

PHP→TS 매핑 노트:

- 현재 rhymix-ts에 `packages/core/src/widgets/`가 존재 — `registry.ts`, `types.ts` (REMEDIATION-PLAN Section 4.1 = ADMIN Slice G에서 계획됨).
- 현재 누락:
  - `<rx-widget>` 토큰 파서 — page/layout 본문 안의 token을 React component로 치환
  - 6개 빌트인 위젯 구현 (content, login_info 등 — Phase 1 우선순위는 page/content 위젯)
  - 위젯 스타일 (`WidgetStyle` Prisma 모델은 이미 있음 — line 942)
  - 관리자 위젯 코드 생성 UI (제너레이터: 사이트 운영자가 위젯을 GUI로 구성하면 HTML 토큰을 자동 생성)

### 1.7 file 모듈 (첨부파일)

- 경로: `D:\project\rhymix\modules\file\`
- 카테고리: `content`
- 핵심 테이블 (schemas/*.xml):
  - `files` (PK: file_srl) — upload_target_srl/type, member_srl, source_filename, uploaded_filename, file_size, mime_type, width, height, duration, isvalid Y/N, cover_image, regdate, ipaddress
  - `files_changelog` — 파일 변경 이력
- module.xml 액션: procFileUpload, procFileDownload, procFileSetCoverImage, procFileImageResize, admin upload/download/other config, admin edit
- 이벤트 핸들러 (file → 다른 모듈로 cascading):
  - `after document.deleteDocument` → 문서 삭제 시 첨부 자동 삭제
  - `after comment.deleteComment` → 댓글 삭제 시 첨부 자동 삭제
  - `after editor.deleteSavedDoc` → 임시저장 삭제 시 첨부 정리
  - `after module.deleteModule` → 모듈 삭제 시 첨부 정리
  - `after document.moveDocumentModule` → 문서 이동 시 첨부도 이동

도메인 책임:

- 파일 업로드(저장은 `files/` 디렉토리, 경로는 `uploaded_filename`)
- 다운로드 카운트
- 이미지 resize / thumbnail
- 커버 이미지 지정 (썸네일용)
- isvalid 플래그 (업로드는 됐지만 본문에 연결되지 않은 파일 추적)

PHP→TS 매핑 노트:

- 현재 Prisma `FileAttachment`(schema.prisma line 748~777)가 이미 정의됨.
- 현재 `packages/board/src/storage/`에 storage abstraction이 있음(memory.ts, s3.ts, scanner.ts) — 이미 cloud-aware.
- 현재 누락:
  - 실제 파일 업로드 endpoint (`procFileUpload`에 대응)
  - 이미지 resize 파이프라인
  - cover_image 지정 UI
  - 모듈 간 cascading delete 이벤트 (현재 board에는 일부 구현되었으나 전체 cross-module 일관성은 미보장)

### 1.8 point 모듈 (포인트)

- 경로: `D:\project\rhymix\modules\point\`
- 카테고리: `member`
- 핵심 테이블 (schemas/point.xml): `point` 단일 — `member_srl`(PK) + `point` (number)
- module.xml 액션: admin config (포인트 정책), admin module config (게시판별 포인트), recal, apply, reset
- 자체 이벤트 핸들러는 없으나, member/document/comment에서 직간접적으로 point.addPoint를 호출하는 패턴이 사용됨 (controller side, schemas에 직접 나타나지 않음)

도메인 책임:

- 회원별 포인트 잔액 관리 (단일 컬럼)
- 모듈별 포인트 정책 (게시판마다 글쓰기/댓글/추천에 부여할 포인트 다르게)
- 포인트 레벨 (포인트 구간별 아이콘 — addons/point_level_icon)
- 일괄 재계산(reCal), 일괄 적용(apply), 리셋(reset)

PHP→TS 매핑 노트:

- 현재 Prisma 스키마에 `Point` 모델 없음 — 추가 필요.
- 매우 단순한 도메인 — Slice 1개로 충분.
- 다른 모듈(board, document, comment)이 트랜잭션 안에서 point.add(memberId, amount, reason)를 호출하는 cross-module 통합 패턴이 필요.

### 1.9 menu 모듈 (메뉴)

- 경로: `D:\project\rhymix\modules\menu\`
- 카테고리: `construction`
- 핵심 테이블 (schemas/*.xml 3개):
  - `menu` (PK: menu_srl) — title, site_srl, listorder
  - `menu_item` (PK: menu_item_srl) — parent_srl(트리), menu_srl, name, icon, class, url, is_shortcut Y/N, open_window Y/N, expand, group_srls (ACL)
  - `menu_layout` — 메뉴와 레이아웃 연결
- module.xml 액션: admin siteMap, admin siteDesign, insertItem, updateItem, moveItem, copyItem, updateAuth, buttonUpload, makeXmlFile

도메인 책임:

- 사이트 메뉴 트리 (parent_srl + listorder)
- 메뉴 항목: 라벨, URL, 아이콘, 새 창 여부, ACL(`group_srls`)
- 메뉴 레이아웃 연결 (한 사이트에 GNB/UNB/FNB 등 여러 메뉴를 다른 영역에 배치)
- XML 파일로 export/import (`makeXmlFile`)

PHP→TS 매핑 노트:

- 현재 Prisma `Menu`(schema.prisma line 147~165) + `MenuItem`(line 166~194) 이미 정의됨.
- 현재 ADMIN Slice C에서 메뉴 CRUD는 이미 구현됨 (apps/web/app/admin/menu/page.tsx 등 존재).
- 미흡: cross-level drag-and-drop (REMEDIATION Section 4.3 REQ-ADMIN-031 잔여 항목)

### 1.10 layout 모듈 (레이아웃)

- 경로: `D:\project\rhymix\modules\layout\`
- 카테고리: `construction`
- 핵심 테이블 (schemas/layouts.xml): `layouts` — site_srl, layout(name), title, layout_path, extra_vars(JSON), module_srl, layout_type (P=PC, M=Mobile)
- module.xml 액션: admin installedList, admin instance crud, copyLayout, codeUpdate, codeReset, userImageUpload/Delete, configImageUpload/Delete, userLayoutImport/Export
- 레이아웃 구현체는 `D:\project\rhymix\layouts\{layoutName}\`:
  - 3개 데스크톱 레이아웃: default, user_layout, xedition
  - 각 레이아웃: `conf/info.xml`(메타 + extra_vars 정의) + `layout.html`(Smarty 템플릿) + CSS + 이미지

레이아웃 정의 구조 (xedition 기준):

- `<menus>`: 레이아웃이 요구하는 메뉴 슬롯 정의 (`GNB`, `UNB`, `FNB`)
- `<extra_vars>`: 관리자가 입력하는 설정 (예: use_demo, layout_type, menu_type_main)
- `layout.html`: 실제 HTML + Smarty 변수 치환

m.layouts (모바일):

- `D:\project\rhymix\m.layouts\{name}\` — 3개 (colorCode, default, simpleGray)
- 데스크톱 레이아웃과 별도 디렉토리 — Rhymix는 PC/모바일 레이아웃을 다른 곳에서 관리
- `mlayout_srl = -2` → "PC와 동일 (responsive)" 의미 (REQ-THEME-091, REMEDIATION-PLAN 참조)

PHP→TS 매핑 노트:

- 현재 Prisma `Layout`(schema.prisma line 896~913), `Skin`(line 914~929), `ColorSet`(line 930~941), `WidgetStyle`(line 942~953), `ThemeAssignment`(line 954~972) 모두 정의됨.
- 현재 `packages/core/src/theme/` 디렉토리에 inheritance.ts, resolver.ts, manifest-validator.ts, installer.ts, hot-swap.ts, mobile-layout.ts, dark-mode.ts, skin-resolver.ts 등 27개 파일 존재 — **THEME 코어 인프라가 SPEC-THEME-001 spec.md 기준으로 이미 일부 구현 진행 중**.
- 현재 누락:
  - 실제 React Layout 컴포넌트 (`themes/default/layouts/*.tsx`)
  - 레이아웃 슬롯 시스템 (children, sidebar, GNB area 등)
  - `<rx-widget>` token 파서 통합 (layout body가 widget을 호출할 수 있어야 함)
  - 관리자 레이아웃 편집 UI (PaneLayouts — REMEDIATION-PLAN Slice E)

### 1.11 module 모듈 (모듈 시스템)

- 경로: `D:\project\rhymix\modules\module\`
- 카테고리: `system`
- 핵심 테이블 (schemas/*.xml 20개): 매우 광범위 — sites, domains, modules(=module_instance), module_config, module_admins, module_categories, module_extra_vars, module_extend, module_filebox, module_grants, module_locks, module_mobile_skins, module_skins, module_part_config, module_trigger, module_update, action_forward, task_queue, task_schedule, lang
- module 자체가 **메타 모듈** — 다른 모든 모듈의 라이프사이클(install, uninstall, copy, configure)을 관리
- 핵심 이벤트(`module.*`): deleteModule(다른 모듈이 cascading delete 후크), procModuleAdminCopyModule, dispAdditionSetup

도메인 책임:

- 모듈 정의 등록(installed modules list)
- 모듈 인스턴스 CRUD (mid 발급)
- 사이트/도메인 → 인덱스 모듈 매핑
- 모듈별 권한 그랜트 (group_srls 기반)
- 모듈 스킨/모바일스킨 매핑
- 모듈 트리거(이벤트 후크) 등록
- task_queue / task_schedule (백그라운드 작업)
- module_admins (모듈별 매니저 권한)
- module_filebox (관리자 파일함)
- module_extend (모듈 별칭 — 같은 코드 베이스를 다른 이름으로 등록)

PHP→TS 매핑 노트:

- 현재 Prisma `ModuleInstance`(schema.prisma line 97~133), `ModuleConfig`(line 134~146)가 이미 정의됨 (SPEC-ADMIN-001 Slice A에서 구현).
- 현재 `packages/core/src/modules/`에 registry.ts, mid-validator.ts, module-instance-service.ts, types.ts, errors.ts 등 핵심 파일 존재.
- 누락:
  - module_extend (별칭 모듈) — 백로그
  - module_trigger / hook system — addon SPEC에서 일부 흡수
  - task_queue / task_schedule — 별도 인프라 SPEC (현재 master plan 범위 외)
  - module_admins per-module manager 권한 — ADMIN Slice I 잔여

### 1.12 addon 모듈 (애드온)

- 경로: `D:\project\rhymix\modules\addon\`
- 카테고리: `utility`
- module.xml 액션: admin toggleActivate, admin setup, admin info
- 자체 schemas 없음 — addon 설정은 module_extra_vars 또는 별도 config 파일에 저장
- 애드온 구현체는 `D:\project\rhymix\addons\{addonName}\`:
  - 6개: adminlogging, autolink, counter, member_extra_info, photoswipe, point_level_icon
  - 각 애드온: `{addonName}.addon.php` (단일 진입점) + `conf/info.xml` (메타) + 옵션 `.lib.php` (헬퍼)

애드온 훅 메커니즘 (autolink.addon.php + grep 결과 기준):

- 변수 `$called_position` (전역)가 후크 호출 시점을 알려줌. 실측된 위치:
  - `before_module_proc` — 모듈 컨트롤러 실행 전 (e.g., adminlogging)
  - `after_module_proc` — 모듈 컨트롤러 실행 후, 응답 직전 (e.g., autolink, photoswipe)
  - `before_display_content` — display 직전 (e.g., counter, point_level_icon, member_extra_info)
- 각 애드온 파일은 그 시점들 중 하나(또는 여러)를 if 가드로 분기하여 자기 로직 실행
- 활성화는 module_extra_vars에서 toggle (`procAddonAdminToggleActivate`)

PHP→TS 매핑 노트:

- 현재 rhymix-ts에 addon system 없음.
- 매핑 후보: Next.js middleware + RSC slot + response transformer 조합. 다만 Rhymix의 "어디서든 PHP 코드 한 줄 끼워넣기" 자유도는 보안 위험이라 직접 포팅 불가.
- 실용적 접근: addon을 **선언적 hook**으로 재정의 (e.g., "after document render → run transformer"). 6개 기존 addon 중:
  - autolink → 컨텐츠 안의 URL을 클릭 가능한 링크로 — 백엔드 transformer로 구현
  - photoswipe → 이미지 라이트박스 — 클라이언트 컴포넌트로 충분
  - point_level_icon → 닉네임 옆 레벨 아이콘 — 회원 정보 렌더 단계 plugin
  - counter → 페이지뷰 카운터 — middleware로 구현
  - member_extra_info → 회원 프로필에 추가 표시 — RSC slot
  - adminlogging → admin 작업 감사 로그 — 이미 ADMIN-001 AdminLog로 대체됨

---

## 2. Widget / Layout / Addon 서브시스템 인벤토리

### 2.1 Widget 서브시스템

레거시 디렉토리 트리:

```
D:\project\rhymix\widgets\
├── content\              # 가장 복잡 — 글/댓글/이미지/RSS를 다양한 스킨으로 출력
│   ├── content.class.php
│   ├── conf\info.xml     # 60+ extra_vars (skin, layout, count, target modules ...)
│   ├── queries\          # getNewestDocuments.xml 등 3개
│   └── skins\
│       ├── default\
│       └── simple_rectangle\
├── counter_status\       # 방문자 카운터 표시
├── language_select\      # 언어 선택 셀렉터
├── login_info\           # 로그인 폼 + 로그인 정보 위젯
├── mcontent\             # 모바일 전용 content 위젯
└── pollWidget\           # 투표 위젯 (poll 모듈 의존)
```

위젯 통합 메커니즘:

- 위젯은 page/layout 본문에 `<img class="zbxe_widget_output" widget="..." ... />` 토큰으로 임베드됨
- HTML 응답 직전 widget.controller의 `triggerWidgetCompile` 이벤트 핸들러가 토큰을 파싱하고 위젯의 `proc($args)` 메서드를 호출하여 출력 HTML로 치환
- 즉 "위젯 위치"는 본문 안의 마크업 자체에 저장되며 별도 widget_instance 테이블이 없음 (위젯 인스턴스 = 본문 토큰)

신규 rhymix-ts 매핑 전략:

- 본문 안의 `<rx-widget name="content" data-list-count="5" data-target-mid="notice" />` 같은 커스텀 엘리먼트를 React Server Component가 파싱하여 위젯 컴포넌트로 치환
- 위젯 등록: `packages/core/src/widgets/registry.ts` (이미 존재)
- 위젯 렌더러: `apps/web/lib/widgets/render.tsx` (REMEDIATION Section 4.1에서 계획)
- 빌트인 위젯 우선순위(Phase 1 권장):
  - login_info — 모든 페이지의 헤더에 필요
  - content — 메인 페이지에 "최근 글" 박스 같은 동적 콘텐츠 노출
  - language_select — 다국어 지원 시
  - 나머지 (counter_status, mcontent, pollWidget)는 백로그

### 2.2 Layout 서브시스템

레거시 디렉토리:

```
D:\project\rhymix\layouts\        # 데스크톱 (P)
├── default\         # 단순한 기본 레이아웃 (visual.main 슬라이드 + 콘텐츠)
├── user_layout\     # 빈 사용자 정의 레이아웃 (운영자가 직접 HTML 작성)
└── xedition\        # 풍부한 데모용 레이아웃 (XE 1.8 기본)
                     # - GNB/UNB/FNB 3가지 메뉴 슬롯
                     # - main/sub 레이아웃 타입
                     # - menu_type_main: basic/startup/magazine
                     # - 슬라이드, 푸터, copyright 데모 콘텐츠 포함

D:\project\rhymix\m.layouts\      # 모바일 (M)
├── colorCode\       # 6가지 색상 변형 (Blue/Gray/Orange/Red/nGreenA/nGreenB)
├── default\         # 단순 모바일 레이아웃
└── simpleGray\      # 회색 톤 모바일 레이아웃
```

레이아웃 구성 요소 (info.xml 기준):

- `<menus>`: 레이아웃이 노출하는 메뉴 슬롯 이름 + maxdepth + default 여부
- `<extra_vars>`: 관리자가 입력할 수 있는 설정 (선택, 텍스트, 이미지)
- `layout.html`: 실제 출력 — Smarty 변수 `{$content}` 등으로 module 출력을 슬롯에 삽입

신규 rhymix-ts 매핑 전략:

- 각 레이아웃을 `themes/{themeName}/layouts/{layoutName}.tsx` React Server Component로 구현 (REMEDIATION-PLAN Slice D)
- `<menus>` 슬롯 → React `<Slot name="GNB" />` 컴포넌트 (메뉴 트리를 받아 렌더)
- `<extra_vars>` → Zod 스키마로 정의되어 admin UI가 자동 폼 생성 (REMEDIATION Slice E)
- Phase 1 권장: xedition 풀 포팅은 무리. default 레이아웃만 우선 (단순한 header + main + footer 구조).
- 모바일은 Phase 2 이후. responsive(mlayout_srl = -2) 우선.

### 2.3 Addon 서브시스템

레거시 디렉토리:

```
D:\project\rhymix\addons\
├── adminlogging\         # admin 작업 감사 로그 — 신규 ADMIN-001 AdminLog로 흡수
├── autolink\             # 컨텐츠 URL을 a 태그로 자동 변환
├── counter\              # 페이지뷰 카운터
├── member_extra_info\    # 회원 프로필에 추가 정보 표시
├── photoswipe\           # 이미지 라이트박스 (PhotoSwipe JS 라이브러리 포함)
└── point_level_icon\     # 닉네임 옆에 포인트 레벨 아이콘 표시
```

훅 호출 위치 (실측):

- `before_module_proc` — 모듈 컨트롤러 실행 전 (adminlogging)
- `after_module_proc` — 모듈 컨트롤러 실행 후 (autolink, photoswipe)
- `before_display_content` — display 직전 (counter, point_level_icon, member_extra_info)

신규 rhymix-ts 매핑 전략:

- "임의의 PHP 코드 삽입"은 보안상 포팅하지 않음
- 대신 **선언적 hook system**으로 재설계:
  - hook 종류: `onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`
  - 각 addon은 hook 이름 + handler function (TS 모듈)로 등록
  - registry: `packages/core/src/addons/registry.ts` (신규)
- Phase 1에는 addon system 자체는 아직 불필요 — 6개 빌트인 addon 중 immediately 필요한 것은 없음
- 단, autolink/photoswipe는 컨텐츠 후처리 transformer로 Phase 2~3에 추가하면 좋음 (회복적 가치)

---

## 3. 크로스 모듈 의존성 그래프 (검증된 fact 기반)

레거시 module.xml의 `<eventHandlers>` 선언과 실제 코드 호출에서 추출:

### 3.1 강제 의존 (Hard Dependency — 동작 전제)

- board → document + comment + member + module + file + point
  - document: 게시판은 document를 데이터로 사용
  - comment: 게시판은 comment를 댓글로 사용
  - member: write_document/write_comment 권한 검사
  - module: ModuleInstance + ModuleConfig 사용
  - file: 첨부파일
  - point: 글쓰기/댓글 시 포인트 부여
- document → member + module + file
- comment → member + module + document (parent_srl FK)
- page → module + widget (본문 안에 widget 토큰)
- widget → module (target module 지정 시) + content sources (board, document)
- file → member + (target type)
- point → member
- menu → module (메뉴 항목이 모듈 인스턴스를 가리킴)
- layout → menu (레이아웃이 메뉴 슬롯 요구)
- addon → 거의 모든 곳 (event hook system을 통해 전역 영향)

### 3.2 약한 의존 (Soft Dependency — 이벤트 핸들러 기반)

- file ← document.deleteDocument (트리거: 문서 삭제 시 첨부 정리)
- file ← comment.deleteComment
- file ← module.deleteModule
- comment ← document.deleteDocument
- comment ← document.moveDocumentModule
- document ← module.deleteModule
- board → member.getMemberMenu (회원 메뉴에 게시판 노출)
- board → menu.getModuleListInSitemap

### 3.3 기반(Foundation) 계층

가장 의존성이 적고 다른 모든 모듈이 의존하는 순서:

1. **member** + **module** (회원과 모듈 인스턴스 시스템 — 이미 SPEC-AUTH-001과 SPEC-ADMIN-001로 구축됨)
2. **file** + **point** (cross-cutting 도메인)
3. **document** + **comment** (콘텐츠 도메인)
4. **board** + **page** (사용자 노출 모듈)
5. **layout** + **widget** (프레젠테이션 — 페이지가 의미 있어지려면 필수)
6. **menu** (사이트 네비게이션)
7. **addon** (확장)

### 3.4 사용자 표면 우선순위 vs 의존성 우선순위의 충돌

사용자가 "홈 화면이 비었다"고 고통받는 본질:

- 도메인이 가리키는 indexModuleInstance가 일반적으로 **page 인스턴스**여야 함
- page는 본문 안에서 **widget**을 호출해 콘텐츠 노출
- page와 widget은 **layout** 안에서 렌더됨
- 따라서 "보이는 무엇"이 출현하려면 **layout + page + widget**이 동시에 필요

→ **Phase 1은 이 세 가지가 함께 P0**. 어느 하나만 먼저 만들면 결과가 보이지 않으므로 사용자의 통증이 해소되지 않는다.

---

## 4. 현 rhymix-ts 코드 베이스 실측

검증된 사실 (디렉토리/파일 존재 확인):

| 영역 | 상태 | 근거 |
|------|------|------|
| `packages/auth/src/` | Slice A~H 완료 | 30+ 파일 (login, signup, autologin, password-reset, rbac, admin, session-revocation 등) |
| `packages/board/src/` | Slice A 완료 + 핵심 도메인 풍부 | 40+ 파일 (document, comment, category, vote, attachment, search, trash, history, extra-keys, storage/{memory,s3,clamav,scanner}) |
| `packages/core/src/modules/` | Slice A 완료 | registry, mid-validator, module-instance-service, types, errors |
| `packages/core/src/theme/` | **부분 구현 진행 중** | 27개 파일 (inheritance, resolver, manifest-validator, installer, hot-swap, mobile-layout, dark-mode, skin-resolver, token-css, widget-style, preview, assignment-store) |
| `packages/core/src/widgets/` | 골조만 | registry, types, registry.test |
| `packages/db/prisma/schema.prisma` | 38개 모델 | 973라인. User, Domain, ModuleInstance, ModuleConfig, Menu, MenuItem, AdminLog, AdminFavorite, AutoLogin, EmailAuthToken, MemberGroup, ContentRateLimit, LoginAttempt, AuditLog, WidgetInstance, Board, Document, Comment, DocumentCategory, DocumentExtraKey, FileAttachment, DocumentUpdateLog, DocumentVote, DocumentReport, Trash, Theme, Layout, Skin, ColorSet, WidgetStyle, ThemeAssignment 등 |
| `apps/web/app/install/` | 완료 | check-env, db-config, admin-config, complete |
| `apps/web/app/(auth)/` | 완료 | login, signup, password-reset (+confirm), verify-email |
| `apps/web/app/admin/` | Slice A~F 완료 | modules, menu, logs, members, settings/site, system (+cache), widgets |
| `apps/web/app/[mid]/page.tsx` | 모듈 디스패처 작동 | x-site-id 헤더 + mid 파라미터 → registry.getModuleInstanceByMid → def.routes.index 위임 |
| `apps/web/app/page.tsx` | (확인 필요) | 루트 페이지 존재 — 그러나 내용은 불명 |

기존 SPEC 진행도 (REMEDIATION-PLAN-001 기준):

- AUTH-001: Slice A~H 완료, 482 테스트 통과
- ADMIN-001: A~F 완료, G(widgets) / H(export-import) / I(잔여 REQ) 계획만 존재 (slice-g-plan.md, slice-h-plan.md, slice-i-plan.md)
- CONTENT-001: Slice A(스키마) 완료, Slice B(tRPC + UI) 미착수
- THEME-001: spec.md만 존재. 코드는 **그러나 packages/core/src/theme/에서 일부 시작됨** (이는 REMEDIATION 작성 시점 이후 진행된 듯). 슬라이스 plan은 REMEDIATION에 정의됨 (A~F).
- INSTALL-001: 거의 완료

REMEDIATION-PLAN-001 자체의 상태:

- pending user approval로 표기
- THEME Slice A~F 계획, CONTENT Slice B 계획, MailDispatcher 계획, ADMIN Slice G/H/I 참조 — 모두 valuable한 분해
- 단점: 기존 5개 SPEC 범위 안에서만 분해 (page, widget 빌트인, addon, point, file upload, comment 독립화는 다루지 않음)

---

## 5. 핵심 도출 (Master Plan으로 가져갈 것)

### 5.1 사용자 표면 우선 (사용자 통증 해소 직결)

새 master plan의 Phase 1은 **사용자가 홈 화면에서 무언가를 본다**가 목표. 이를 위해 동시에 필요:

1. Layout 시스템 (default 레이아웃 1개로 시작)
2. Page 모듈 (modules/page 포팅 — 본문 + widget 토큰)
3. Widget 시스템 (token parser + 최소 2개 빌트인: login_info + content)

REMEDIATION-PLAN의 THEME Slice A~D는 이 Phase의 일부지만, page와 widget builtin 구현이 빠져 있다 — master plan에서 보강 필요.

### 5.2 콘텐츠 도메인 분리 (한국 CMS의 본질)

기존 SPEC-CONTENT-001은 board 중심. 그러나 레거시 사실은:

- document는 board뿐 아니라 wiki/blog/news 등 어떤 모듈도 사용 가능한 독립 도메인
- comment도 마찬가지 (page에 댓글, document에 댓글, wiki에 댓글)

→ Phase 2에서 `packages/document`, `packages/comment`를 독립 패키지로 만들고 `packages/board`는 wrapper로 재정렬.

### 5.3 회원 생태계의 확장

기존 SPEC-AUTH-001은 회원 인증 자체에 집중. 누락:

- point 시스템 (`packages/point` 신규)
- file storage 통합 (board에는 있지만, document/comment에서 직접 쓰는 일관 인터페이스 필요)
- member 추가 필드(profile_image, signature 등 extra_vars의 일부)

→ Phase 3.

### 5.4 확장 시스템

- addon system은 직접 PHP 포팅 불가
- 대신 선언적 hook system으로 재설계 (Phase 4)
- 단기적으로는 autolink/photoswipe만 RSC transformer로 흡수

### 5.5 admin 보완

- ADMIN Slice G(widget admin) → master plan Phase 1과 통합 (widget을 만들면 admin도 자연스럽게 따라옴)
- ADMIN Slice H(export/import) → Phase 5 (확장 운영 기능)
- ADMIN Slice I(잔여 REQ) → Phase 5

### 5.6 비범위(중요)

레거시 33 modules 중 12개만 포팅하기로 결정한 이상, 나머지 21개는 모두 백로그 (별도 SPEC-MODULE-BACKLOG로 묶음):

- poll, tag, trash(독립화), rss, counter, spamfilter, importer, krzip, advanced_mailer, editor, extravar, session, communication, message, ncenterlite, integration_search, install, autoinstall, editor, ...

이들은 핵심 CMS 동작에 필수가 아니거나 Phase 1~5 안에서 일부 흡수된다 (예: extravar는 document 모듈 안의 ExtraKey로, trash는 document 모듈 안의 status enum으로).

---

## 6. 사용자가 결정해야 할 열린 질문

이 사전 조사로 명확해지지 않은 사항 — Master Plan 안에서 user 결정 사항으로 명시:

1. **mobile layout 전략**: 별도 m.layouts 디렉토리를 유지할 것인가, 아니면 responsive Tailwind로 통합할 것인가? (Phase 1 default 레이아웃 결정에 영향)
2. **file storage backend**: 로컬 디스크(`files/`)를 유지할 것인가, 처음부터 S3 강제할 것인가? (이미 `packages/board/src/storage/s3.ts` 존재하므로 selectable로 설계해도 무방)
3. **point system 활성화 시점**: Phase 3까지 미루는 것이 맞는가, 아니면 board와 함께 P1로 끌어올려야 하는가? (현재 plan에서는 P1 = 콘텐츠 도메인과 함께 묶음)
4. **addon system 자체**: 끝까지 만들지 말 것인가, 아니면 Phase 4에서 최소 hook 1개라도 만들 것인가? (autolink/photoswipe 정도는 transformer로 흡수 가능)
5. **xedition 레이아웃 포팅**: Phase 1 default 외에 xedition 까지 포팅할 것인가? (xedition은 데모성이 강해 SPEC 외부 — Phase 4 옵션)

---

Version: 1.0.0
Last Verified: 2026-05-25
Verified Files (대표 표본):

- D:\project\rhymix\modules\member\conf\info.xml
- D:\project\rhymix\modules\board\conf\info.xml + module.xml
- D:\project\rhymix\modules\document\conf\info.xml + module.xml + schemas\documents.xml
- D:\project\rhymix\modules\comment\conf\info.xml + module.xml + schemas\comments.xml
- D:\project\rhymix\modules\page\conf\info.xml + module.xml
- D:\project\rhymix\modules\widget\conf\info.xml + module.xml
- D:\project\rhymix\modules\file\conf\info.xml + module.xml + schemas\files.xml
- D:\project\rhymix\modules\point\conf\info.xml + module.xml + schemas\point.xml
- D:\project\rhymix\modules\menu\conf\info.xml + module.xml + schemas\menu.xml + schemas\menu_item.xml
- D:\project\rhymix\modules\layout\conf\info.xml + module.xml + schemas\layouts.xml
- D:\project\rhymix\modules\module\conf\info.xml + schemas\modules.xml + schemas\sites.xml + schemas\domains.xml
- D:\project\rhymix\modules\addon\conf\info.xml + module.xml
- D:\project\rhymix\widgets\content\conf\info.xml + content.class.php
- D:\project\rhymix\addons\autolink\conf\info.xml + autolink.addon.php (+ grep called_position 결과)
- D:\project\rhymix\layouts\xedition\conf\info.xml
- D:\project\rhymix\widgetstyles\simple\skin.xml
- D:\project\rhymix-ts\packages\db\prisma\schema.prisma (38개 모델 grep 결과)
- D:\project\rhymix-ts\packages\core\src\modules\types.ts
- D:\project\rhymix-ts\apps\web\app\[mid]\page.tsx
- D:\project\rhymix-ts\.moai\specs\REMEDIATION-PLAN-001.md
- D:\project\rhymix-ts\.moai\specs\SPEC-{AUTH,ADMIN,CONTENT,THEME,INSTALL}-001\spec.md (각각 spec.md 80~100라인 표본)
