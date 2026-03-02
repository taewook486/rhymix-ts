# ASIS vs TOBE Comparison - Rhymix PHP CMS to Next.js Migration

## Analysis Date: 2026-03-02
## Source: Live ASIS Analysis + TOBE Codebase Review

---

## Executive Summary

이 문서는 Rhymix PHP CMS (ASIS)와 Next.js 기반 TOBE 시스템 간의 기능 비교를 제공합니다.

### Overall Migration Status

| Category | ASIS Features | TOBE Implemented | Completion Rate |
|----------|---------------|------------------|-----------------|
| Admin Core | 30 | 31 | 103% |
| Member Management | 5 | 3 | 60% |
| Content Management | 7 | 6 | 86% |
| Public Pages | 4 | 10 | 250% |
| System Settings | 8 | 4 | 50% |
| Utilities | 6 | 5 | 83% |

---

## 1. Admin Navigation Comparison

### Core Admin Pages

| Korean Name | English | ASIS URL | TOBE Route | Status | Notes |
|------------|---------|----------|------------|--------|-------|
| 대시보드 | Dashboard | `?module=admin` | `/admin` | DONE | Full implementation |
| 사이트 메뉴 편집 | Site Menu Editor | `act=dispMenuAdminSiteMap` | `/admin/menus` | DONE | Full implementation |
| 사이트 디자인 설정 | Site Design Settings | `act=dispMenuAdminSiteDesign` | `/admin/themes` | PARTIAL | Themes instead of per-page design |
| 회원 설정 | Member Settings | `act=dispMemberAdminConfig` | `/admin/settings` | PARTIAL | Combined with system settings |
| 회원 그룹 | Member Groups | `act=dispMemberAdminGroupList` | `/admin/groups` | DONE | Full implementation |
| 포인트 | Points System | `act=dispPointAdminConfig` | `/admin/points` | DONE | Full implementation |
| 게시판 | Boards | `act=dispBoardAdminContent` | `/admin/boards` | DONE | Full implementation |
| 페이지 | Pages | `act=dispPageAdminContent` | `/admin/pages` | DONE | Full implementation |
| 문서 | Documents | `act=dispDocumentAdminList` | `/admin/documents` | DONE | Full implementation |
| 댓글 | Comments | `act=dispCommentAdminList` | `/admin/comments` | DONE | Full implementation |
| 파일 | Files | `act=dispFileAdminList` | `/admin/media` | PARTIAL | Media instead of raw files |
| 설문 | Polls | `act=dispPollAdminList` | `/admin/polls` | DONE | Full implementation |
| 에디터 | Editor Settings | `act=dispEditorAdminIndex` | `/admin/editor` | DONE | Full implementation |
| 스팸필터 | Spam Filter | `act=dispSpamfilterAdminDeniedIPList` | `/admin/spam-filter` | DONE | Full implementation |
| 휴지통 | Trash | `act=dispTrashAdminList` | `/admin/trash` | DONE | Full implementation |
| 메일/SMS/푸시 | Mail/SMS/Push | `act=dispAdvanced_mailerAdminConfig` | - | MISSING | Not implemented |
| 알림 센터 | Notification Center | `act=dispNcenterliteAdminConfig` | `/admin/notification-center` | DONE | Full implementation |
| 시스템 설정 | System Settings | `act=dispAdminConfigGeneral` | `/admin/settings` | DONE | Full implementation |
| 관리자 화면 설정 | Admin UI Settings | `act=dispAdminSetup` | `/admin/admin-setup` | DONE | Full implementation |
| 파일박스 | File Box | `act=dispModuleAdminFileBox` | `/admin/filebox` | DONE | Full implementation |
| 쉬운 설치 | Easy Install | `act=dispAutoinstallAdminIndex` | `/admin/easy-install` | DONE | Full implementation |
| 설치된 레이아웃 | Installed Layouts | `act=dispLayoutAdminInstalledList` | `/admin/installed-layouts` | DONE | Full implementation |
| 설치된 모듈 | Installed Modules | `act=dispModuleAdminContent` | `/admin/modules` | DONE | Full implementation |
| 설치된 애드온 | Installed Addons | `act=dispAddonAdminIndex` | - | MISSING | Addons not in Next.js |
| 설치된 위젯 | Installed Widgets | `act=dispWidgetAdminDownloadedList` | `/admin/widgets` | DONE | Full implementation |
| 다국어 | Multi-language | `act=dispModuleAdminLangcode` | `/admin/translations` | DONE | Full implementation |
| 데이터 들여오기 | Data Importer | `act=dispImporterAdminImportForm` | - | MISSING | Not implemented |
| RSS | RSS Feeds | `act=dispRssAdminIndex` | - | MISSING | Not implemented |
| 코어 파일 정리 | Core File Cleanup | `act=dispAdminCleanupList` | - | MISSING | Not applicable to Next.js |
| 서버 환경 | Server Environment | `act=dispAdminViewServerEnv` | - | MISSING | Not implemented |

### TOBE Additional Pages (Not in ASIS)

| Route | Description | Notes |
|-------|-------------|-------|
| `/admin/analytics` | Analytics Dashboard | New feature |
| `/admin/permissions` | Permission Management | Enhanced from ASIS |
| `/admin/logs` | Admin Logs | New feature |
| `/admin/logs/[id]` | Log Detail | New feature |
| `/admin/layout` | Layout Editor | New feature |
| `/admin/layout/preview/[layoutId]` | Layout Preview | New feature |
| `/admin/notifications` | Notifications List | New feature |

---

## 2. Member Management Comparison

### ASIS Member Features

| Feature | Description | TOBE Status | Gap Analysis |
|---------|-------------|-------------|--------------|
| Member List | Browse/search all members with filters | PARTIAL | Missing advanced filters |
| Member Add | Add new member with custom fields | MISSING | Not implemented |
| Member Edit | Edit existing member info | PARTIAL | Limited fields |
| Member Config | Global member system settings | PARTIAL | Combined with settings |
| Member Groups | Group management with permissions | DONE | Full implementation |

### ASIS Member Config Fields (30 items)

```
- member_mid (URL)
- force_mid (checkbox)
- enable_join (radio: yes/no/url_key)
- enable_join_key (text)
- enable_confirm (radio: yes/no)
- authmail_expires (number + unit)
- member_profile_view (radio)
- allow_nickname_change (radio)
- update_nickname_log (radio)
- nickname_symbols (radio + allowed_list)
- nickname_spaces (checkbox)
- allow_duplicate_nickname (radio)
- password_strength (radio: low/medium/high)
- password_hashing_algorithm (select: argon2id/bcrypt/pbkdf2/sha512/sha256/sha1/md5)
- password_hashing_work_factor (select: 04-16)
- password_hashing_auto_upgrade (radio)
- password_change_invalidate_other_sessions (radio)
- password_reset_method (radio: link/random)
```

### ASIS Member Form Fields

| Field | Type | Required | TOBE Status |
|-------|------|----------|-------------|
| user_id | text | Yes | PARTIAL |
| email_address | email | Yes | DONE |
| password | password | Yes | DONE |
| password2 | password | Yes (signup) | DONE |
| user_name | text | Yes | DONE |
| nick_name | text | Yes | DONE |
| homepage | url | No | MISSING |
| blog | url | No | MISSING |
| birthday_ui | date | No | MISSING |
| allow_mailing | radio | No | MISSING |
| allow_message | radio | No | MISSING |
| is_admin | radio | No | PARTIAL |
| description | textarea | No | MISSING |
| group_srl_list[] | checkbox | No | PARTIAL |
| status | radio | No | PARTIAL |
| refused_reason | textarea | No | MISSING |
| limited_reason | textarea | No | MISSING |

---

## 3. Content Management Comparison

### ASIS Content Features

| Feature | ASIS | TOBE | Gap |
|---------|------|------|-----|
| Board Admin | Full (7 forms) | Basic | Missing advanced settings |
| Document List | Full with filters | Basic | Missing batch operations |
| Comment List | Full with filters | Basic | Missing status management |
| File List | Full | Media | Different approach |
| Page Admin | Full | Basic | Missing permissions |
| Poll/Survey | Full | Basic | Missing results view |
| Trash | Full | Basic | Missing restore options |

### ASIS Board Configuration (Missing in TOBE)

```
Module Settings:
- module_category_srl
- layout_srl
- skin
- use_mobile
- mlayout_srl
- mskin
- description
- header_text
- footer_text

Content Settings:
- use_history (history tracking)
- use_vote_up/down (voting)
- allow_vote_from_same_ip
- allow_vote_cancel
- allow_vote_non_member
- allow_declare_from_same_ip
- allow_declare_cancel
- declared_message[] (notification targets)

Comment Settings:
- comment_count
- comment_page_count
- max_thread_depth
- default_page
- use_comment_validation

Editor Settings:
- default_editor_settings
- editor_skin (CKEditor/SimpleEditor/Textarea)
- editor_colorset
- editor_height
- editor_toolbar
- content_font
- content_font_size
- enable_autosave
- auto_dark_mode
- allow_html
- upload_file_grant
- enable_component_grant

RSS Settings:
- open_rss (full/summary/none)
- open_total_feed
- feed_description
- feed_copyright

Permission Settings:
- list_default
- view_default
- write_document_default
- write_comment_default
- vote_log_view_default
- update_view_default
- consultation_read_default
- access_default
- manager_default
```

---

## 4. Points System Comparison

### ASIS Point Configuration

| Setting | Description | TOBE Status |
|---------|-------------|-------------|
| able_module | Enable/disable module | PARTIAL |
| point_name | Point name | PARTIAL |
| max_level | Maximum level | PARTIAL |
| level_icon | Level icon set | MISSING |
| disable_download | Point-based download restriction | MISSING |
| disable_read_document | Point-based read restriction | MISSING |

### Point Awards (ASIS has 30+ point rules)

```
- signup_point
- login_point
- insert_document (+ revert_on_delete)
- insert_comment (+ revert_on_delete + limit)
- upload_file (+ revert_on_delete)
- download_file
- read_document (+ except_notice + limit)
- voter (+ limit)
- blamer (+ limit)
- voter_comment (+ limit)
- blamer_comment (+ limit)
- download_file_author
- read_document_author (+ except_notice + limit)
- voted (+ limit)
- blamed (+ limit)
- voted_comment (+ limit)
- blamed_comment (+ limit)
```

### Level-Group Integration

ASIS supports automatic group promotion based on points:
- 30 levels with configurable point thresholds
- Group reset option (replace vs add)
- Group ratchet option (maintain vs demote)

---

## 5. Editor Settings Comparison

### ASIS Editor Configuration

| Setting | Options | TOBE Status |
|---------|---------|-------------|
| editor_skin | CKEditor, SimpleEditor, Textarea | MISSING |
| editor_colorset | Moono, Moono Dark, Moono Lisa | MISSING |
| editor_height | Number | MISSING |
| editor_toolbar | Basic, Simple | MISSING |
| mobile_editor_* | Same options for mobile | MISSING |
| comment_editor_* | Same options for comments | MISSING |
| content_font | 20+ font options | MISSING |
| content_font_size | Custom size | MISSING |
| content_line_height | Custom line height | MISSING |
| content_paragraph_spacing | Custom paragraph spacing | MISSING |
| content_word_break | 4 options | MISSING |
| enable_autosave | Yes/No | MISSING |
| auto_dark_mode | Yes/No | MISSING |
| allow_html | Yes/No | MISSING |
| autoinsert_types[] | Image, Audio, Video | MISSING |
| autoinsert_position | Cursor position options | MISSING |
| additional_css | Custom CSS | MISSING |
| additional_mobile_css | Custom mobile CSS | MISSING |
| additional_plugins | Plugin list | MISSING |
| remove_plugins | Plugin removal list | MISSING |

---

## 6. Notification System Comparison

### ASIS Notification Types (8 types)

| Type | Web | Mail | SMS | Push | TOBE Status |
|------|-----|------|-----|------|-------------|
| comment | Yes | Yes | Yes | Yes | PARTIAL |
| comment_comment | Yes | Yes | Yes | Yes | PARTIAL |
| mention | Yes | Yes | Yes | Yes | PARTIAL |
| vote | Yes | Yes | Yes | Yes | MISSING |
| scrap | Yes | Yes | Yes | Yes | MISSING |
| message | Yes | Yes | Yes | Yes | PARTIAL |
| admin_content | Yes | Yes | Yes | Yes | MISSING |
| custom | Yes | Yes | Yes | Yes | MISSING |

### ASIS Notification Settings

```
- display_use (all/none/pc/mobile)
- always_display
- user_config_list
- user_notify_setting
- push_before_sms
- document_read (delete notification when read)
```

---

## 7. System Settings Comparison

### ASIS System Configuration

| Setting | Description | TOBE Status |
|---------|-------------|-------------|
| unregistered_domain_action | 301/302/main/404 | MISSING |
| use_sso | Single sign-on | MISSING |
| sites[] | Multi-domain config | MISSING |

### ASIS Security Settings

| Setting | Description | TOBE Status |
|---------|-------------|-------------|
| mediafilter_whitelist | External media whitelist | MISSING |
| mediafilter_classes | Allowed HTML classes | MISSING |
| robot_user_agents | Bot user agents | MISSING |
| admin_allowed_ip | Admin IP whitelist | MISSING |
| admin_denied_ip | Admin IP blacklist | MISSING |
| autologin_lifetime | Auto-login duration | MISSING |
| autologin_refresh | Security key refresh | MISSING |
| use_session_ssl | SSL session | MISSING |
| use_cookies_ssl | SSL cookies | MISSING |
| check_csrf_token | CSRF protection | DONE |
| use_nofollow | Nofollow links | MISSING |
| use_httponly | HTTP-only cookies | MISSING |
| use_samesite | SameSite attribute | MISSING |
| x_frame_options | X-Frame-Options | MISSING |
| x_content_type_options | X-Content-Type-Options | MISSING |

---

## 8. Public Pages Comparison

### ASIS Public Pages

| Page | Route | TOBE Status | Notes |
|------|-------|-------------|-------|
| Homepage | `/` | DONE | `/home` route |
| Login | `/member/login` | DONE | Multiple routes |
| Register | `/member/signup` | DONE | Multiple routes |
| Board | `/board` | DONE | Dynamic routes |
| Search | Search form | DONE | `/search` route |

### TOBE Additional Public Pages

| Page | Route | Notes |
|------|-------|-------|
| Password Reset | `/reset-password` | New feature |
| Member Profile | `/member/[username]` | New feature |
| Member Settings | `/member/settings` | New feature |
| Messages | `/messages` | New feature |
| New Message | `/messages/new` | New feature |
| Message Detail | `/messages/[id]` | New feature |
| Documents | `/documents` | New feature |
| New Document | `/documents/new` | New feature |
| Edit Document | `/documents/[id]/edit` | New feature |

---

## 9. Missing Features Summary

### High Priority (Core CMS Functionality)

1. **Member Add/Edit Forms**
   - Missing: Homepage, Blog, Birthday, Mailing preferences
   - Missing: Admin description, Status reasons

2. **Board Advanced Settings**
   - Missing: History tracking, Vote configuration
   - Missing: Editor skin selection, Font settings
   - Missing: RSS feed settings

3. **Points System**
   - Missing: Level icons, Point restrictions
   - Missing: 30+ point rules from ASIS

4. **Editor Configuration**
   - Missing: All 25+ editor settings
   - Missing: Font selection, Autosave

5. **Security Settings**
   - Missing: IP whitelists/blacklists
   - Missing: Session/cookie security options
   - Missing: Header security options

### Medium Priority (Extended Features)

1. **Mail/SMS/Push Integration**
   - Missing: Mailer configuration
   - Missing: SMS gateway settings
   - Missing: Push notification setup

2. **Data Importer**
   - Missing: XML import functionality
   - Missing: Member sync

3. **RSS Feed Manager**
   - Missing: Feed configuration
   - Missing: Per-module feed settings

4. **Addon System**
   - Not applicable to Next.js architecture
   - Alternative: Plugin architecture needed

### Low Priority (Maintenance)

1. **Core File Cleanup**
   - Not applicable to Next.js

2. **Server Environment Display**
   - Could be implemented as admin info page

---

## 10. Feature Parity Matrix

### Admin Features

| Category | ASIS Count | TOBE Count | Gap |
|----------|------------|------------|-----|
| Dashboard | 1 | 1 | 0 |
| Member | 5 | 3 | -2 |
| Content | 7 | 6 | -1 |
| Design | 3 | 3 | 0 |
| Points | 1 | 1 | 0 |
| System | 8 | 4 | -4 |
| Modules | 4 | 3 | -1 |
| Utilities | 6 | 5 | -1 |

### Configuration Depth

| Category | ASIS Fields | TOBE Fields | Gap |
|----------|-------------|-------------|-----|
| Member Config | 30+ | ~10 | -20 |
| Board Config | 60+ | ~15 | -45 |
| Editor Config | 25+ | 0 | -25 |
| Security Config | 15+ | ~3 | -12 |
| Point Config | 30+ | ~5 | -25 |

---

## 11. Implementation Recommendations

### Sprint 1: Member Management Enhancement
- Implement full member add/edit forms
- Add missing member fields (homepage, blog, birthday)
- Implement member configuration options
- Add status management (approved/denied/unverified)

### Sprint 2: Board Configuration Enhancement
- Implement advanced board settings
- Add editor configuration options
- Implement permission system per board
- Add RSS feed settings

### Sprint 3: Security Enhancement
- Implement IP whitelist/blacklist
- Add session security options
- Implement cookie security options
- Add security headers configuration

### Sprint 4: Points System Enhancement
- Implement all 30+ point rules
- Add level icons
- Implement point restrictions
- Add group-level integration

### Sprint 5: Notification Enhancement
- Implement all 8 notification types
- Add web/mail/sms/push channels
- Implement notification preferences
- Add mention system

### Sprint 6: Communication Features
- Implement mailer configuration
- Add SMS gateway integration
- Implement push notification system
- Add data importer

---

## Conclusion

TOBE 시스템은 기본적인 CMS 기능을 구현했으나, ASIS Rhymix CMS의 고급 설정 및 세부 기능이 많이 누락되어 있습니다. 특히:

1. **Member Management**: 회원 설정 필드 20+ 누락
2. **Board Configuration**: 45+ 설정 필드 누락
3. **Editor Settings**: 25+ 설정 필드 누락
4. **Security Settings**: 12+ 설정 필드 누락
5. **Points System**: 25+ 포인트 규칙 누락

이러한 격차를 해소하기 위해 단계적인 구현이 필요합니다.
