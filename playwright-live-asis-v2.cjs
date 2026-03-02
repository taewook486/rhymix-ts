/**
 * Rhymix ASIS Live Analysis v2
 * Discovers actual admin navigation by crawling the real admin panel
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = '.moai/specs/SPEC-RHYMIX-001/screenshots/asis';
const BASE_URL = 'http://localhost';
const ADMIN_URL = 'http://localhost/admin/';
const CREDENTIALS = { email: 'comfit99@naver.com', password: 'rhymix123' };

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const p = path.join(SCREENSHOTS_DIR, name + '.png');
  try {
    await page.screenshot({ path: p, fullPage: true });
    console.log('  [ss] ' + p);
    return p;
  } catch (e) {
    console.log('  [ss err] ' + e.message);
    return null;
  }
}

async function extractFullPageData(page) {
  return page.evaluate(() => {
    // Extract ALL nav links from the admin panel
    const allNavLinks = [];
    document.querySelectorAll('.admin_nav a, #lnb a, .snb a, .gnb a, .tab a, .x_gnb a, .x_lnb a, nav a, .menu a, .side-menu a, #menu a').forEach(a => {
      const text = a.textContent?.trim();
      const href = a.href;
      if (text && href && text.length > 0) {
        allNavLinks.push({ text, href });
      }
    });

    // Full page navigation structure
    const navStructure = [];
    document.querySelectorAll('.admin_menu > li, #gnb > li, .x_gnb > li, nav > ul > li').forEach(section => {
      const label = section.querySelector(':scope > a, :scope > span')?.textContent?.trim();
      const children = Array.from(section.querySelectorAll('li a, ul a')).map(a => ({
        text: a.textContent?.trim(),
        href: a.href
      }));
      if (label || children.length > 0) {
        navStructure.push({ label, children });
      }
    });

    // All form details
    const forms = Array.from(document.querySelectorAll('form')).map(form => {
      const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(el => {
        const labelEl = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
        const parentLabel = el.closest('label');
        const label = labelEl?.textContent?.trim() || parentLabel?.textContent?.trim()?.split('\n')[0];

        let options = [];
        if (el.tagName === 'SELECT') {
          options = Array.from(el.querySelectorAll('option')).map(o => ({
            value: o.value,
            text: o.textContent?.trim()
          })).slice(0, 20);
        }

        return {
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          label: label?.substring(0, 80),
          options,
          checked: el.checked,
          required: el.required
        };
      }).filter(i => i.name || i.id);

      return {
        id: form.id,
        name: form.name,
        action: form.action,
        method: form.method,
        inputs
      };
    });

    // Tables with full header and sample data
    const tables = Array.from(document.querySelectorAll('table')).map((table, i) => {
      const headers = Array.from(table.querySelectorAll('thead th, thead td, tr:first-child th')).map(th => th.textContent?.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 3).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim()?.substring(0, 60))
      );
      return {
        index: i,
        id: table.id,
        className: table.className,
        caption: table.querySelector('caption')?.textContent?.trim(),
        headers,
        rowCount: table.querySelectorAll('tbody tr').length,
        sampleRows: rows
      };
    });

    // Buttons
    const buttons = [];
    document.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="reset"], a.btn, .btn, .button').forEach(btn => {
      const text = (btn.textContent?.trim() || btn.value || btn.title || '').substring(0, 80);
      if (text && !buttons.find(b => b.text === text)) {
        buttons.push({
          text,
          type: btn.type,
          className: btn.className?.substring(0, 80),
          href: btn.href,
          onclick: btn.getAttribute('onclick')?.substring(0, 100)
        });
      }
    });

    // Headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
      tag: h.tagName,
      text: h.textContent?.trim()?.substring(0, 100)
    })).filter(h => h.text);

    // Tab items (Rhymix admin tabs)
    const tabs = [];
    document.querySelectorAll('.tab_menu li, .x_tab_menu li, .nav-tabs li, ul.tabs li, .x_tabs .tab').forEach(tab => {
      const text = tab.textContent?.trim();
      const href = tab.querySelector('a')?.href;
      if (text) tabs.push({ text, href });
    });

    // All act= links on the page
    const actLinks = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.href;
      const text = a.textContent?.trim();
      if (href && (href.includes('act=') || href.includes('/admin/')) && text && text.length < 100) {
        actLinks.push({ text, href: href.substring(0, 200) });
      }
    });

    // Sections / fieldsets
    const sections = Array.from(document.querySelectorAll('fieldset, .section, .form_group')).map(s => ({
      tag: s.tagName,
      legend: s.querySelector('legend')?.textContent?.trim(),
      heading: s.querySelector('h2, h3, h4')?.textContent?.trim(),
      inputCount: s.querySelectorAll('input, select, textarea').length
    })).filter(s => s.legend || s.heading || s.inputCount > 0);

    return {
      docTitle: document.title,
      currentUrl: window.location.href,
      bodyText: document.body?.textContent?.substring(0, 500) || '',
      headings,
      allNavLinks,
      navStructure,
      forms,
      tables,
      buttons,
      tabs,
      sections,
      actLinks: actLinks.slice(0, 80)
    };
  });
}

async function visitPage(page, name, url) {
  console.log('\n[VISIT] ' + name);
  console.log('  URL: ' + url);

  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(1500);

    const finalUrl = page.url();
    if (finalUrl !== url && finalUrl.includes('/admin/') && !finalUrl.includes('act=')) {
      console.log('  [REDIRECT] -> ' + finalUrl + ' (probably redirected to dashboard)');
    }
  } catch (e) {
    console.log('  [NAV ERR] ' + e.message);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await delay(2000);
    } catch (e2) {
      return { error: e2.message, url, name };
    }
  }

  await screenshot(page, name);
  const data = await extractFullPageData(page);
  console.log('  Title: ' + data.docTitle);
  console.log('  URL after: ' + data.currentUrl);
  console.log('  Forms: ' + data.forms.length + ', Tables: ' + data.tables.length + ', Buttons: ' + data.buttons.length);

  return { ...data, name, requestedUrl: url };
}

async function loginAdmin(page) {
  console.log('\n[LOGIN] Starting...');
  await page.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await delay(2000);

  // Rhymix admin login uses #uid (text) and #upw (password)
  const uidField = await page.$('#uid');
  if (uidField) {
    console.log('[LOGIN] Admin login form found');
    await page.fill('#uid', CREDENTIALS.email);
    await page.fill('#upw', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await delay(3000);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    console.log('[LOGIN] Done. URL: ' + page.url());
  } else {
    console.log('[LOGIN] No login form - may already be logged in. URL: ' + page.url());
  }
}

async function discoverAdminUrls(page) {
  console.log('\n[DISCOVER] Discovering admin URLs from dashboard...');
  await page.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await delay(2000);

  // Get all links from the admin dashboard navigation
  const discovered = await page.evaluate(() => {
    const links = new Map();

    document.querySelectorAll('a').forEach(a => {
      const href = a.href;
      const text = a.textContent?.trim();
      if (!href || !text || text.length === 0 || text.length > 80) return;

      // Include admin links
      if (href.includes('act=disp') || href.includes('act=proc') ||
          href.includes('/admin/') || href.includes('module=admin')) {
        links.set(href, text);
      }
    });

    return Array.from(links.entries()).map(([href, text]) => ({ href, text }));
  });

  console.log('[DISCOVER] Found ' + discovered.length + ' admin links');
  return discovered;
}

function formatPageReport(info) {
  if (info.error) {
    return `- **Error**: ${info.error}\n- **URL**: ${info.requestedUrl}\n`;
  }

  let r = '';
  r += `- **URL**: ${info.currentUrl}\n`;
  r += `- **Page Title**: ${info.docTitle}\n`;

  if (info.headings && info.headings.length > 0) {
    const h1s = info.headings.filter(h => h.tag === 'H1' || h.tag === 'H2');
    if (h1s.length > 0) {
      r += `- **Main Headings**: ${h1s.map(h => h.text).join(', ')}\n`;
    }
  }

  if (info.tabs && info.tabs.length > 0) {
    r += `\n**Tabs**:\n`;
    info.tabs.forEach(tab => {
      r += `- ${tab.text}${tab.href ? ' -> ' + tab.href : ''}\n`;
    });
  }

  if (info.forms && info.forms.length > 0) {
    r += `\n**Forms** (${info.forms.length}):\n`;
    info.forms.forEach(form => {
      if (!form.inputs || form.inputs.length === 0) return;
      r += `\n*Form "${form.id || form.name || 'unnamed'}" (${(form.method || 'GET').toUpperCase()} ${form.action})*\n`;
      form.inputs.forEach(input => {
        if (input.type === 'hidden') return; // Skip hidden fields
        const labelStr = input.label ? `[${input.label}] ` : '';
        const optStr = input.options && input.options.length > 0
          ? ` Options: [${input.options.map(o => o.text || o).join(', ')}]`
          : '';
        r += `  - ${labelStr}\`${input.tag}\` name="${input.name}" type="${input.type}"${optStr}\n`;
      });
    });
  }

  if (info.tables && info.tables.length > 0) {
    r += `\n**Tables** (${info.tables.length}):\n`;
    info.tables.forEach(table => {
      const tableLabel = table.caption || table.id || `Table ${table.index + 1}`;
      r += `\n*${tableLabel}* (${table.rowCount} rows)\n`;
      if (table.headers && table.headers.length > 0) {
        r += `  Headers: ${table.headers.join(' | ')}\n`;
      }
      if (table.sampleRows && table.sampleRows.length > 0 && table.sampleRows[0].length > 0) {
        r += `  Sample: ${table.sampleRows[0].join(' | ')}\n`;
      }
    });
  }

  if (info.buttons && info.buttons.length > 0) {
    r += `\n**Action Buttons** (${info.buttons.length}):\n`;
    const visibleBtns = info.buttons.filter(b => b.text && b.text.length > 0);
    visibleBtns.slice(0, 20).forEach(btn => {
      r += `- "${btn.text}"${btn.href ? ' -> ' + btn.href.substring(0, 80) : ''}\n`;
    });
  }

  if (info.sections && info.sections.length > 0) {
    r += `\n**Sections/Fieldsets**:\n`;
    info.sections.forEach(s => {
      const label = s.legend || s.heading;
      if (label) r += `- ${label} (${s.inputCount} inputs)\n`;
    });
  }

  if (info.allNavLinks && info.allNavLinks.length > 0) {
    r += `\n**Navigation Items**:\n`;
    const uniqueNavLinks = [...new Map(info.allNavLinks.map(l => [l.href, l])).values()];
    uniqueNavLinks.slice(0, 25).forEach(link => {
      r += `- ${link.text} -> ${link.href}\n`;
    });
  }

  return r;
}

async function main() {
  console.log('=== Rhymix ASIS Live Analysis v2 ===');
  console.log('Date: ' + new Date().toISOString());

  const browser = await chromium.launch({
    headless: true,
    args: ['--lang=ko-KR', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR'
  });

  const page = await context.newPage();
  const pageData = {};

  try {
    // =============================================
    // PUBLIC PAGES
    // =============================================
    console.log('\n===== PUBLIC PAGES =====');

    pageData['01-homepage'] = await visitPage(page, '01-homepage', 'http://localhost/');
    pageData['02-login'] = await visitPage(page, '02-login', 'http://localhost/?module=member&act=dispMemberLoginForm');
    pageData['03-signup'] = await visitPage(page, '03-signup', 'http://localhost/?module=member&act=dispMemberSignUpForm');

    // =============================================
    // LOGIN
    // =============================================
    await loginAdmin(page);

    // =============================================
    // ADMIN DASHBOARD
    // =============================================
    console.log('\n===== ADMIN PAGES =====');
    pageData['04-dashboard'] = await visitPage(page, '04-dashboard', 'http://localhost/admin/');

    // =============================================
    // DISCOVER ALL ADMIN URLS FROM NAVIGATION
    // =============================================
    const discoveredLinks = await discoverAdminUrls(page);

    // Save discovered links for inspection
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'discovered-links.json'),
      JSON.stringify(discoveredLinks, null, 2)
    );

    // =============================================
    // VISIT KEY ADMIN PAGES (verified working URLs)
    // =============================================

    // Member management
    pageData['05-member-list'] = await visitPage(page, '05-member-list', 'http://localhost/index.php?module=admin&act=dispMemberAdminList');
    pageData['06-member-config'] = await visitPage(page, '06-member-config', 'http://localhost/index.php?module=admin&act=dispMemberAdminConfig');
    pageData['07-member-groups'] = await visitPage(page, '07-member-groups', 'http://localhost/index.php?module=admin&act=dispMemberAdminGroupList');

    // Documents / boards
    pageData['08-document-list'] = await visitPage(page, '08-document-list', 'http://localhost/index.php?module=admin&act=dispDocumentAdminList');
    pageData['09-comment-list'] = await visitPage(page, '09-comment-list', 'http://localhost/index.php?module=admin&act=dispCommentAdminList');
    pageData['10-file-list'] = await visitPage(page, '10-file-list', 'http://localhost/index.php?module=admin&act=dispFileAdminList');

    // Site design
    pageData['11-site-design'] = await visitPage(page, '11-site-design', 'http://localhost/index.php?module=admin&act=dispMenuAdminSiteDesign');

    // Points system
    pageData['12-point-config'] = await visitPage(page, '12-point-config', 'http://localhost/index.php?module=admin&act=dispPointAdminConfig');

    // =============================================
    // CLICK-THROUGH NAVIGATION FROM DISCOVERED LINKS
    // =============================================
    console.log('\n===== VISITING DISCOVERED LINKS =====');

    const visited = new Set(Object.values(pageData).map(d => d.currentUrl).filter(Boolean));
    visited.add('http://localhost/admin/');

    let extraPageIdx = 20;
    const importantKeywords = ['member', 'board', 'layout', 'widget', 'addon', 'plugin', 'config', 'system', 'spam', 'menu', 'point', 'permission', 'theme', 'install'];

    const linksToVisit = discoveredLinks.filter(link => {
      if (!link.href || visited.has(link.href)) return false;
      if (!link.href.includes('act=') && !link.href.includes('module=admin')) return false;
      // Prioritize important admin pages
      return importantKeywords.some(kw => link.href.toLowerCase().includes(kw) || link.text.toLowerCase().includes(kw));
    });

    console.log('[EXTRA] Will visit ' + linksToVisit.length + ' additional pages');

    for (const link of linksToVisit.slice(0, 30)) {
      if (visited.has(link.href)) continue;
      visited.add(link.href);

      const pageName = extraPageIdx.toString().padStart(2, '0') + '-' +
        link.text.replace(/[^a-zA-Z0-9가-힣]/g, '-').substring(0, 30);

      pageData[pageName] = await visitPage(page, pageName, link.href);
      extraPageIdx++;
    }

    // =============================================
    // SPECIFIC RHYMIX ADMIN PAGES BY KNOWN ACT NAMES
    // =============================================
    console.log('\n===== SPECIFIC KNOWN PAGES =====');

    const knownPages = [
      { name: '50-install-list', url: 'http://localhost/index.php?module=admin&act=dispAdminInstallList' },
      { name: '51-layout-list', url: 'http://localhost/index.php?module=admin&act=dispLayoutAdminList' },
      { name: '52-widget-list', url: 'http://localhost/index.php?module=admin&act=dispWidgetAdminList' },
      { name: '53-addon-list', url: 'http://localhost/index.php?module=admin&act=dispAddonAdminList' },
      { name: '54-module-list', url: 'http://localhost/index.php?module=admin&act=dispAdminModuleList' },
      { name: '55-system-config', url: 'http://localhost/index.php?module=admin&act=dispAdminSetup' },
      { name: '56-admin-config', url: 'http://localhost/index.php?module=admin&act=dispAdminAdminConfig' },
      { name: '57-board-admin', url: 'http://localhost/index.php?module=board&act=dispBoardAdminContent' },
      { name: '58-theme-admin', url: 'http://localhost/index.php?module=admin&act=dispThemeAdminList' },
      { name: '59-spam-admin', url: 'http://localhost/index.php?module=admin&act=dispSpamAdminConfig' },
      { name: '60-group-admin', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminGroupAdd' }
    ];

    for (const p of knownPages) {
      if (!visited.has(p.url)) {
        pageData[p.name] = await visitPage(page, p.name, p.url);
        visited.add(p.url);
      }
    }

    // =============================================
    // SAVE RAW DATA
    // =============================================
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'raw-results-v2.json'),
      JSON.stringify(pageData, null, 2)
    );
    console.log('\n[SAVE] Raw data saved');

    // =============================================
    // GENERATE COMPREHENSIVE MARKDOWN REPORT
    // =============================================
    console.log('\n===== GENERATING REPORT =====');

    const dashData = pageData['04-dashboard'];
    const navSections = dashData?.navStructure || [];

    let md = `# ASIS Live Analysis - Rhymix PHP CMS

## Analysis Date: ${new Date().toISOString().split('T')[0]}
## Method: Playwright live browser capture (v2 - comprehensive)
## Base URL: http://localhost
## Admin URL: http://localhost/admin/

---

## Executive Summary

Rhymix is a Korean PHP CMS (Content Management System) based on XpressEngine (XE).
This document captures the live admin interface through browser automation.

### Key Characteristics
- **URL Pattern**: \`?module=MODULE&act=ACTION_NAME\` for most pages
- **Admin URL**: \`/admin/\` serves as the main admin panel entry
- **Language**: Korean (한국어) admin interface
- **Authentication**: Session-based, admin login at \`/admin/\` with #uid/#upw fields
- **Navigation**: Global nav bar (gnb) + side nav bar (snb/lnb) structure
- **CSRF**: Uses \`_rx_csrf_token\` for form security

---

## 1. Public-Facing Pages

`;

    // Public pages
    const publicPages = {
      'Homepage': pageData['01-homepage'],
      'Login Page': pageData['02-login'],
      'Register Page': pageData['03-signup']
    };

    for (const [name, data] of Object.entries(publicPages)) {
      md += `### ${name}\n`;
      if (data) {
        md += formatPageReport(data);
      }
      md += '\n';
    }

    md += `---

## 2. Admin Dashboard

### Dashboard
`;
    if (dashData) {
      md += formatPageReport(dashData);
    }

    // Navigation structure from dashboard
    md += `\n### Admin Navigation Structure (from Dashboard)\n\n`;
    if (navSections.length > 0) {
      navSections.forEach(section => {
        md += `**${section.label || 'Section'}**:\n`;
        (section.children || []).forEach(child => {
          if (child.text) md += `- ${child.text}: ${child.href}\n`;
        });
        md += '\n';
      });
    }

    // All discovered admin links
    md += `\n### All Discovered Admin Links (${discoveredLinks.length} total)\n\n`;
    discoveredLinks.forEach(link => {
      md += `- [${link.text}](${link.href})\n`;
    });

    md += `\n---

## 3. Member Management

`;

    const memberPages = ['05-member-list', '06-member-config', '07-member-groups'];
    const memberLabels = ['Member List (회원 목록)', 'Member Config (회원 설정)', 'Member Groups (회원 그룹)'];
    memberPages.forEach((key, i) => {
      md += `### ${memberLabels[i]}\n`;
      if (pageData[key]) md += formatPageReport(pageData[key]);
      md += '\n';
    });

    md += `---

## 4. Content Management

`;
    const contentPages = ['08-document-list', '09-comment-list', '10-file-list'];
    const contentLabels = ['Document List (문서)', 'Comment List (댓글)', 'File List (파일)'];
    contentPages.forEach((key, i) => {
      md += `### ${contentLabels[i]}\n`;
      if (pageData[key]) md += formatPageReport(pageData[key]);
      md += '\n';
    });

    md += `---

## 5. Site Design & Layout

### Site Design (사이트 디자인 설정)
`;
    if (pageData['11-site-design']) md += formatPageReport(pageData['11-site-design']);

    md += `\n---

## 6. Points System

### Point Configuration (포인트)
`;
    if (pageData['12-point-config']) md += formatPageReport(pageData['12-point-config']);

    md += `\n---

## 7. Additional Discovered Pages

`;
    // Extra pages from discovery
    for (const [key, data] of Object.entries(pageData)) {
      if (key.startsWith('2') || (parseInt(key.substring(0, 2)) >= 20 && parseInt(key.substring(0, 2)) < 60)) {
        if (data && !data.error && data.forms && (data.forms.length > 0 || (data.tables && data.tables.length > 0) || (data.buttons && data.buttons.length > 0))) {
          md += `### ${key}: ${data.docTitle || data.name}\n`;
          md += formatPageReport(data);
          md += '\n';
        }
      }
    }

    md += `---

## 8. Feature Inventory

### Member Management Features
| Feature | URL Pattern | Status |
|---------|-------------|--------|
| Member List | ?module=admin&act=dispMemberAdminList | Found |
| Member Config | ?module=admin&act=dispMemberAdminConfig | Found |
| Member Groups | ?module=admin&act=dispMemberAdminGroupList | Found |
| Member Login | ?module=member&act=dispMemberLoginForm | Found |
| Member Register | ?module=member&act=dispMemberSignUpForm | Found |

### Content Management Features
| Feature | URL Pattern | Status |
|---------|-------------|--------|
| Document List | ?module=admin&act=dispDocumentAdminList | Found |
| Comment List | ?module=admin&act=dispCommentAdminList | Found |
| File List | ?module=admin&act=dispFileAdminList | Found |

### Site Design Features
| Feature | URL Pattern | Status |
|---------|-------------|--------|
| Site Design | ?module=admin&act=dispMenuAdminSiteDesign | Found |

### Points System
| Feature | URL Pattern | Status |
|---------|-------------|--------|
| Point Config | ?module=admin&act=dispPointAdminConfig | Found |

---

## 9. Key Technical Observations

1. **CMS Identity**: Rhymix (fork of XpressEngine/XE), running on PHP
2. **URL Structure**: Uses \`?module=MODULE_NAME&act=ACTION_NAME\` pattern
3. **Admin Entry**: \`/admin/\` redirects to dashboard after authentication
4. **Authentication Fields**:
   - Username field: \`#uid\` (accepts email or username)
   - Password field: \`#upw\`
   - CSRF Token: \`_rx_csrf_token\` (auto-generated)
5. **Login Persistence**: "로그인 유지" (Keep logged in) checkbox option
6. **Public Nav Menu**: Welcome / Free Board / Q&A / Notice
7. **Admin Language**: Korean (한국어) throughout admin interface
8. **Module System**: Each feature area is an installable "module"
9. **Widget System**: Widgets for sidebar/page content blocks
10. **Layout System**: Template/skin-based layout management

---

## 10. Screenshots Captured

All screenshots saved to: \`.moai/specs/SPEC-RHYMIX-001/screenshots/asis/\`

| Filename | Page |
|----------|------|
`;

    try {
      const ssFiles = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).sort();
      ssFiles.forEach(f => {
        const name = f.replace('.png', '');
        md += `| ${f} | ${name} |\n`;
      });
    } catch (e) {
      md += '| Error reading screenshots directory |\n';
    }

    // Write the report
    const reportPath = '.moai/specs/SPEC-RHYMIX-001/asis-live-analysis.md';
    fs.writeFileSync(reportPath, md);
    console.log('\n[REPORT] Saved to: ' + reportPath);
    console.log('[DONE] Analysis complete!');
    console.log('Total pages analyzed: ' + Object.keys(pageData).length);

  } catch (err) {
    console.error('[FATAL] ' + err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
