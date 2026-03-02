# ASIS Live Analysis - Rhymix PHP CMS

## Analysis Date: 2026-03-02
## Method: Playwright live browser capture
## Base URL: http://localhost
## Admin URL: http://localhost/admin/

---

## Executive Summary

Rhymix is a Korean PHP Content Management System (CMS), forked from XpressEngine (XE). This document captures the live admin interface through Playwright browser automation, documenting all accessible features, forms, navigation, and data structures.

### System Overview

| Property | Value |
|----------|-------|
| CMS | Rhymix (XpressEngine fork) |
| Language | PHP |
| Admin Language | Korean (한국어) |
| URL Pattern | `?module=MODULE&act=ACTION` |
| Admin Entry | `/admin/` (session-based auth) |
| Auth Method | Username/Email + Password |
| CSRF | `_rx_csrf_token` in all forms |
| Login Keep | "로그인 유지" checkbox option |

---

## 1. Admin Navigation Structure

The following navigation links were discovered from the admin dashboard:

| Korean Name | English Translation | URL |
|------------|--------------------|---------|
| 대시보드 | Dashboard | `?module=admin` |
| 사이트 메뉴 편집 | Site Menu Editor | `?module=admin&act=dispMenuAdminSiteMap` |
| 사이트 디자인 설정 | Site Design Settings | `?module=admin&act=dispMenuAdminSiteDesign` |
| 회원 설정 | Member Settings | `?module=admin&act=dispMemberAdminConfig` |
| 회원 그룹 | Member Groups | `?module=admin&act=dispMemberAdminGroupList` |
| 포인트 | Points System | `?module=admin&act=dispPointAdminConfig` |
| 게시판 | Boards (BBS) | `?module=admin&act=dispBoardAdminContent` |
| 페이지 | Pages | `?module=admin&act=dispPageAdminContent` |
| 문서 (더보기) | Documents | `?module=admin&act=dispDocumentAdminList` |
| 댓글 (더보기) | Comments | `?module=admin&act=dispCommentAdminList` |
| 파일 | Files | `?module=admin&act=dispFileAdminList` |
| 설문 | Polls/Surveys | `?module=admin&act=dispPollAdminList` |
| 에디터 | Editor Settings | `?module=admin&act=dispEditorAdminIndex` |
| 스팸필터 | Spam Filter | `?module=admin&act=dispSpamfilterAdminDeniedIPList` |
| 휴지통 | Trash | `?module=admin&act=dispTrashAdminList` |
| 메일, SMS 및 푸시 알림 관리 | Mail/SMS/Push Notifications | `?module=admin&act=dispAdvanced_mailerAdminConfig` |
| 알림 센터 | Notification Center | `?module=admin&act=dispNcenterliteAdminConfig` |
| 시스템 설정 | System Settings | `?module=admin&act=dispAdminConfigGeneral` |
| 관리자 화면 설정 | Admin UI Settings | `?module=admin&act=dispAdminSetup` |
| 파일박스 | File Box | `?module=admin&act=dispModuleAdminFileBox` |
| 쉬운 설치 | Easy Install | `?module=admin&act=dispAutoinstallAdminIndex` |
| 설치된 레이아웃 | Installed Layouts | `?module=admin&act=dispLayoutAdminInstalledList` |
| 설치된 모듈 | Installed Modules | `?module=admin&act=dispModuleAdminContent` |
| 설치된 애드온 | Installed Addons | `?module=admin&act=dispAddonAdminIndex` |
| 설치된 위젯 | Installed Widgets | `?module=admin&act=dispWidgetAdminDownloadedList` |
| 다국어 | Multi-language | `?module=admin&act=dispModuleAdminLangcode` |
| 데이터 들여오기 | Data Importer | `?module=admin&act=dispImporterAdminImportForm` |
| RSS | RSS Feed Management | `?module=admin&act=dispRssAdminIndex` |
| 코어 파일 정리 | Core File Cleanup | `?module=admin&act=dispAdminCleanupList` |
| 서버 환경 표시 | Server Environment | `?module=admin&act=dispAdminViewServerEnv` |

---

## 2. Public-Facing Pages

### Homepage (http://localhost/)
- **URL**: `http://localhost/`
- **Title**: 
- **Section Headings**: 사이트 제목 바꾸기 / 메뉴 구조 구성하기 / 레이아웃 디자인 바꾸기 / 초기화면 바꾸기 / 기능과 디자인 추가하기

**Forms** (3):

*Form* (action: `http://localhost/`)
  - `input` name="is_keyword" type="text" placeholder="Search"

*account-signup* (action: `http://localhost/index.php?act=procMemberLogin`)
  - `input` name="user_id" type="text" placeholder="아이디"
  - `input` name="password" type="password" placeholder="비밀번호"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

*Form* (action: `http://localhost/index.php?act=procMemberLogin`)
  - [아이디] `input` name="user_id" type="text"
  - [비밀번호] `input` name="password" type="password"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

**Form Sections**: 로그인 (3 fields)

**Public Navigation Menu** (from homepage):
- Welcome -> `/index`
- Free Board -> `/board`
- Q&A -> `/qna`
- Notice -> `/notice`

### Login Page (로그인)
- **URL**: `http://localhost/member/login`
- **Title**: 로그인
- **Section Headings**: 로그인

**Forms** (4):

*Form* (action: `http://localhost/`)
  - `input` name="is_keyword" type="text" placeholder="Search"

*fo_member_login* (action: `http://localhost/`)
  - `input` name="user_id" type="text" placeholder="아이디"
  - [비밀번호] `input` name="password" type="password" placeholder="비밀번호"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

*account-signup* (action: `http://localhost/index.php?act=procMemberLogin`)
  - `input` name="user_id" type="text" placeholder="아이디"
  - `input` name="password" type="password" placeholder="비밀번호"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

*Form* (action: `http://localhost/index.php?act=procMemberLogin`)
  - [아이디] `input` name="user_id" type="text"
  - [비밀번호] `input` name="password" type="password"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

**Form Sections**: 로그인 (3 fields)

**Login Form Details**:
- Form action: `procMemberLogin`
- Username field: `input[name="user_id"]` with placeholder "아이디"
- Password field: `input[name="password"]` with placeholder "비밀번호"
- Keep login: checkbox `name="keep_signed"` (로그인 유지)
- CSRF: `_rx_csrf_token` hidden field

### Register Page (회원가입)
- **URL**: `http://localhost/member/signup`
- **Title**: 회원가입
- **Section Headings**: 로그인

**Forms** (4):

*Form* (action: `http://localhost/`)
  - `input` name="is_keyword" type="text" placeholder="Search"

*fo_insert_member* (action: `http://localhost/`)
  - [* 아이디] `input` name="user_id" type="text"
  - [* 비밀번호] `input` name="password" type="password"
  - [* 비밀번호 확인] `input` name="password2" type="password"
  - [* 이메일 주소] `input` name="email_address" type="email"
  - [* 이름] `input` name="user_name" type="text"
  - [* 닉네임] `input` name="nick_name" type="text"
  - [홈페이지] `input` name="homepage" type="url"
  - [블로그] `input` name="blog" type="url"
  - [생일] `input` name="birthday_ui" type="date" placeholder="YYYY-MM-DD"
  - [예] `input` name="allow_mailing" type="radio"
  - [아니오] `input` name="allow_mailing" type="radio"
  - [모두 허용] `input` name="allow_message" type="radio"
  - [등록된 친구들만 허용] `input` name="allow_message" type="radio"
  - [모두 금지] `input` name="allow_message" type="radio"

*account-signup* (action: `http://localhost/index.php?act=procMemberLogin`)
  - [* 아이디] `input` name="user_id" type="text" placeholder="아이디"
  - `input` name="password" type="password" placeholder="비밀번호"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

*Form* (action: `http://localhost/index.php?act=procMemberLogin`)
  - [아이디] `input` name="user_id" type="text"
  - [비밀번호] `input` name="password" type="password"
  - [로그인 유지] `input` name="keep_signed" type="checkbox"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

**Form Sections**: 로그인 (3 fields)

---

## 3. Admin Dashboard

### Dashboard
- **URL**: `http://localhost/admin/`
- **Title**: Dashboard
- **Section Headings**: 업데이트가 있습니다. / 불필요한 코어 파일이 있습니다. / 회원 / 최근 글 / 최근 댓글

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

**Admin Login Form**:
- Username: `#uid` (accepts email address)
- Password: `#upw`
- Submit: `button[type="submit"]`

---

## 4. Member Management (회원 관리)

### Member List (회원 목록)
- **URL**: `http://localhost/index.php?module=admin&act=dispMemberAdminList`
- **Title**: 회원 목록
- **Section Headings**: 회원 그룹 / 거부 / 회원에게 쪽지를 발송해서 이 사실을 알립니다. 작성하지 않으면 발송하지 않습니다.

**Forms** (3):

*Form* (action: `http://localhost/`)
  - `input` name="user" type="checkbox"

*Form* (action: `http://localhost/`)
  - `select` name="selected_group_srl" type="select-one" | Options: 그룹전체, 관리그룹, 준회원, 정회원
  - `select` name="search_target" type="select-one" | Options: 아이디, 이메일, 이름, 닉네임, 전화번호, 가입일시, 가입일시(이상), 가입일시(이하), 가입 IP 주소, 최근 로그인 일시, 최근 로그인 일시(이상), 최근 로그인 일시(이하), 최근 로그인 IP 주소, 생일, 사용자 정의, 관리자 메모
  - `input` name="search_keyword" type="search"

*Form* (action: `http://localhost/`)
  - [관리그룹] `input` name="groups[]" type="checkbox"
  - [준회원] `input` name="groups[]" type="checkbox"
  - [정회원] `input` name="groups[]" type="checkbox"
  - [승인] `input` name="denied" type="radio"
  - [거부] `input` name="denied" type="radio"
  - `textarea` name="message" type="textarea"

**Tables** (2):

*모든 회원(1)
			|
			최고 관리자
			|
			승인
			|
			거부
			|
			미인증
			
				회원 추가
				수정
				삭제
			
			
				간단보기
				상세보기* (1 rows)
  Columns: 아이디 | 이메일 주소 | 이름 | 닉네임 | 상태 | 가입일 | 최근 로그인 | 회원 그룹 | 조회/수정 | 
  Sample: comfit99 | comfit99@naver.com | admin | admin | 승인 | 2026-02-28 | 2026-03-02 | 관리그룹 | 조회/수정 | 

*Table 2* (0 rows)
  Columns: 이메일 주소 | 아이디 | 이메일 주소 | 이름 | 닉네임 | 회원 그룹 | 

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Member Config (회원 설정)
- **URL**: `http://localhost/index.php?module=admin&act=dispMemberAdminConfig`
- **Title**: 회원 설정

**Forms** (1):

*Form* (action: `http://localhost/`)
  - [URL] `input` name="member_mid" type="text"
  - [강제 적용] `input` name="force_mid" type="checkbox"
  - [예] `input` name="enable_join" type="radio"
  - [아니오] `input` name="enable_join" type="radio"
  - [URL 키가 일치하는 경우에만 허가] `input` name="enable_join" type="radio"
  - `input` name="enable_join_key" type="text" placeholder="URL 키"
  - [예] `input` name="enable_confirm" type="radio"
  - [아니오] `input` name="enable_confirm" type="radio"
  - `input` name="authmail_expires" type="number"
  - `select` name="authmail_expires_unit" type="select-one" | Options: 일, 시, 분, 초
  - [예] `input` name="member_profile_view" type="radio"
  - [아니오] `input` name="member_profile_view" type="radio"
  - [예] `input` name="allow_nickname_change" type="radio"
  - [아니오] `input` name="allow_nickname_change" type="radio"
  - [예] `input` name="update_nickname_log" type="radio"
  - [아니오] `input` name="update_nickname_log" type="radio"
  - [예] `input` name="nickname_symbols" type="radio"
  - [아니오] `input` name="nickname_symbols" type="radio"
  - [다음의 문자만 허용:] `input` name="nickname_symbols" type="radio"
  - `input` name="nickname_symbols_allowed_list" type="text"
  - [띄어쓰기 허용] `input` name="nickname_spaces" type="checkbox"
  - [예] `input` name="allow_duplicate_nickname" type="radio"
  - [아니오] `input` name="allow_duplicate_nickname" type="radio"
  - [낮음(비밀번호는 4자 이상이어야 합니다.)] `input` name="password_strength" type="radio"
  - [보통(비밀번호는 6자리 이상이어야 하며 영문과 숫자를 반드시 포함해야 합니다.)] `input` name="password_strength" type="radio"
  - [높음(비밀번호는 8자리 이상이어야 하며 영문과 숫자, 특수문자를 반드시 포함해야 합니다.)] `input` name="password_strength" type="radio"
  - `select` name="password_hashing_algorithm" type="select-one" | Options: argon2id, bcrypt, pbkdf2, sha512, sha256, sha1, md5
  - `select` name="password_hashing_work_factor" type="select-one" | Options: 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16
  - [예] `input` name="password_hashing_auto_upgrade" type="radio"
  - [아니오] `input` name="password_hashing_auto_upgrade" type="radio"
  - [예] `input` name="password_change_invalidate_other_sessions" type="radio"
  - [아니오] `input` name="password_change_invalidate_other_sessions" type="radio"
  - [비밀번호 변경 화면 링크 전달 (권장)] `input` name="password_reset_method" type="radio"
  - [랜덤 비밀번호 전달] `input` name="password_reset_method" type="radio"
  - [회원정보 동기화] `input` name="" type="button"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Member Groups (회원 그룹)
- **URL**: `http://localhost/index.php?module=admin&act=dispMemberAdminGroupList`
- **Title**: 회원 그룹

**Forms** (1):

*fo_member_group* (action: `http://localhost/`)
  - [예] `input` name="group_image_mark" type="radio"
  - [아니오] `input` name="group_image_mark" type="radio"
  - `input` name="group_titles[]" type="text"
  - `input` name="" type="text"
  - `input` name="descriptions[]" type="text"
  - `input` name="defaultGroup" type="radio"
  - `input` name="group_titles[]" type="text"
  - `input` name="" type="text"
  - `input` name="descriptions[]" type="text"
  - `input` name="defaultGroup" type="radio"
  - `input` name="group_titles[]" type="text"
  - `input` name="" type="text"
  - `input` name="descriptions[]" type="text"
  - `input` name="defaultGroup" type="radio"
  - `input` name="group_titles[]" type="text"
  - `input` name="" type="text"
  - `input` name="descriptions[]" type="text"
  - `input` name="defaultGroup" type="radio"

**Tables** (1):

*3개 그룹이 존재합니다.
			
	그룹 이미지 마크 사용:
				 예
				 아니오* (4 rows)
  Columns: * 그룹 제목 | 설명 | 기본그룹 | 그룹 이미지 마크 | 
  Sample: Move to
						
						다국어 텍스트 해제다국어 텍스트 설정 | #2 |  | 수정 | 삭제

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Member Add Form (회원 추가)
- **URL**: `http://localhost/index.php?module=admin&act=dispMemberAdminInsert`
- **Title**: 회원 추가

**Forms** (1):

*Form* (action: `http://localhost/`)
  - [* 아이디] `input` name="user_id" type="text"
  - [* 이메일 주소] `input` name="email_address" type="email"
  - [* 비밀번호] `input` name="password" type="password"
  - [* 이름] `input` name="user_name" type="text"
  - [* 닉네임] `input` name="nick_name" type="text"
  - [홈페이지] `input` name="homepage" type="url"
  - [블로그] `input` name="blog" type="url"
  - [생일] `input` name="birthday_ui" type="date" placeholder="YYYY-MM-DD"
  - [예] `input` name="allow_mailing" type="radio"
  - [아니오] `input` name="allow_mailing" type="radio"
  - [전체 수신] `input` name="allow_message" type="radio"
  - [수신 거부] `input` name="allow_message" type="radio"
  - [친구만 허용] `input` name="allow_message" type="radio"
  - `textarea` name="refused_reason" type="textarea"
  - `textarea` name="limited_reason" type="textarea"
  - [예] `input` name="is_admin" type="radio"
  - [아니오] `input` name="is_admin" type="radio"
  - [설명] `textarea` name="description" type="textarea"
  - [관리그룹] `input` name="group_srl_list[]" type="checkbox"
  - [준회원] `input` name="group_srl_list[]" type="checkbox"
  - [정회원] `input` name="group_srl_list[]" type="checkbox"

**Buttons**: ×, 삭제, 저장, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

### Member Info/Edit (회원정보 조회/수정)
- **URL**: `http://localhost/index.php?module=admin&act=dispMemberAdminInsert&member_srl=5`
- **Title**: 회원정보 조회/수정

**Forms** (1):

*Form* (action: `http://localhost/`)
  - [* 아이디] `input` name="user_id" type="text"
  - [* 이메일 주소] `input` name="email_address" type="email"
  - [* 비밀번호] `input` name="reset_password" type="password"
  - [* 이름] `input` name="user_name" type="text"
  - [* 닉네임] `input` name="nick_name" type="text"
  - [홈페이지] `input` name="homepage" type="url"
  - [블로그] `input` name="blog" type="url"
  - [생일] `input` name="birthday_ui" type="date" placeholder="YYYY-MM-DD"
  - [예] `input` name="allow_mailing" type="radio"
  - [아니오] `input` name="allow_mailing" type="radio"
  - [전체 수신] `input` name="allow_message" type="radio"
  - [수신 거부] `input` name="allow_message" type="radio"
  - [친구만 허용] `input` name="allow_message" type="radio"
  - [승인] `input` name="status" type="radio"
  - [거부] `input` name="status" type="radio"
  - [미인증] `input` name="status" type="radio"
  - `textarea` name="refused_reason" type="textarea"
  - [제한일] `input` name="" type="date" placeholder="YYYY-MM-DD"
  - `textarea` name="limited_reason" type="textarea"
  - [예] `input` name="is_admin" type="radio"
  - [아니오] `input` name="is_admin" type="radio"
  - [설명] `textarea` name="description" type="textarea"
  - [관리그룹] `input` name="group_srl_list[]" type="checkbox"
  - [준회원] `input` name="group_srl_list[]" type="checkbox"
  - [정회원] `input` name="group_srl_list[]" type="checkbox"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

---

## 5. Site Design & Navigation (사이트 디자인)

### Site Menu Editor (사이트 메뉴 편집)
- **URL**: `http://localhost/index.php?module=admin&act=dispMenuAdminSiteMap`
- **Title**: 사이트 메뉴 편집

**Forms** (7):

*menu_find* (action: `http://localhost/index.php?module=admin&act=dispMenuAdminSiteMap`)
  - `input` name="keyword" type="text"

*Form* (action: `http://localhost/`)
  - `input` name="menu_normal_btn" type="file"

*Form* (action: `http://localhost/`)
  - `input` name="menu_hover_btn" type="file"

*Form* (action: `http://localhost/`)
  - `input` name="menu_active_btn" type="file"

*Form* (action: `http://localhost/`)
  - [모바일 뷰 사용] `input` name="use_mobile" type="checkbox"

*Form* (action: `http://localhost/`)
  - [사이트 디자인 사용] `input` name="" type="checkbox"

*Form* (action: `http://localhost/`)
  - [사이트 디자인 사용] `input` name="" type="checkbox"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Site Design Settings (사이트 디자인 설정)
- **URL**: `http://localhost/index.php?module=admin&act=dispMenuAdminSiteDesign`
- **Title**: 사이트 디자인 설정

**Forms** (3):

*Form* (action: `http://localhost/?act=dispLayoutPreviewWithModule&module_name=&target_mid=&layout_srl=65&skin=&skin_`)
  - [모바일 뷰 사용] `input` name="use_mobile" type="checkbox"

*Form* (action: `http://localhost/`)
  - [사이트 디자인 사용] `input` name="" type="checkbox"

*Form* (action: `http://localhost/`)
  - [사이트 디자인 사용] `input` name="" type="checkbox"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Installed Layouts (설치된 레이아웃)
- **URL**: `http://localhost/index.php?module=admin&act=dispLayoutAdminInstalledList`
- **Title**: 설치된 레이아웃

**Tables** (1):

*간단보기
			상세보기* (6 rows)
  Columns: 레이아웃 이름 | 버전 | 작성자 | 설치경로
  Sample: XEDITION
					XE 1.8 기본 테마 |  | NAVER | ./layouts/xedition/ | 

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

---

## 6. Board/BBS Management (게시판 관리)

### Board Admin (게시판)
- **URL**: `http://localhost/index.php?module=admin&act=dispBoardAdminContent`
- **Title**: 게시판

**Forms** (7):

*Form* (action: `http://localhost/`)
  - `select` name="search_target" type="select-one" | Options: 모듈 이름, 브라우저 제목
  - `input` name="search_keyword" type="search"

*manageSelectedModuleSetup* (action: `http://localhost/`)
  - [모듈 분류] `select` name="module_category_srl" type="select-one" | Options: 기존 값 유지, 미사용
  - [레이아웃] `select` name="layout_srl" type="select-one" | Options: 기존 값 유지, 미사용, 사이트 기본 레이아웃 사용 (사이트 기본 레이아웃 사용), 테스트 레이아웃 (user_layout), 기본 레이아웃 (default), XEDITION (xedition)
  - [스킨] `select` name="skin" type="select-one" | Options: 기존 값 유지, 사이트 기본 스킨 사용 (XEDITION), XE Default, XEDITION
  - [모바일 뷰 사용] `select` name="use_mobile" type="select-one" | Options: 기존 값 유지, 사용, 미사용
  - [모바일 레이아웃] `select` name="mlayout_srl" type="select-one" | Options: 기존 값 유지, 미사용, PC와 동일한 반응형 레이아웃 사용 (), 사이트 기본 레이아웃 사용 (사이트 기본 레이아웃 사용), XE 심플 그레이 레이아웃 (simpleGray), XE Color Code 모바일 레이아웃 (colorCode), welcome_mobile_layout (default)
  - [모바일 스킨] `select` name="mskin" type="select-one" | Options: 기존 값 유지, 사이트 기본 스킨 사용 (XE 게시판 기본 스킨), PC와 동일한 반응형 스킨 사용, XE 게시판 기본 스킨, XE 게시판 심플 회색 스킨
  - [설명] `textarea` name="description" type="textarea"
  - [삭제] `input` name="description_delete" type="checkbox"
  - `textarea` name="header_text" type="textarea"
  - [상단 내용] `textarea` name="" type="textarea"
  - [삭제] `input` name="header_text_delete" type="checkbox"
  - `textarea` name="footer_text" type="textarea"
  - [하단 내용] `textarea` name="" type="textarea"
  - [삭제] `input` name="footer_text_delete" type="checkbox"

*Form* (action: `http://localhost/`)
  - [히스토리] `select` name="use_history" type="select-one" | Options: 미사용, 사용, 흔적만 남김
  - [추천] `select` name="use_vote_up" type="select-one" | Options: 사용, 사용 + 추천내역 공개, 미사용
  - [비추천] `select` name="use_vote_down" type="select-one" | Options: 사용, 사용 + 추천내역 공개, 미사용
  - [동일 IP 추천 허용] `input` name="allow_vote_from_same_ip" type="checkbox"
  - [추천 취소 허용] `input` name="allow_vote_cancel" type="checkbox"
  - [비회원 추천 허용] `input` name="allow_vote_non_member" type="checkbox"
  - [동일 IP 신고 허용] `input` name="allow_declare_from_same_ip" type="checkbox"
  - [신고 취소 허용] `input` name="allow_declare_cancel" type="checkbox"
  - [최고 관리자] `input` name="declared_message[]" type="checkbox"
  - [게시판 관리자] `input` name="declared_message[]" type="checkbox"

*Form* (action: `http://localhost/`)
  - [댓글 수] `input` name="comment_count" type="number"
  - `input` name="comment_page_count" type="number"
  - [대댓글 최대 깊이] `input` name="max_thread_depth" type="number"
  - `select` name="default_page" type="select-one" | Options: 첫 페이지, 마지막 페이지
  - [예] `input` name="use_comment_validation" type="radio"
  - [아니오] `input` name="use_comment_validation" type="radio"
  - [추천] `select` name="use_vote_up" type="select-one" | Options: 사용, 사용 + 추천내역 공개, 미사용
  - [비추천] `select` name="use_vote_down" type="select-one" | Options: 사용, 사용 + 추천내역 공개, 미사용
  - [동일 IP 추천 허용] `input` name="allow_vote_from_same_ip" type="checkbox"
  - [추천 취소 허용] `input` name="allow_vote_cancel" type="checkbox"
  - [비회원 추천 허용] `input` name="allow_vote_non_member" type="checkbox"
  - [동일 IP 신고 허용] `input` name="allow_declare_from_same_ip" type="checkbox"
  - [신고 취소 허용] `input` name="allow_declare_cancel" type="checkbox"
  - [최고 관리자] `input` name="declared_message[]" type="checkbox"
  - [게시판 관리자] `input` name="declared_message[]" type="checkbox"

*Form* (action: `http://localhost/`)
  - [에디터 모듈의 기본 설정을 따릅니다.] `input` name="default_editor_settings" type="checkbox"
  - `select` name="editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="editor_colorset" type="select-one" | Options: Moono, Moono Dark, Moono Lisa
  - `input` name="editor_height" type="number"
  - `select` name="editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="editor_toolbar_hide" type="checkbox"
  - `select` name="comment_editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="comment_editor_colorset" type="select-one" | Options: Moono, Moono Dark, Moono Lisa
  - `input` name="comment_editor_height" type="number"
  - `select` name="comment_editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="comment_editor_toolbar_hide" type="checkbox"
  - `select` name="mobile_editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="mobile_editor_colorset" type="select-one" | Options: Light, Dark
  - `input` name="mobile_editor_height" type="number"
  - `select` name="mobile_editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="mobile_editor_toolbar_hide" type="checkbox"
  - `select` name="mobile_comment_editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="mobile_comment_editor_colorset" type="select-one" | Options: Light, Dark
  - `input` name="mobile_comment_editor_height" type="number"
  - `select` name="mobile_comment_editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="mobile_comment_editor_toolbar_hide" type="checkbox"
  - [none (inherit)] `input` name="content_font" type="radio"
  - [Arial] `input` name="content_font" type="radio"
  - [Tahoma] `input` name="content_font" type="radio"
  - [Verdana] `input` name="content_font" type="radio"
  - [sans-serif] `input` name="content_font" type="radio"
  - [Georgia] `input` name="content_font" type="radio"
  - [Palatino Linotype] `input` name="content_font" type="radio"
  - [Times New Roman] `input` name="content_font" type="radio"
  - [serif] `input` name="content_font" type="radio"
  - [Consolas] `input` name="content_font" type="radio"
  - [Courier New] `input` name="content_font" type="radio"
  - [Lucida Console] `input` name="content_font" type="radio"
  - [monospace] `input` name="content_font" type="radio"
  - [굴림] `input` name="content_font" type="radio"
  - [궁서] `input` name="content_font" type="radio"
  - [돋움] `input` name="content_font" type="radio"
  - [바탕] `input` name="content_font" type="radio"
  - [맑은 고딕] `input` name="content_font" type="radio"
  - [나눔고딕] `input` name="content_font" type="radio"
  - [사용자 설정 :] `input` name="font_defined" type="radio"
  - [사용자 설정 :] `input` name="content_font_defined" type="text"
  - `input` name="content_font_size" type="text"
  - [예] `input` name="enable_autosave" type="radio"
  - [아니오] `input` name="enable_autosave" type="radio"
  - [예] `input` name="auto_dark_mode" type="radio"
  - [아니오] `input` name="auto_dark_mode" type="radio"
  - [예] `input` name="allow_html" type="radio"
  - [아니오] `input` name="allow_html" type="radio"
  - [관리그룹] `input` name="enable_html_grant[]" type="checkbox"
  - [준회원] `input` name="enable_html_grant[]" type="checkbox"
  - [정회원] `input` name="enable_html_grant[]" type="checkbox"
  - [관리그룹] `input` name="enable_comment_html_grant[]" type="checkbox"
  - [준회원] `input` name="enable_comment_html_grant[]" type="checkbox"
  - [정회원] `input` name="enable_comment_html_grant[]" type="checkbox"
  - [관리그룹] `input` name="upload_file_grant[]" type="checkbox"
  - [준회원] `input` name="upload_file_grant[]" type="checkbox"
  - [정회원] `input` name="upload_file_grant[]" type="checkbox"
  - [관리그룹] `input` name="comment_upload_file_grant[]" type="checkbox"
  - [준회원] `input` name="comment_upload_file_grant[]" type="checkbox"
  - [정회원] `input` name="comment_upload_file_grant[]" type="checkbox"
  - [관리그룹] `input` name="enable_default_component_grant[]" type="checkbox"
  - [준회원] `input` name="enable_default_component_grant[]" type="checkbox"
  - [정회원] `input` name="enable_default_component_grant[]" type="checkbox"
  - [관리그룹] `input` name="enable_comment_default_component_grant[]" type="checkbox"
  - [준회원] `input` name="enable_comment_default_component_grant[]" type="checkbox"
  - [정회원] `input` name="enable_comment_default_component_grant[]" type="checkbox"
  - [관리그룹] `input` name="enable_component_grant[]" type="checkbox"
  - [준회원] `input` name="enable_component_grant[]" type="checkbox"
  - [정회원] `input` name="enable_component_grant[]" type="checkbox"
  - [관리그룹] `input` name="enable_comment_component_grant[]" type="checkbox"
  - [준회원] `input` name="enable_comment_component_grant[]" type="checkbox"
  - [정회원] `input` name="enable_comment_component_grant[]" type="checkbox"

*Form* (action: `http://localhost/`)
  - [피드(Feed) 공개] `select` name="open_rss" type="select-one" | Options: 전문 공개, 요약 공개, 공개하지 않음
  - [통합 피드에 포함] `select` name="open_total_feed" type="select-one" | Options: 사용, 미사용
  - [설명] `textarea` name="feed_description" type="textarea"
  - [저작권] `textarea` name="feed_copyright" type="textarea"

*manageSelectedModuleGrant* (action: `http://localhost/`)
  - [목록] `select` name="list_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="list[]" type="checkbox"
  - [준회원] `input` name="list[]" type="checkbox"
  - [정회원] `input` name="list[]" type="checkbox"
  - [열람] `select` name="view_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="view[]" type="checkbox"
  - [준회원] `input` name="view[]" type="checkbox"
  - [정회원] `input` name="view[]" type="checkbox"
  - [글 작성] `select` name="write_document_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="write_document[]" type="checkbox"
  - [준회원] `input` name="write_document[]" type="checkbox"
  - [정회원] `input` name="write_document[]" type="checkbox"
  - [댓글 작성] `select` name="write_comment_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="write_comment[]" type="checkbox"
  - [준회원] `input` name="write_comment[]" type="checkbox"
  - [정회원] `input` name="write_comment[]" type="checkbox"
  - [추천인 보기] `select` name="vote_log_view_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="vote_log_view[]" type="checkbox"
  - [준회원] `input` name="vote_log_view[]" type="checkbox"
  - [정회원] `input` name="vote_log_view[]" type="checkbox"
  - [수정 내역 보기] `select` name="update_view_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="update_view[]" type="checkbox"
  - [준회원] `input` name="update_view[]" type="checkbox"
  - [정회원] `input` name="update_view[]" type="checkbox"
  - [상담글 열람] `select` name="consultation_read_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="consultation_read[]" type="checkbox"
  - [준회원] `input` name="consultation_read[]" type="checkbox"
  - [정회원] `input` name="consultation_read[]" type="checkbox"
  - [접근 권한] `select` name="access_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="access[]" type="checkbox"
  - [준회원] `input` name="access[]" type="checkbox"
  - [정회원] `input` name="access[]" type="checkbox"
  - [관리 권한] `select` name="manager_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="manager[]" type="checkbox"
  - [준회원] `input` name="manager[]" type="checkbox"
  - [정회원] `input` name="manager[]" type="checkbox"

**Tables** (3):

*Total: 3, Page: 1/1* (3 rows)
  Columns: 번호 | 모듈 분류 | 도메인 / | URL | 브라우저 제목 | 특이사항 | 등록일 | 편집 | 
  Sample: 55 | 없음 | / | notice | Notice |  | 2026-02-28 | 설정  
				 복사  
				 삭제 | 

*Table 2* (0 rows)
  Columns: 모듈 이름 | 브라우저 제목

*Table 3* (12 rows)
  Columns:  | 문서 | 댓글 | 기본 에디터 설정 사용
  Sample: 에디터 모듈의 기본 설정을 따릅니다.

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

---

## 7. Content Management (콘텐츠 관리)

### Document List (문서)
- **URL**: `http://localhost/index.php?module=admin&act=dispDocumentAdminList`
- **Title**: 문서

**Forms** (3):

*fo_list* (action: `http://localhost/`)
  - `input` name="cart" type="checkbox"
  - `input` name="cart" type="checkbox"
  - `input` name="cart" type="checkbox"

*Form* (action: `http://localhost/`)
  - `select` name="module_srl" type="select-one" | Options: 전체, Welcome, Free Board
  - `select` name="search_target" type="select-one" | Options: 제목, 내용, 아이디, 회원 번호, 사용자 이름, 닉네임, 이메일, 홈페이지, 공지사항, 비밀글, 태그, 조회 수 (이상), 추천 수 (이상), 비추천 수 (이상), 댓글 수 (이상), 트랙백 수 (이상), 첨부파일 수 (이상), 등록일, 최근 수정일, IP 주소
  - `input` name="search_keyword" type="search"

*manageForm* (action: `http://localhost/`)
  - [기본 내용으로 쪽지 보내기] `input` name="send_message" type="radio"
  - [아래 내용으로 쪽지 보내기] `input` name="send_message" type="radio"
  - [쪽지 보내지 않음] `input` name="send_message" type="radio"
  - `textarea` name="message_content" type="textarea"

**Tables** (2):

*전체(3)
			|
			공개
			|
			비밀
			|
			임시
			|
			신고 목록
		
			
				휴지통
				삭제
				이동
				복사
			
			
				간단보기
				상세보기* (3 rows)
  Columns: 제목 | 글쓴이 | 조회 수 | 추천(+/-) | 날짜 | IP 주소 | 상태 | 
  Sample: 자유게시판
							- Free Board | admin | 0 | 0/0 | 2026-02-28 20:32:36
					02-28 | 172.19.0.1 | 공개 | 

*선택한 글* (0 rows)
  Columns: 제목 | 글쓴이 | 상태

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Comment List (댓글)
- **URL**: `http://localhost/index.php?module=admin&act=dispCommentAdminList`
- **Title**: 댓글

**Forms** (2):

*Form* (action: `http://localhost/`)
  - `select` name="module_srl" type="select-one" | Options: 전체
  - `select` name="search_target" type="select-one" | Options: 내용, 아이디, 이름, 닉네임, 회원 번호, 이메일 주소, 홈페이지, 등록일, 최근수정일, IP 주소, 상태
  - `input` name="search_keyword" type="search"

*listManager* (action: `http://localhost/`)
  - [저작자에게 쪽지를 발송해서 이 사실을 알립니다. 작성하지 않으면 발송하지 않습니다.] `textarea` name="message_content" type="textarea"

**Tables** (2):

*전체(0)
			|
			공개
			|
			비밀
			|
			대기
			|
			발행
		
			
				휴지통
				삭제
			발행 중지	발행			
			
				간단보기
				상세보기* (1 rows)
  Columns: 댓글 | 글쓴이 | 추천 / 비추천 | 날짜 | IP 주소 | 상태 | 
  Sample: 등록된 글이 없습니다.

*선택한 댓글* (0 rows)
  Columns: 댓글 | 글쓴이 | 상태 | 발행 상태

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### File List (파일)
- **URL**: `http://localhost/index.php?module=admin&act=dispFileAdminList`
- **Title**: 파일

**Forms** (1):

*Form* (action: `http://localhost/`)
  - `select` name="module_srl" type="select-one" | Options: 전체
  - `select` name="search_target" type="select-one" | Options: 파일 이름, 파일 크기(byte, 이상), 파일 크기(MB, 이상), 파일 크기(byte, 이하), 파일 크기(MB, 이하), 다운로드 횟수(이상), 다운로드 횟수(이하), 아이디, 이름, 닉네임, 등록일, IP 주소, 상태
  - `input` name="search_keyword" type="search"

**Tables** (2):

*전체(0)
			|
			유효
			|
			대기

			삭제* (1 rows)
  Columns: 파일 | 파일 크기 | 이미지 크기 | 다운로드 | 작성자 | 날짜 | IP 주소 | 상태 | 편집 | 
  Sample: 파일이 없습니다.

*선택한 파일* (0 rows)
  Columns: 파일 | 파일 크기 | 상태

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Page Admin (페이지)
- **URL**: `http://localhost/index.php?module=admin&act=dispPageAdminContent`
- **Title**: 페이지

**Forms** (4):

*Form* (action: `http://localhost/`)
  - `select` name="search_target" type="select-one" | Options: 모듈 이름, 브라우저 제목
  - `input` name="search_keyword" type="search"

*fo_list* (action: `http://localhost/`)
  - `input` name="cart" type="checkbox"
  - `input` name="cart" type="checkbox"
  - `input` name="cart" type="checkbox"

*manageSelectedModuleSetup* (action: `http://localhost/`)
  - [모듈 분류] `select` name="module_category_srl" type="select-one" | Options: 기존 값 유지, 미사용
  - [레이아웃] `select` name="layout_srl" type="select-one" | Options: 기존 값 유지, 미사용, 사이트 기본 레이아웃 사용 (XEDITION), 테스트 레이아웃 (user_layout), 기본 레이아웃 (default), XEDITION (xedition)
  - [스킨] `select` name="skin" type="select-one" | Options: 기존 값 유지, 사이트 기본 스킨 사용 (Default Page Skin), Default Page Skin
  - [모바일 뷰 사용] `select` name="use_mobile" type="select-one" | Options: 기존 값 유지, 사용, 미사용
  - [모바일 레이아웃] `select` name="mlayout_srl" type="select-one" | Options: 기존 값 유지, 미사용, PC와 동일한 반응형 레이아웃 사용 (), 사이트 기본 레이아웃 사용 (XE 공식 사이트 모바일 레이아웃), XE 심플 그레이 레이아웃 (simpleGray), XE Color Code 모바일 레이아웃 (colorCode), welcome_mobile_layout (default)
  - [모바일 스킨] `select` name="mskin" type="select-one" | Options: 기존 값 유지, 사이트 기본 스킨 사용 (Default Mobile Page Skin), PC와 동일한 반응형 스킨 사용, Default Mobile Page Skin
  - [설명] `textarea` name="description" type="textarea"
  - [삭제] `input` name="description_delete" type="checkbox"
  - `textarea` name="header_text" type="textarea"
  - [상단 내용] `textarea` name="" type="textarea"
  - [삭제] `input` name="header_text_delete" type="checkbox"
  - `textarea` name="footer_text" type="textarea"
  - [하단 내용] `textarea` name="" type="textarea"
  - [삭제] `input` name="footer_text_delete" type="checkbox"

*manageSelectedModuleGrant* (action: `http://localhost/`)
  - [페이지 수정] `select` name="modify_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="modify[]" type="checkbox"
  - [준회원] `input` name="modify[]" type="checkbox"
  - [정회원] `input` name="modify[]" type="checkbox"
  - [접근 권한] `select` name="access_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="access[]" type="checkbox"
  - [준회원] `input` name="access[]" type="checkbox"
  - [정회원] `input` name="access[]" type="checkbox"
  - [관리 권한] `select` name="manager_default" type="select-one" | Options: 모든 방문자, 로그인 사용자, 비로그인 사용자, 관리자만, 선택 그룹 소속 회원
  - [관리그룹] `input` name="manager[]" type="checkbox"
  - [준회원] `input` name="manager[]" type="checkbox"
  - [정회원] `input` name="manager[]" type="checkbox"

**Tables** (2):

*Total: 3, Page: 1/1* (3 rows)
  Columns: 번호 | 모듈 분류 | 페이지 타입 | 도메인 / | URL | 브라우저 제목 | 등록일 | 편집 | 
  Sample: 63 | 없음 | 문서 페이지 | / | privacy | Privacy Policy | 2026-02-28 | 설정  
				 복사  
				 삭제 | 

*Table 2* (0 rows)
  Columns: 모듈 이름 | 브라우저 제목

**Buttons**: ×, 검색, 다국어 텍스트 해제, 등록, 닫기, 취소, 저장 후 사용, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 확인

### Poll Admin (설문)
- **URL**: `http://localhost/index.php?module=admin&act=dispPollAdminList`
- **Title**: 설문

**Forms** (1):

*Form* (action: `http://localhost/`)
  - `select` name="search_target" type="select-one" | Options: 제목, 등록일, IP 주소
  - `input` name="search_keyword" type="search"

**Tables** (1):

*전체(0)* (1 rows)
  Columns: 제목 | 필수 항목 수 | 참가자 | 작성자 | 등록일 | 설문조사 종료일 | 
  Sample: 등록된 데이터가 없습니다.

**Buttons**: ×, 삭제, 검색, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

### Trash (휴지통)
- **URL**: `http://localhost/index.php?module=admin&act=dispTrashAdminList`
- **Title**: 휴지통
- **Section Headings**: 휴지통비우기 타입

**Forms** (2):

*Form* (action: `http://localhost/`)
  - [문서] `input` name="is_type" type="radio"
  - [댓글] `input` name="is_type" type="radio"

*Form* (action: `http://localhost/`)
  - `select` name="search_target" type="select-one" | Options: 제목, 삭제자 아이디, 삭제자 닉네임, 삭제자 IP 주소
  - `input` name="search_keyword" type="search"

**Tables** (2):

*전체(0)
			|
			문서
			|
			댓글
			
				삭제
				복원* (1 rows)
  Columns: 타입 | 문서 | 작성자 | IP 주소 | 옮긴 사람 | 삭제 날짜 | 설명 | 
  Sample: 등록된 글이 없습니다.

*선택한 글* (0 rows)
  Columns: 문서 | 옮긴 사람 | IP 주소

**Buttons**: ×, 휴지통 비우기, 검색, confirm, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

---

## 8. Points System (포인트)

### Point Configuration (포인트)
- **URL**: `http://localhost/index.php?module=admin&act=dispPointAdminConfig`
- **Title**: 포인트

**Forms** (1):

*point_module_config_form* (action: `http://localhost/`)
  - [포인트 모듈 켜기] `input` name="able_module" type="checkbox"
  - [포인트 이름] `input` name="point_name" type="text"
  - [최고 레벨] `input` name="max_level" type="number"
  - [레벨 아이콘] `select` name="level_icon" type="select-one" | Options: default, default_vector
  - [다운로드 금지] `input` name="disable_download" type="checkbox"
  - [글 열람 금지] `input` name="disable_read_document" type="checkbox"
  - `input` name="disable_read_document_except_robots" type="checkbox"
  - `input` name="signup_point" type="number"
  - `input` name="login_point" type="number"
  - `input` name="insert_document" type="number"
  - [삭제시 회수] `input` name="insert_document_revert_on_delete" type="checkbox"
  - `input` name="insert_comment" type="number"
  - [삭제시 회수] `input` name="insert_comment_revert_on_delete" type="checkbox"
  - `input` name="insert_comment_limit" type="number"
  - `input` name="upload_file" type="number"
  - [삭제시 회수] `input` name="upload_file_revert_on_delete" type="checkbox"
  - `input` name="download_file" type="number"
  - `input` name="read_document" type="number"
  - [공지 제외] `input` name="read_document_except_notice" type="checkbox"
  - `input` name="read_document_limit" type="number"
  - `input` name="voter" type="number"
  - `input` name="voter_limit" type="number"
  - `input` name="blamer" type="number"
  - `input` name="blamer_limit" type="number"
  - `input` name="voter_comment" type="number"
  - `input` name="voter_comment_limit" type="number"
  - `input` name="blamer_comment" type="number"
  - `input` name="blamer_comment_limit" type="number"
  - `input` name="download_file_author" type="number"
  - `input` name="read_document_author" type="number"
  - [공지 제외] `input` name="read_document_author_except_notice" type="checkbox"
  - `input` name="read_document_author_limit" type="number"
  - `input` name="voted" type="number"
  - `input` name="voted_limit" type="number"
  - `input` name="blamed" type="number"
  - `input` name="blamed_limit" type="number"
  - `input` name="voted_comment" type="number"
  - `input` name="voted_comment_limit" type="number"
  - `input` name="blamed_comment" type="number"
  - `input` name="blamed_comment_limit" type="number"
  - [그룹 연동 방식] `select` name="group_reset" type="select-one" | Options: 예전 그룹을 제거하고 새 그룹을 추가, 예전 그룹을 유지하며 새 그룹을 추가
  - [포인트 감소 처리 방식] `select` name="group_ratchet" type="select-one" | Options: 포인트가 감소하더라도 기존 그룹을 유지, 포인트가 감소하면 하위 그룹으로 이동
  - [정회원] `input` name="point_group_4" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"
  - [point] `input` name="" type="number"

**Tables** (2):

*Table 1* (17 rows)
  Columns: 회원가입
  Sample: point | 

*Table 2* (31 rows)
  Columns: 레벨 | 레벨 아이콘 | 포인트 | 회원 그룹

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

---

## 9. Spam Filter (스팸필터)

### Spam Filter (스팸필터)
- **URL**: `http://localhost/index.php?module=admin&act=dispSpamfilterAdminDeniedIPList`
- **Title**: 스팸필터

**Forms** (2):

*Form* (action: `http://localhost/`)
  - `input` name="ipaddress" type="checkbox"

*Form* (action: `http://localhost/`)
  - `textarea` name="ipaddress_list" type="textarea"

**Tables** (1):

*스팸 IP 목록
				삭제* (1 rows)
  Columns: IP | 설명 | 회원 제외 | 최근 히트 | 히트 | 등록일 ▼ | 
  Sample: 등록된 데이터가 없습니다.

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

---

## 10. Editor Settings (에디터)

### Editor Admin (에디터)
- **URL**: `http://localhost/index.php?module=admin&act=dispEditorAdminIndex`
- **Title**: 에디터

**Forms** (2):

*Form* (action: `http://localhost/`)
  - `select` name="editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="editor_colorset" type="select-one" | Options: Moono, Moono Dark, Moono Lisa
  - `input` name="editor_height" type="number"
  - `select` name="editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="editor_toolbar_hide" type="checkbox"
  - `select` name="mobile_editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="mobile_editor_colorset" type="select-one" | Options: Light, Dark
  - `input` name="mobile_editor_height" type="number"
  - `select` name="mobile_editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="mobile_editor_toolbar_hide" type="checkbox"
  - `select` name="comment_editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="comment_editor_colorset" type="select-one" | Options: Moono, Moono Dark, Moono Lisa
  - `input` name="comment_editor_height" type="number"
  - `select` name="comment_editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="comment_editor_toolbar_hide" type="checkbox"
  - `select` name="mobile_comment_editor_skin" type="select-one" | Options: CKEditor, SimpleEditor, Textarea
  - `select` name="mobile_comment_editor_colorset" type="select-one" | Options: Light, Dark
  - `input` name="mobile_comment_editor_height" type="number"
  - `select` name="mobile_comment_editor_toolbar" type="select-one" | Options: 기본, 간단
  - [숨김] `input` name="mobile_comment_editor_toolbar_hide" type="checkbox"
  - [none (inherit)] `input` name="content_font" type="radio"
  - [Arial] `input` name="content_font" type="radio"
  - [Tahoma] `input` name="content_font" type="radio"
  - [Verdana] `input` name="content_font" type="radio"
  - [sans-serif] `input` name="content_font" type="radio"
  - [Georgia] `input` name="content_font" type="radio"
  - [Palatino Linotype] `input` name="content_font" type="radio"
  - [Times New Roman] `input` name="content_font" type="radio"
  - [serif] `input` name="content_font" type="radio"
  - [Consolas] `input` name="content_font" type="radio"
  - [Courier New] `input` name="content_font" type="radio"
  - [Lucida Console] `input` name="content_font" type="radio"
  - [monospace] `input` name="content_font" type="radio"
  - [굴림] `input` name="content_font" type="radio"
  - [궁서] `input` name="content_font" type="radio"
  - [돋움] `input` name="content_font" type="radio"
  - [바탕] `input` name="content_font" type="radio"
  - [맑은 고딕] `input` name="content_font" type="radio"
  - [나눔고딕] `input` name="content_font" type="radio"
  - [사용자 설정 :] `input` name="font_defined" type="radio"
  - `input` name="content_font_defined" type="text"
  - `textarea` name="additional_css" type="textarea"
  - `textarea` name="additional_mobile_css" type="textarea"
  - `input` name="additional_plugins" type="text"
  - `input` name="remove_plugins" type="text"
  - [추가 플러그인 로드] `input` name="content_font_size" type="text"
  - [줄 간격] `input` name="content_line_height" type="text"
  - [문단 간격] `input` name="content_paragraph_spacing" type="text"
  - [한글은 글자 단위로 줄바꿈, 영문은 단어 단위로 줄바꿈 (기본값)] `input` name="content_word_break" type="radio"
  - [모든 언어를 단어 단위로 줄바꿈] `input` name="content_word_break" type="radio"
  - [모든 언어를 글자 단위로 줄바꿈] `input` name="content_word_break" type="radio"
  - [줄을 바꾸지 않음] `input` name="content_word_break" type="radio"
  - [예] `input` name="enable_autosave" type="radio"
  - [아니오] `input` name="enable_autosave" type="radio"
  - [예] `input` name="auto_dark_mode" type="radio"
  - [아니오] `input` name="auto_dark_mode" type="radio"
  - [예] `input` name="allow_html" type="radio"
  - [아니오] `input` name="allow_html" type="radio"
  - [이미지] `input` name="autoinsert_types[]" type="checkbox"
  - [오디오] `input` name="autoinsert_types[]" type="checkbox"
  - [동영상] `input` name="autoinsert_types[]" type="checkbox"
  - [커서 위치에서 줄을 바꾸어 삽입] `input` name="autoinsert_position" type="radio"
  - [커서 위치에 직접 삽입] `input` name="autoinsert_position" type="radio"

*Form* (action: `http://localhost/`)
  - `input` name="enables[]" type="checkbox"
  - `input` name="enables[]" type="checkbox"
  - `input` name="enables[]" type="checkbox"
  - `input` name="enables[]" type="checkbox"

**Tables** (1):

*전체개수(4)
				
					간단보기
					상세보기* (4 rows)
  Columns: 이동 | 컴포넌트 | 버전 | 작성자 | 설치경로 | 사용 | 삭제
  Sample: Move to | 이모티콘 출력
						
						이모티콘을 에디터에 삽입할 수 있습니다. | 1.9 | Rhymix contributorsNAVER | ./modules/editor/components/emoticon |  | 

**Buttons**: ×, Toggle this section, 저장, Move to, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

---

## 11. Notifications & Messaging

### Mail/SMS/Push Management (메일, SMS 및 푸시 알림 관리)
- **URL**: `http://localhost/index.php?module=admin&act=dispAdvanced_mailerAdminConfig`
- **Title**: 메일, SMS 및 푸시 알림 관리
- **Section Headings**: 기본 발송 방법 설정 / 보낸이 설정 / 발송 내역 기록

**Forms** (1):

*advanced_mailer* (action: `http://localhost/`)
  - [메일 발송 내역] `select` name="log_sent_mail" type="select-one" | Options: 기록, 기록하지 않음
  - `select` name="log_errors" type="select-one" | Options: 기록, 기록하지 않음
  - [SMS 발송 내역] `select` name="log_sent_sms" type="select-one" | Options: 기록, 기록하지 않음
  - `select` name="log_sms_errors" type="select-one" | Options: 기록, 기록하지 않음
  - [푸시 알림 발송 내역] `select` name="log_sent_push" type="select-one" | Options: 기록, 기록하지 않음
  - `select` name="log_push_errors" type="select-one" | Options: 기록, 기록하지 않음

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Notification Center (알림 센터)
- **URL**: `http://localhost/index.php?module=admin&act=dispNcenterliteAdminConfig`
- **Title**: 알림 센터

**Forms** (1):

*fo_ncenterlite* (action: `http://localhost/`)
  - [웹 알림] `input` name="use[comment][web]" type="checkbox"
  - [메일 알림] `input` name="use[comment][mail]" type="checkbox"
  - [문자 알림] `input` name="use[comment][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[comment][push]" type="checkbox"
  - [웹 알림] `input` name="use[comment_comment][web]" type="checkbox"
  - [메일 알림] `input` name="use[comment_comment][mail]" type="checkbox"
  - [문자 알림] `input` name="use[comment_comment][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[comment_comment][push]" type="checkbox"
  - [웹 알림] `input` name="use[mention][web]" type="checkbox"
  - [메일 알림] `input` name="use[mention][mail]" type="checkbox"
  - [문자 알림] `input` name="use[mention][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[mention][push]" type="checkbox"
  - [웹 알림] `input` name="use[vote][web]" type="checkbox"
  - [메일 알림] `input` name="use[vote][mail]" type="checkbox"
  - [문자 알림] `input` name="use[vote][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[vote][push]" type="checkbox"
  - [웹 알림] `input` name="use[scrap][web]" type="checkbox"
  - [메일 알림] `input` name="use[scrap][mail]" type="checkbox"
  - [문자 알림] `input` name="use[scrap][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[scrap][push]" type="checkbox"
  - [웹 알림] `input` name="use[message][web]" type="checkbox"
  - [메일 알림] `input` name="use[message][mail]" type="checkbox"
  - [문자 알림] `input` name="use[message][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[message][push]" type="checkbox"
  - [웹 알림] `input` name="use[admin_content][web]" type="checkbox"
  - [메일 알림] `input` name="use[admin_content][mail]" type="checkbox"
  - [문자 알림] `input` name="use[admin_content][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[admin_content][push]" type="checkbox"
  - [웹 알림] `input` name="use[custom][web]" type="checkbox"
  - [메일 알림] `input` name="use[custom][mail]" type="checkbox"
  - [문자 알림] `input` name="use[custom][sms]" type="checkbox"
  - [푸시 알림] `input` name="use[custom][push]" type="checkbox"
  - [알림 표시 여부] `select` name="display_use" type="select-one" | Options: 모두 사용, 표시하지 않음, PC만 표시, 모바일만 표시
  - [사용] `input` name="always_display" type="radio"
  - [미사용] `input` name="always_display" type="radio"
  - [표시] `input` name="user_config_list" type="radio"
  - [표시하지 않음] `input` name="user_config_list" type="radio"
  - [사용] `input` name="user_notify_setting" type="radio"
  - [미사용] `input` name="user_notify_setting" type="radio"
  - [사용] `input` name="push_before_sms" type="radio"
  - [미사용] `input` name="push_before_sms" type="radio"
  - [삭제] `input` name="document_read" type="radio"
  - [삭제하지 않음] `input` name="document_read" type="radio"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

---

## 12. System Settings (시스템 설정)

### System General Settings (시스템 설정)
- **URL**: `http://localhost/index.php?module=admin&act=dispAdminConfigGeneral`
- **Title**: 시스템 설정
- **Section Headings**: 멀티도메인 기능 설정

**Forms** (1):

*Form* (action: `http://localhost/`)
  - [기본 도메인으로 301 Redirect (권장)] `input` name="unregistered_domain_action" type="radio"
  - [기본 도메인으로 302 Redirect] `input` name="unregistered_domain_action" type="radio"
  - [메인 화면 표시] `input` name="unregistered_domain_action" type="radio"
  - [404 Not Found 오류 표시] `input` name="unregistered_domain_action" type="radio"
  - [예] `input` name="use_sso" type="radio"
  - [아니오] `input` name="use_sso" type="radio"

**Tables** (1):

*간단보기
				상세보기* (1 rows)
  Columns: 사이트 제목 | 도메인 | HTTPS 사용 | 메인 모듈 | 메인 문서 | 수정 / 삭제 / 복사
  Sample: 기본 도메인 | localhost | 사용하지 않음 | Welcome |  | 수정
					/
								삭제
						/
					복사

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Admin UI Settings (관리자 화면 설정)
- **URL**: `http://localhost/index.php?module=admin&act=dispAdminSetup`
- **Title**: 관리자 화면 설정

**Forms** (1):

*editForm* (action: `http://localhost/`)
  - [모듈] `select` name="menu_name" type="select-one"

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### System Security (보안 설정)
- **URL**: `http://localhost/index.php?module=admin&act=dispAdminConfigSecurity`
- **Title**: 시스템 설정

**Forms** (1):

*Form* (action: `http://localhost/`)
  - [외부 멀티미디어 허용] `textarea` name="mediafilter_whitelist" type="textarea"
  - [HTML class 허용] `textarea` name="mediafilter_classes" type="textarea"
  - [로봇 user-agent] `textarea` name="robot_user_agents" type="textarea"
  - [관리자 로그인 허용 IP] `textarea` name="admin_allowed_ip" type="textarea" placeholder="172.19.0.1 (로컬 IP 주소)"
  - [관리자 로그인 금지 IP] `textarea` name="admin_denied_ip" type="textarea"
  - `input` name="autologin_lifetime" type="number"
  - [보안키 갱신] `input` name="autologin_refresh" type="checkbox"
  - [예] `input` name="use_session_ssl" type="radio"
  - [아니오] `input` name="use_session_ssl" type="radio"
  - [예] `input` name="use_cookies_ssl" type="radio"
  - [아니오] `input` name="use_cookies_ssl" type="radio"
  - [예] `input` name="check_csrf_token" type="radio"
  - [아니오] `input` name="check_csrf_token" type="radio"
  - [예] `input` name="use_nofollow" type="radio"
  - [아니오] `input` name="use_nofollow" type="radio"
  - [예] `input` name="use_httponly" type="radio"
  - [아니오] `input` name="use_httponly" type="radio"
  - [Strict] `input` name="use_samesite" type="radio"
  - [Lax] `input` name="use_samesite" type="radio"
  - [None] `input` name="use_samesite" type="radio"
  - [표기하지 않음] `input` name="use_samesite" type="radio"
  - [Deny] `input` name="x_frame_options" type="radio"
  - [SameOrigin] `input` name="x_frame_options" type="radio"
  - [표기하지 않음] `input` name="x_frame_options" type="radio"
  - [nosniff] `input` name="x_content_type_options" type="radio"
  - [표기하지 않음] `input` name="x_content_type_options" type="radio"

**Buttons**: ×, 저장, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

---

## 13. Modules, Addons & Widgets

### Installed Modules (설치된 모듈)
- **URL**: `http://localhost/index.php?module=admin&act=dispModuleAdminContent`
- **Title**: 설치된 모듈

**Tables** (1):

*전체 (32)
		
			간단보기
			상세보기* (32 rows)
  Columns: 즐겨찾기 | 모듈 이름 | 버전 | 작성자 | 설치경로
  Sample: 즐겨찾기 (꺼짐) | 애드온					
	애드온을 등록하거나 사용/미사용을 설정합니다. |  | NAVER | ./modules/addon/

**Buttons**: ×, 간단보기, 상세보기, 즐겨찾기 (꺼짐), 즐겨찾기 (켜짐), 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

### Installed Addons (설치된 애드온)
- **URL**: `http://localhost/index.php?module=admin&act=dispAddonAdminIndex`
- **Title**: 설치된 애드온

**Forms** (1):

*Form* (action: `http://localhost/`)
  - `input` name="pc_on[]" type="checkbox"
  - `input` name="mobile_on[]" type="checkbox"
  - `input` name="pc_on[]" type="checkbox"
  - `input` name="mobile_on[]" type="checkbox"
  - `input` name="pc_on[]" type="checkbox"
  - `input` name="mobile_on[]" type="checkbox"
  - `input` name="pc_on[]" type="checkbox"
  - `input` name="mobile_on[]" type="checkbox"
  - `input` name="pc_on[]" type="checkbox"
  - `input` name="mobile_on[]" type="checkbox"
  - `input` name="pc_on[]" type="checkbox"
  - `input` name="mobile_on[]" type="checkbox"

**Tables** (1):

*전체 (6)
			
				간단보기
				상세보기* (6 rows)
  Columns: 애드온 이름 | 버전 | 작성자 | 설치 경로 | 설정 | PC | Mobile
  Sample: 어드민 메뉴 접근 로깅						
					admin menu에 접근한 기록을 로깅하는 애드온입니다. |  | NAVER | ./addons/adminlogging/ | 설정 |  | 

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Installed Widgets (설치된 위젯)
- **URL**: `http://localhost/index.php?module=admin&act=dispWidgetAdminDownloadedList`
- **Title**: 설치된 위젯

**Tables** (1):

*전체 (6)
		
			간단보기
			상세보기* (6 rows)
  Columns: 위젯 이름 | 버전 | 작성자 | 설치경로 | 코드생성
  Sample: Content 위젯
				게시판, 코멘트, 첨부파일 등 Content를 출력하는 위젯입니다. |  | NAVER | ./widgets/content/ | 코드생성

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### Easy Install (쉬운 설치)
- **URL**: `http://localhost/index.php?module=admin&act=dispAutoinstallAdminIndex`
- **Title**: 쉬운 설치
- **Section Headings**: 프로그램 / 스킨

**Forms** (1):

*Form* (action: `http://localhost/`)
  - `input` name="search_keyword" type="search"

**Tables** (1):

*All			(0)
		
		
			간단보기
			상세보기* (0 rows)
  Columns: 섬네일 | 이름 | 배포 버전 | 설치 버전 | 실행

**Buttons**: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

### File Box (파일박스)
- **URL**: `http://localhost/index.php?module=admin&act=dispModuleAdminFileBox`
- **Title**: 파일박스

**Forms** (1):

*Form* (action: `http://localhost/`)
  - [변수명] `input` name="attribute_name[]" type="text"
  - [값] `input` name="attribute_value[]" type="text"
  - [파일] `input` name="addfile" type="file"

**Tables** (1):

*Table 1* (0 rows)
  Columns: 파일 | 변수명:값 | 삭제

**Buttons**: ×, Toggle this section, 추가, 삭제, 저장, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

---

## 14. Tools & Utilities

### Multi-language (다국어)
- **URL**: `http://localhost/index.php?module=admin&act=dispModuleAdminLangcode`
- **Title**: 다국어

**Forms** (1):

*Form* (action: `http://localhost/index.php?module=admin&act=dispModuleAdminLangcode`)
  - `select` name="lang_code" type="select-one" | Options: 한국어
  - `input` name="search_keyword" type="search"

**Buttons**: ×, 취소, 저장, 검색, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 확인

### Data Importer (데이터 들여오기)
- **URL**: `http://localhost/index.php?module=admin&act=dispImporterAdminImportForm`
- **Title**: 데이터 들여오기
- **Section Headings**: 게시물 정보 / 회원 정보 / 쪽지 정보

**Forms** (3):

*documentForm* (action: `http://localhost/`)
  - [XML 파일의 경로를 입력하세요.] `input` name="xml_file" type="text"
  - [데이터의 목적지를 선택하세요.] `input` name="target_module" type="text"
  - [방명록 데이터의 목적지를 선택하세요.] `input` name="guestbook_target_module" type="text"
  - [글쓴이로 설정할 사용자 아이디를 입력해주세요. (가입된 아이디만 가능)] `input` name="user_id" type="text"
  - [회원정보 동기화] `input` name="isSync" type="checkbox"

*memberForm* (action: `http://localhost/`)
  - [XML 파일의 경로를 입력하세요.] `input` name="xml_file" type="text"
  - [회원정보 동기화] `input` name="isSync" type="checkbox"

*fo_import* (action: `http://localhost/`)
  - [XML 파일의 경로를 입력하세요.] `input` name="xml_file" type="text"

**Buttons**: ×, 경로 확인, 데이터 들여오기, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

### RSS Feed Manager (RSS)
- **URL**: `http://localhost/index.php?module=admin&act=dispRssAdminIndex`
- **Title**: RSS

**Forms** (2):

*Form* (action: `http://localhost/`)
  - [사용] `input` name="use_total_feed" type="radio"
  - [미사용] `input` name="use_total_feed" type="radio"
  - [제목] `input` name="feed_title" type="text"
  - [설명] `textarea` name="feed_description" type="textarea"
  - [피드 이미지] `input` name="image" type="file"
  - [저작권] `input` name="feed_copyright" type="text"
  - [한 페이지당 글 수] `input` name="feed_document_count" type="number"

*Form* (action: `http://localhost/`)
  - `textarea` name="feed_description[51]" type="textarea"
  - [전문 공개] `input` name="open_rss[51]" type="radio"
  - [요약 공개] `input` name="open_rss[51]" type="radio"
  - [공개하지 않음] `input` name="open_rss[51]" type="radio"
  - [사용] `input` name="open_total_feed[51]" type="radio"
  - [미사용] `input` name="open_total_feed[51]" type="radio"
  - `textarea` name="feed_description[55]" type="textarea"
  - [전문 공개] `input` name="open_rss[55]" type="radio"
  - [요약 공개] `input` name="open_rss[55]" type="radio"
  - [공개하지 않음] `input` name="open_rss[55]" type="radio"
  - [사용] `input` name="open_total_feed[55]" type="radio"
  - [미사용] `input` name="open_total_feed[55]" type="radio"
  - `textarea` name="feed_description[53]" type="textarea"
  - [전문 공개] `input` name="open_rss[53]" type="radio"
  - [요약 공개] `input` name="open_rss[53]" type="radio"
  - [공개하지 않음] `input` name="open_rss[53]" type="radio"
  - [사용] `input` name="open_total_feed[53]" type="radio"
  - [미사용] `input` name="open_total_feed[53]" type="radio"

**Tables** (1):

*Table 1* (3 rows)
  Columns: 모듈 이름 | 설명 | 피드(Feed) 공개 | 통합 피드에 포함
  Sample: board |  | 전문 공개 						
							 요약 공개						
							 공개하지 않음 | 사용						
						
							 미사용

**Buttons**: ×, Toggle this section, 저장, 관리자 메뉴 초기화, 캐시파일 재생성, 세션 정리, 취소, 확인

---

## 15. Complete Feature Inventory

### Member Management
| Feature | URL Pattern | Description |
|---------|-------------|-------------|
| Member List | `act=dispMemberAdminList` | Browse/search all members with filters |
| Member Add | `act=dispMemberAdminInsert` | Add new member with custom fields |
| Member Edit | `act=dispMemberAdminInsert&member_srl=N` | Edit existing member info |
| Member Config | `act=dispMemberAdminConfig` | Global member system settings |
| Member Groups | `act=dispMemberAdminGroupList` | Group management with permissions |

### Content Management
| Feature | URL Pattern | Description |
|---------|-------------|-------------|
| Board Admin | `act=dispBoardAdminContent` | Create and configure BBS boards |
| Document List | `act=dispDocumentAdminList` | Browse/manage all posts |
| Comment List | `act=dispCommentAdminList` | Browse/manage all comments |
| File List | `act=dispFileAdminList` | Manage all uploaded files |
| Page Admin | `act=dispPageAdminContent` | Static page management |
| Poll/Survey | `act=dispPollAdminList` | Survey/poll management |
| Trash | `act=dispTrashAdminList` | Deleted content recovery |

### Site Design
| Feature | URL Pattern | Description |
|---------|-------------|-------------|
| Site Menu Editor | `act=dispMenuAdminSiteMap` | Drag-and-drop site navigation editor |
| Site Design Settings | `act=dispMenuAdminSiteDesign` | Layout and design per page/menu |
| Layout List | `act=dispLayoutAdminInstalledList` | Installed layout templates |

### Points System
| Feature | URL Pattern | Description |
|---------|-------------|-------------|
| Point Config | `act=dispPointAdminConfig` | Point award rules for content actions |

### System & Administration
| Feature | URL Pattern | Description |
|---------|-------------|-------------|
| System Settings | `act=dispAdminConfigGeneral` | Core system configuration |
| Admin UI Settings | `act=dispAdminSetup` | Admin panel appearance |
| Easy Install | `act=dispAutoinstallAdminIndex` | One-click module/theme install |
| Module Manager | `act=dispModuleAdminContent` | Installed module management |
| Addon Manager | `act=dispAddonAdminIndex` | Addon management |
| Widget Manager | `act=dispWidgetAdminDownloadedList` | Widget management |
| Spam Filter | `act=dispSpamfilterAdminDeniedIPList` | IP/keyword blacklist |
| Mail/SMS/Push | `act=dispAdvanced_mailerAdminConfig` | Notification delivery settings |
| Notification Center | `act=dispNcenterliteAdminConfig` | In-site notification settings |
| Editor Settings | `act=dispEditorAdminIndex` | WYSIWYG editor configuration |
| Multi-language | `act=dispModuleAdminLangcode` | Internationalization settings |
| Data Importer | `act=dispImporterAdminImportForm` | Import data from other CMS |
| RSS Feed | `act=dispRssAdminIndex` | RSS feed configuration |
| File Box | `act=dispModuleAdminFileBox` | Server-side file management |

---

## 16. Technical Architecture Analysis

### URL Routing System

```
Format: /index.php?module=MODULE_NAME&act=ACTION_NAME[&param=value]
Short URL: /?module=MODULE&act=ACTION
Mid URL: /MID_NAME/ (for page-specific modules)

Action naming convention:
  disp = Display (GET, renders page)
  proc = Process (POST, handles form submission)
  ajax = AJAX endpoint

Admin actions: disp[ModuleName]Admin[Action]
  e.g., dispMemberAdminList = Display Member Admin List
        procMemberAdminDelete = Process Member Admin Delete
```

### Module System

| Module | Purpose |
|--------|--------|
| member | User account management |
| board | BBS/forum boards |
| document | Generic document storage |
| comment | Comment system |
| file | File upload management |
| layout | Page layout/template system |
| widget | UI widget components |
| menu | Site navigation |
| point | User point/reward system |
| poll | Survey/poll system |
| editor | WYSIWYG editor |
| addon | Plugin/addon system |
| spamfilter | Anti-spam |
| admin | Admin panel core |
| advanced_mailer | Email/SMS/push delivery |
| ncenterlite | In-site notifications |
| trash | Deleted content management |
| rss | RSS feed generation |
| importer | Data import tools |

### Form Submission Pattern

```
Standard Form Fields:
  - act: action name (proc...) 
  - mid: module instance ID
  - module: module name
  - _rx_csrf_token: CSRF protection
  - xe_validator_id: client-side validation ruleset
  - error_return_url: redirect on error
  - success_return_url: redirect on success
```

### Authentication System

```
Public login form:
  - user_id: text input (email or username)
  - password: password input
  - keep_signed: checkbox (Y/N) - session persistence
  - Action: procMemberLogin

Admin login form (at /admin/):
  - #uid: text input
  - #upw: password input
  - button[type="submit"]
```

### Registration System

```
Register page (/member/signup):
  - Multiple step/tab registration
  - Customizable required fields
  - Email verification
  - Terms of service agreement
  - CAPTCHA support (optional)
```

---

## 17. Screenshots Captured

All screenshots saved to: `.moai/specs/SPEC-RHYMIX-001/screenshots/asis/`

| Filename | Page / Description |
|----------|--------------------|
| 00-after-login.png | Admin panel after login |
| 01-homepage.png | Homepage (공개 메인 페이지) |
| 02-login-page.png | 02-login-page |
| 02-login.png | Member Login Page (로그인) |
| 03-register-page.png | 03-register-page |
| 03-signup.png | Member Registration (회원가입) |
| 04-admin-dashboard.png | 04-admin-dashboard |
| 04-dashboard.png | Admin Dashboard |
| 05-member-list.png | Member List Admin (회원 목록) |
| 06-member-config.png | Member Settings (회원 설정) |
| 07-member-groups.png | Member Groups (회원 그룹) |
| 08-document-list.png | Document Management (문서) |
| 08-member-permission.png | 08-member-permission |
| 09-comment-list.png | Comment Management (댓글) |
| 09-member-fields.png | 09-member-fields |
| 10-file-list.png | File Management (파일) |
| 10-member-join.png | 10-member-join |
| 11-board-list.png | 11-board-list |
| 11-site-design.png | Site Design Settings (사이트 디자인 설정) |
| 12-board-categories.png | 12-board-categories |
| 12-point-config.png | Points System Config (포인트) |
| 13-document-list.png | 13-document-list |
| 14-site-design.png | 14-site-design |
| 15-menu-list.png | 15-menu-list |
| 16-layout-list.png | 16-layout-list |
| 17-layout-config.png | 17-layout-config |
| 18-point-config.png | 18-point-config |
| 19-point-list.png | 19-point-list |
| 20-admin.png | 20-admin |
| 20-widget-list.png | 20-widget-list |
| 21-module-list.png | 21-module-list |
| 21-사이트-메뉴-편집.png | Site Menu Editor (사이트 메뉴 편집) |
| 22-addon-list.png | 22-addon-list |
| 22-게시판.png | Board Management (게시판) |
| 23-system-general.png | 23-system-general |
| 23-스팸필터.png | Spam Filter (스팸필터) |
| 24-system-ftp.png | 24-system-ftp |
| 24-메일--SMS-및-푸시-알림-관리.png | Mail/SMS/Push Management |
| 25-system-mail.png | 25-system-mail |
| 25-알림-센터.png | Notification Center (알림 센터) |
| 26-system-sms.png | 26-system-sms |
| 26-시스템-설정.png | System Settings (시스템 설정) |
| 27-admin-list.png | 27-admin-list |
| 27-쉬운-설치.png | Easy Install (쉬운 설치) |
| 28-comment-list.png | 28-comment-list |
| 28-설치된-레이아웃.png | Installed Layouts |
| 29-file-list.png | 29-file-list |
| 29-설치된-애드온.png | Installed Addons |
| 30-spam-list.png | 30-spam-list |
| 30-설치된-위젯.png | Installed Widgets |
| 31-admin-board-module.png | 31-admin-board-module |
| 31-admin.png | Member Edit Form |
| 32-admin-member-module.png | 32-admin-member-module |
| 33-admin-plugin.png | 33-admin-plugin |
| 34-admin-install.png | 34-admin-install |
| 50-install-list.png | 50-install-list |
| 51-layout-list.png | 51-layout-list |
| 52-widget-list.png | 52-widget-list |
| 53-addon-list.png | 53-addon-list |
| 54-module-list.png | 54-module-list |
| 55-system-config.png | Admin UI Settings |
| 56-admin-config.png | 56-admin-config |
| 57-board-admin.png | 57-board-admin |
| 58-theme-admin.png | 58-theme-admin |
| 59-spam-admin.png | 59-spam-admin |
| 60-group-admin.png | 60-group-admin |
| 70-page-admin.png | Page Management (페이지) |
| 71-poll-admin.png | Poll/Survey Admin (설문) |
| 72-editor-admin.png | Editor Settings (에디터) |
| 73-trash-admin.png | Trash Management (휴지통) |
| 74-filebox-admin.png | File Box (파일박스) |
| 75-module-admin.png | Module Manager (설치된 모듈) |
| 76-lang-admin.png | Multi-language (다국어) |
| 77-importer.png | Data Importer (데이터 들여오기) |
| 78-rss-admin.png | RSS Feed Manager (RSS) |
| 79-cleanup.png | 79-cleanup |
| 80-server-env.png | Server Environment Info |
| 81-member-insert.png | Add New Member Form |
| 82-member-group-add.png | 82-member-group-add |
| 83-board-create.png | 83-board-create |
| 84-layout-edit.png | 84-layout-edit |
| 85-ncenter-config.png | Notification Center Config |
| 86-mailer-config.png | Mailer Configuration |
| 87-system-db.png | 87-system-db |
| 88-system-cache.png | 88-system-cache |
| 89-system-security.png | Security Settings |
| 90-system-sns.png | 90-system-sns |

---

*Analysis generated by Playwright live browser capture. All data captured from live Rhymix CMS instance at http://localhost/*
