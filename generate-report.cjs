/**
 * Generate comprehensive ASIS analysis report
 */
const fs = require('fs');

const v2 = JSON.parse(fs.readFileSync('.moai/specs/SPEC-RHYMIX-001/screenshots/asis/raw-results-v2.json', 'utf8'));
const v3 = JSON.parse(fs.readFileSync('.moai/specs/SPEC-RHYMIX-001/screenshots/asis/raw-results-v3.json', 'utf8'));
const links = JSON.parse(fs.readFileSync('.moai/specs/SPEC-RHYMIX-001/screenshots/asis/discovered-links.json', 'utf8'));

// Merge all page data
const all = Object.assign({}, v2, v3);

function nonHidden(inputs) {
  return inputs ? inputs.filter(function(i) { return i.type !== 'hidden'; }) : [];
}

function formatInputs(inputs) {
  if (!inputs || inputs.length === 0) return '';
  var lines = [];
  inputs.forEach(function(input) {
    if (input.type === 'hidden') return;
    var label = input.label ? '[' + input.label + '] ' : '';
    var opts = '';
    if (input.options && input.options.length > 0) {
      opts = ' | Options: ' + input.options.map(function(o) { return typeof o === 'string' ? o : (o.text || o.value); }).join(', ');
    }
    var placeholder = input.placeholder ? ' placeholder="' + input.placeholder + '"' : '';
    lines.push('  - ' + label + '`' + input.tag + '` name="' + input.name + '" type="' + input.type + '"' + placeholder + opts);
  });
  return lines.join('\n');
}

function renderPage(label, data) {
  if (!data || data.error) {
    return '### ' + label + '\n- Error or not available\n\n';
  }

  var md = '### ' + label + '\n';
  md += '- **URL**: `' + data.currentUrl + '`\n';
  md += '- **Title**: ' + data.docTitle + '\n';

  if (data.headings && data.headings.length > 0) {
    var mainHeadings = data.headings.filter(function(h) { return h.tag === 'H2' || h.tag === 'H3'; }).slice(0, 5);
    if (mainHeadings.length > 0) {
      md += '- **Section Headings**: ' + mainHeadings.map(function(h) { return h.text; }).join(' / ') + '\n';
    }
  }

  if (data.tabs && data.tabs.length > 0) {
    md += '\n**Tabs**:\n';
    data.tabs.forEach(function(tab) {
      md += '- ' + tab.text + '\n';
    });
  }

  if (data.forms && data.forms.length > 0) {
    var formCount = data.forms.filter(function(f) { return nonHidden(f.inputs).length > 0; }).length;
    if (formCount > 0) {
      md += '\n**Forms** (' + formCount + '):\n';
      data.forms.forEach(function(form) {
        var visibleInputs = nonHidden(form.inputs);
        if (visibleInputs.length === 0) return;
        var formLabel = form.id || form.name || 'Form';
        md += '\n*' + formLabel + '* (action: `' + (form.action || '').substring(0, 100) + '`)\n';
        md += formatInputs(visibleInputs) + '\n';
      });
    }
  }

  if (data.tables && data.tables.length > 0) {
    md += '\n**Tables** (' + data.tables.length + '):\n';
    data.tables.forEach(function(table) {
      var label = table.caption || table.id || 'Table ' + (table.index + 1);
      md += '\n*' + label + '* (' + table.rowCount + ' rows)\n';
      if (table.headers && table.headers.length > 0) {
        md += '  Columns: ' + table.headers.join(' | ') + '\n';
      }
      if (table.sampleRows && table.sampleRows.length > 0 && table.sampleRows[0].length > 0) {
        md += '  Sample: ' + table.sampleRows[0].join(' | ') + '\n';
      }
    });
  }

  if (data.buttons && data.buttons.length > 0) {
    md += '\n**Buttons**: ' + data.buttons.slice(0, 15).join(', ') + '\n';
  }

  if (data.sections && data.sections.length > 0) {
    var namedSections = data.sections.filter(function(s) { return s.legend && s.legend.length > 0; });
    if (namedSections.length > 0) {
      md += '\n**Form Sections**: ' + namedSections.map(function(s) { return s.legend + ' (' + s.inputCount + ' fields)'; }).join(', ') + '\n';
    }
  }

  md += '\n';
  return md;
}

var md = '# ASIS Live Analysis - Rhymix PHP CMS\n\n';
md += '## Analysis Date: ' + new Date().toISOString().split('T')[0] + '\n';
md += '## Method: Playwright live browser capture\n';
md += '## Base URL: http://localhost\n';
md += '## Admin URL: http://localhost/admin/\n\n';
md += '---\n\n';

md += '## Executive Summary\n\n';
md += 'Rhymix is a Korean PHP Content Management System (CMS), forked from XpressEngine (XE). ';
md += 'This document captures the live admin interface through Playwright browser automation, ';
md += 'documenting all accessible features, forms, navigation, and data structures.\n\n';

md += '### System Overview\n\n';
md += '| Property | Value |\n';
md += '|----------|-------|\n';
md += '| CMS | Rhymix (XpressEngine fork) |\n';
md += '| Language | PHP |\n';
md += '| Admin Language | Korean (한국어) |\n';
md += '| URL Pattern | `?module=MODULE&act=ACTION` |\n';
md += '| Admin Entry | `/admin/` (session-based auth) |\n';
md += '| Auth Method | Username/Email + Password |\n';
md += '| CSRF | `_rx_csrf_token` in all forms |\n';
md += '| Login Keep | "로그인 유지" checkbox option |\n';
md += '\n---\n\n';

// =============================================
// ADMIN NAVIGATION MAP
// =============================================
md += '## 1. Admin Navigation Structure\n\n';
md += 'The following navigation links were discovered from the admin dashboard:\n\n';
md += '| Korean Name | English Translation | URL |\n';
md += '|------------|--------------------|---------|\n';
md += '| 대시보드 | Dashboard | `?module=admin` |\n';
md += '| 사이트 메뉴 편집 | Site Menu Editor | `?module=admin&act=dispMenuAdminSiteMap` |\n';
md += '| 사이트 디자인 설정 | Site Design Settings | `?module=admin&act=dispMenuAdminSiteDesign` |\n';
md += '| 회원 설정 | Member Settings | `?module=admin&act=dispMemberAdminConfig` |\n';
md += '| 회원 그룹 | Member Groups | `?module=admin&act=dispMemberAdminGroupList` |\n';
md += '| 포인트 | Points System | `?module=admin&act=dispPointAdminConfig` |\n';
md += '| 게시판 | Boards (BBS) | `?module=admin&act=dispBoardAdminContent` |\n';
md += '| 페이지 | Pages | `?module=admin&act=dispPageAdminContent` |\n';
md += '| 문서 (더보기) | Documents | `?module=admin&act=dispDocumentAdminList` |\n';
md += '| 댓글 (더보기) | Comments | `?module=admin&act=dispCommentAdminList` |\n';
md += '| 파일 | Files | `?module=admin&act=dispFileAdminList` |\n';
md += '| 설문 | Polls/Surveys | `?module=admin&act=dispPollAdminList` |\n';
md += '| 에디터 | Editor Settings | `?module=admin&act=dispEditorAdminIndex` |\n';
md += '| 스팸필터 | Spam Filter | `?module=admin&act=dispSpamfilterAdminDeniedIPList` |\n';
md += '| 휴지통 | Trash | `?module=admin&act=dispTrashAdminList` |\n';
md += '| 메일, SMS 및 푸시 알림 관리 | Mail/SMS/Push Notifications | `?module=admin&act=dispAdvanced_mailerAdminConfig` |\n';
md += '| 알림 센터 | Notification Center | `?module=admin&act=dispNcenterliteAdminConfig` |\n';
md += '| 시스템 설정 | System Settings | `?module=admin&act=dispAdminConfigGeneral` |\n';
md += '| 관리자 화면 설정 | Admin UI Settings | `?module=admin&act=dispAdminSetup` |\n';
md += '| 파일박스 | File Box | `?module=admin&act=dispModuleAdminFileBox` |\n';
md += '| 쉬운 설치 | Easy Install | `?module=admin&act=dispAutoinstallAdminIndex` |\n';
md += '| 설치된 레이아웃 | Installed Layouts | `?module=admin&act=dispLayoutAdminInstalledList` |\n';
md += '| 설치된 모듈 | Installed Modules | `?module=admin&act=dispModuleAdminContent` |\n';
md += '| 설치된 애드온 | Installed Addons | `?module=admin&act=dispAddonAdminIndex` |\n';
md += '| 설치된 위젯 | Installed Widgets | `?module=admin&act=dispWidgetAdminDownloadedList` |\n';
md += '| 다국어 | Multi-language | `?module=admin&act=dispModuleAdminLangcode` |\n';
md += '| 데이터 들여오기 | Data Importer | `?module=admin&act=dispImporterAdminImportForm` |\n';
md += '| RSS | RSS Feed Management | `?module=admin&act=dispRssAdminIndex` |\n';
md += '| 코어 파일 정리 | Core File Cleanup | `?module=admin&act=dispAdminCleanupList` |\n';
md += '| 서버 환경 표시 | Server Environment | `?module=admin&act=dispAdminViewServerEnv` |\n';
md += '\n---\n\n';

// =============================================
// PUBLIC PAGES
// =============================================
md += '## 2. Public-Facing Pages\n\n';

md += renderPage('Homepage (http://localhost/)', all['01-homepage']);

md += '**Public Navigation Menu** (from homepage):\n';
md += '- Welcome -> `/index`\n';
md += '- Free Board -> `/board`\n';
md += '- Q&A -> `/qna`\n';
md += '- Notice -> `/notice`\n\n';

md += renderPage('Login Page (로그인)', all['02-login']);

md += '**Login Form Details**:\n';
md += '- Form action: `procMemberLogin`\n';
md += '- Username field: `input[name="user_id"]` with placeholder "아이디"\n';
md += '- Password field: `input[name="password"]` with placeholder "비밀번호"\n';
md += '- Keep login: checkbox `name="keep_signed"` (로그인 유지)\n';
md += '- CSRF: `_rx_csrf_token` hidden field\n\n';

md += renderPage('Register Page (회원가입)', all['03-signup']);

md += '---\n\n';

// =============================================
// ADMIN DASHBOARD
// =============================================
md += '## 3. Admin Dashboard\n\n';
md += renderPage('Dashboard', all['04-dashboard']);

md += '**Admin Login Form**:\n';
md += '- Username: `#uid` (accepts email address)\n';
md += '- Password: `#upw`\n';
md += '- Submit: `button[type="submit"]`\n\n';

md += '---\n\n';

// =============================================
// MEMBER MANAGEMENT
// =============================================
md += '## 4. Member Management (회원 관리)\n\n';

md += renderPage('Member List (회원 목록)', all['05-member-list']);
md += renderPage('Member Config (회원 설정)', all['06-member-config']);
md += renderPage('Member Groups (회원 그룹)', all['07-member-groups']);
md += renderPage('Member Add Form (회원 추가)', all['81-member-insert']);
md += renderPage('Member Info/Edit (회원정보 조회/수정)', all['31-admin']);

md += '---\n\n';

// =============================================
// SITE DESIGN
// =============================================
md += '## 5. Site Design & Navigation (사이트 디자인)\n\n';

md += renderPage('Site Menu Editor (사이트 메뉴 편집)', all['21-사이트-메뉴-편집']);
md += renderPage('Site Design Settings (사이트 디자인 설정)', all['11-site-design']);
md += renderPage('Installed Layouts (설치된 레이아웃)', all['28-설치된-레이아웃']);

md += '---\n\n';

// =============================================
// BOARD/BBS MANAGEMENT
// =============================================
md += '## 6. Board/BBS Management (게시판 관리)\n\n';

md += renderPage('Board Admin (게시판)', all['22-게시판']);

md += '---\n\n';

// =============================================
// CONTENT MANAGEMENT
// =============================================
md += '## 7. Content Management (콘텐츠 관리)\n\n';

md += renderPage('Document List (문서)', all['08-document-list']);
md += renderPage('Comment List (댓글)', all['09-comment-list']);
md += renderPage('File List (파일)', all['10-file-list']);
md += renderPage('Page Admin (페이지)', all['70-page-admin']);
md += renderPage('Poll Admin (설문)', all['71-poll-admin']);
md += renderPage('Trash (휴지통)', all['73-trash-admin']);

md += '---\n\n';

// =============================================
// POINTS SYSTEM
// =============================================
md += '## 8. Points System (포인트)\n\n';

md += renderPage('Point Configuration (포인트)', all['12-point-config']);

md += '---\n\n';

// =============================================
// SPAM FILTER
// =============================================
md += '## 9. Spam Filter (스팸필터)\n\n';

md += renderPage('Spam Filter (스팸필터)', all['23-스팸필터']);

md += '---\n\n';

// =============================================
// EDITOR SETTINGS
// =============================================
md += '## 10. Editor Settings (에디터)\n\n';

md += renderPage('Editor Admin (에디터)', all['72-editor-admin']);

md += '---\n\n';

// =============================================
// NOTIFICATIONS & MESSAGING
// =============================================
md += '## 11. Notifications & Messaging\n\n';

md += renderPage('Mail/SMS/Push Management (메일, SMS 및 푸시 알림 관리)', all['24-메일--SMS-및-푸시-알림-관리']);
md += renderPage('Notification Center (알림 센터)', all['25-알림-센터']);

md += '---\n\n';

// =============================================
// SYSTEM SETTINGS
// =============================================
md += '## 12. System Settings (시스템 설정)\n\n';

md += renderPage('System General Settings (시스템 설정)', all['26-시스템-설정']);
md += renderPage('Admin UI Settings (관리자 화면 설정)', all['55-system-config']);
md += renderPage('System Security (보안 설정)', all['89-system-security']);

md += '---\n\n';

// =============================================
// MODULES, ADDONS, WIDGETS
// =============================================
md += '## 13. Modules, Addons & Widgets\n\n';

md += renderPage('Installed Modules (설치된 모듈)', all['75-module-admin']);
md += renderPage('Installed Addons (설치된 애드온)', all['29-설치된-애드온']);
md += renderPage('Installed Widgets (설치된 위젯)', all['30-설치된-위젯']);
md += renderPage('Easy Install (쉬운 설치)', all['27-쉬운-설치']);
md += renderPage('File Box (파일박스)', all['74-filebox-admin']);

md += '---\n\n';

// =============================================
// TOOLS & UTILITIES
// =============================================
md += '## 14. Tools & Utilities\n\n';

md += renderPage('Multi-language (다국어)', all['76-lang-admin']);
md += renderPage('Data Importer (데이터 들여오기)', all['77-importer']);
md += renderPage('RSS Feed Manager (RSS)', all['78-rss-admin']);

md += '---\n\n';

// =============================================
// FEATURE INVENTORY
// =============================================
md += '## 15. Complete Feature Inventory\n\n';

md += '### Member Management\n';
md += '| Feature | URL Pattern | Description |\n';
md += '|---------|-------------|-------------|\n';
md += '| Member List | `act=dispMemberAdminList` | Browse/search all members with filters |\n';
md += '| Member Add | `act=dispMemberAdminInsert` | Add new member with custom fields |\n';
md += '| Member Edit | `act=dispMemberAdminInsert&member_srl=N` | Edit existing member info |\n';
md += '| Member Config | `act=dispMemberAdminConfig` | Global member system settings |\n';
md += '| Member Groups | `act=dispMemberAdminGroupList` | Group management with permissions |\n';
md += '\n';

md += '### Content Management\n';
md += '| Feature | URL Pattern | Description |\n';
md += '|---------|-------------|-------------|\n';
md += '| Board Admin | `act=dispBoardAdminContent` | Create and configure BBS boards |\n';
md += '| Document List | `act=dispDocumentAdminList` | Browse/manage all posts |\n';
md += '| Comment List | `act=dispCommentAdminList` | Browse/manage all comments |\n';
md += '| File List | `act=dispFileAdminList` | Manage all uploaded files |\n';
md += '| Page Admin | `act=dispPageAdminContent` | Static page management |\n';
md += '| Poll/Survey | `act=dispPollAdminList` | Survey/poll management |\n';
md += '| Trash | `act=dispTrashAdminList` | Deleted content recovery |\n';
md += '\n';

md += '### Site Design\n';
md += '| Feature | URL Pattern | Description |\n';
md += '|---------|-------------|-------------|\n';
md += '| Site Menu Editor | `act=dispMenuAdminSiteMap` | Drag-and-drop site navigation editor |\n';
md += '| Site Design Settings | `act=dispMenuAdminSiteDesign` | Layout and design per page/menu |\n';
md += '| Layout List | `act=dispLayoutAdminInstalledList` | Installed layout templates |\n';
md += '\n';

md += '### Points System\n';
md += '| Feature | URL Pattern | Description |\n';
md += '|---------|-------------|-------------|\n';
md += '| Point Config | `act=dispPointAdminConfig` | Point award rules for content actions |\n';
md += '\n';

md += '### System & Administration\n';
md += '| Feature | URL Pattern | Description |\n';
md += '|---------|-------------|-------------|\n';
md += '| System Settings | `act=dispAdminConfigGeneral` | Core system configuration |\n';
md += '| Admin UI Settings | `act=dispAdminSetup` | Admin panel appearance |\n';
md += '| Easy Install | `act=dispAutoinstallAdminIndex` | One-click module/theme install |\n';
md += '| Module Manager | `act=dispModuleAdminContent` | Installed module management |\n';
md += '| Addon Manager | `act=dispAddonAdminIndex` | Addon management |\n';
md += '| Widget Manager | `act=dispWidgetAdminDownloadedList` | Widget management |\n';
md += '| Spam Filter | `act=dispSpamfilterAdminDeniedIPList` | IP/keyword blacklist |\n';
md += '| Mail/SMS/Push | `act=dispAdvanced_mailerAdminConfig` | Notification delivery settings |\n';
md += '| Notification Center | `act=dispNcenterliteAdminConfig` | In-site notification settings |\n';
md += '| Editor Settings | `act=dispEditorAdminIndex` | WYSIWYG editor configuration |\n';
md += '| Multi-language | `act=dispModuleAdminLangcode` | Internationalization settings |\n';
md += '| Data Importer | `act=dispImporterAdminImportForm` | Import data from other CMS |\n';
md += '| RSS Feed | `act=dispRssAdminIndex` | RSS feed configuration |\n';
md += '| File Box | `act=dispModuleAdminFileBox` | Server-side file management |\n';
md += '\n---\n\n';

// =============================================
// TECHNICAL ARCHITECTURE
// =============================================
md += '## 16. Technical Architecture Analysis\n\n';

md += '### URL Routing System\n\n';
md += '```\n';
md += 'Format: /index.php?module=MODULE_NAME&act=ACTION_NAME[&param=value]\n';
md += 'Short URL: /?module=MODULE&act=ACTION\n';
md += 'Mid URL: /MID_NAME/ (for page-specific modules)\n\n';
md += 'Action naming convention:\n';
md += '  disp = Display (GET, renders page)\n';
md += '  proc = Process (POST, handles form submission)\n';
md += '  ajax = AJAX endpoint\n\n';
md += 'Admin actions: disp[ModuleName]Admin[Action]\n';
md += '  e.g., dispMemberAdminList = Display Member Admin List\n';
md += '        procMemberAdminDelete = Process Member Admin Delete\n';
md += '```\n\n';

md += '### Module System\n\n';
md += '| Module | Purpose |\n';
md += '|--------|--------|\n';
md += '| member | User account management |\n';
md += '| board | BBS/forum boards |\n';
md += '| document | Generic document storage |\n';
md += '| comment | Comment system |\n';
md += '| file | File upload management |\n';
md += '| layout | Page layout/template system |\n';
md += '| widget | UI widget components |\n';
md += '| menu | Site navigation |\n';
md += '| point | User point/reward system |\n';
md += '| poll | Survey/poll system |\n';
md += '| editor | WYSIWYG editor |\n';
md += '| addon | Plugin/addon system |\n';
md += '| spamfilter | Anti-spam |\n';
md += '| admin | Admin panel core |\n';
md += '| advanced_mailer | Email/SMS/push delivery |\n';
md += '| ncenterlite | In-site notifications |\n';
md += '| trash | Deleted content management |\n';
md += '| rss | RSS feed generation |\n';
md += '| importer | Data import tools |\n';
md += '\n';

md += '### Form Submission Pattern\n\n';
md += '```\n';
md += 'Standard Form Fields:\n';
md += '  - act: action name (proc...) \n';
md += '  - mid: module instance ID\n';
md += '  - module: module name\n';
md += '  - _rx_csrf_token: CSRF protection\n';
md += '  - xe_validator_id: client-side validation ruleset\n';
md += '  - error_return_url: redirect on error\n';
md += '  - success_return_url: redirect on success\n';
md += '```\n\n';

md += '### Authentication System\n\n';
md += '```\n';
md += 'Public login form:\n';
md += '  - user_id: text input (email or username)\n';
md += '  - password: password input\n';
md += '  - keep_signed: checkbox (Y/N) - session persistence\n';
md += '  - Action: procMemberLogin\n\n';
md += 'Admin login form (at /admin/):\n';
md += '  - #uid: text input\n';
md += '  - #upw: password input\n';
md += '  - button[type="submit"]\n';
md += '```\n\n';

md += '### Registration System\n\n';
md += '```\n';
md += 'Register page (/member/signup):\n';
md += '  - Multiple step/tab registration\n';
md += '  - Customizable required fields\n';
md += '  - Email verification\n';
md += '  - Terms of service agreement\n';
md += '  - CAPTCHA support (optional)\n';
md += '```\n\n';

md += '---\n\n';

// =============================================
// SCREENSHOTS INDEX
// =============================================
md += '## 17. Screenshots Captured\n\n';
md += 'All screenshots saved to: `.moai/specs/SPEC-RHYMIX-001/screenshots/asis/`\n\n';
md += '| Filename | Page / Description |\n';
md += '|----------|--------------------|\n';

const screenshotDir = '.moai/specs/SPEC-RHYMIX-001/screenshots/asis';
try {
  const files = fs.readdirSync(screenshotDir)
    .filter(function(f) { return f.endsWith('.png'); })
    .sort();

  const descriptions = {
    '00-after-login.png': 'Admin panel after login',
    '01-homepage.png': 'Homepage (공개 메인 페이지)',
    '02-login.png': 'Member Login Page (로그인)',
    '03-signup.png': 'Member Registration (회원가입)',
    '04-dashboard.png': 'Admin Dashboard',
    '05-member-list.png': 'Member List Admin (회원 목록)',
    '06-member-config.png': 'Member Settings (회원 설정)',
    '07-member-groups.png': 'Member Groups (회원 그룹)',
    '08-document-list.png': 'Document Management (문서)',
    '09-comment-list.png': 'Comment Management (댓글)',
    '10-file-list.png': 'File Management (파일)',
    '11-site-design.png': 'Site Design Settings (사이트 디자인 설정)',
    '12-point-config.png': 'Points System Config (포인트)',
    '21-사이트-메뉴-편집.png': 'Site Menu Editor (사이트 메뉴 편집)',
    '22-게시판.png': 'Board Management (게시판)',
    '23-스팸필터.png': 'Spam Filter (스팸필터)',
    '24-메일--SMS-및-푸시-알림-관리.png': 'Mail/SMS/Push Management',
    '25-알림-센터.png': 'Notification Center (알림 센터)',
    '26-시스템-설정.png': 'System Settings (시스템 설정)',
    '27-쉬운-설치.png': 'Easy Install (쉬운 설치)',
    '28-설치된-레이아웃.png': 'Installed Layouts',
    '29-설치된-애드온.png': 'Installed Addons',
    '30-설치된-위젯.png': 'Installed Widgets',
    '31-admin.png': 'Member Edit Form',
    '55-system-config.png': 'Admin UI Settings',
    '70-page-admin.png': 'Page Management (페이지)',
    '71-poll-admin.png': 'Poll/Survey Admin (설문)',
    '72-editor-admin.png': 'Editor Settings (에디터)',
    '73-trash-admin.png': 'Trash Management (휴지통)',
    '74-filebox-admin.png': 'File Box (파일박스)',
    '75-module-admin.png': 'Module Manager (설치된 모듈)',
    '76-lang-admin.png': 'Multi-language (다국어)',
    '77-importer.png': 'Data Importer (데이터 들여오기)',
    '78-rss-admin.png': 'RSS Feed Manager (RSS)',
    '80-server-env.png': 'Server Environment Info',
    '81-member-insert.png': 'Add New Member Form',
    '85-ncenter-config.png': 'Notification Center Config',
    '86-mailer-config.png': 'Mailer Configuration',
    '89-system-security.png': 'Security Settings'
  };

  files.forEach(function(f) {
    var desc = descriptions[f] || f.replace('.png', '');
    md += '| ' + f + ' | ' + desc + ' |\n';
  });
} catch (e) {
  md += '| Error reading directory: ' + e.message + ' |\n';
}

md += '\n---\n\n';
md += '*Analysis generated by Playwright live browser capture. All data captured from live Rhymix CMS instance at http://localhost/*\n';

fs.writeFileSync('.moai/specs/SPEC-RHYMIX-001/asis-live-analysis.md', md);
console.log('Report written to .moai/specs/SPEC-RHYMIX-001/asis-live-analysis.md');
console.log('Report length: ' + md.length + ' chars');
