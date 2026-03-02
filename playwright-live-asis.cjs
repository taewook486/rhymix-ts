const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = '.moai/specs/SPEC-RHYMIX-001/screenshots/asis';
const BASE_URL = 'http://localhost';
const ADMIN_URL = 'http://localhost/admin/';
const CREDENTIALS = {
  email: 'comfit99@naver.com',
  password: 'rhymix123'
};

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOTS_DIR, name + '.png');
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('  [screenshot] ' + screenshotPath);
    return screenshotPath;
  } catch (e) {
    console.log('  [screenshot error] ' + e.message);
    return null;
  }
}

async function extractPageInfo(page) {
  return page.evaluate(() => {
    // Navigation items (side nav bars, tabs, menus)
    const navItems = [];
    document.querySelectorAll('.snb li a, .x_snb li a, .side_nav a, .nav-tabs a, .tab a, #lnb a').forEach(a => {
      navItems.push({ text: a.textContent?.trim(), href: a.href, id: a.id });
    });

    // Main navigation (top menus)
    const mainNavItems = [];
    document.querySelectorAll('#gnb a, .gnb a, .main-nav a, .admin-nav a, #admin-nav a, .x_gnb a').forEach(a => {
      mainNavItems.push({ text: a.textContent?.trim(), href: a.href });
    });

    // Page title / headings
    const titles = [];
    document.querySelectorAll('h1, h2.page_title, .page_title, .x_page_title, .admin_title, .content_title').forEach(h => {
      titles.push({ tag: h.tagName, text: h.textContent?.trim().substring(0, 100) });
    });

    // All forms
    const forms = Array.from(document.querySelectorAll('form')).map(form => {
      const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(el => {
        const label = document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim();
        return {
          tag: el.tagName.toLowerCase(),
          type: el.type || el.tagName.toLowerCase(),
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          label: label,
          value: (el.type === 'password' ? '[password]' : (el.value?.substring(0, 50) || '')),
          options: el.tagName === 'SELECT' ? Array.from(el.querySelectorAll('option')).map(o => o.textContent?.trim()).slice(0, 15) : undefined
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

    // Tables
    const tables = Array.from(document.querySelectorAll('table')).map((table, i) => ({
      index: i,
      id: table.id,
      className: table.className?.substring(0, 50),
      caption: table.querySelector('caption')?.textContent?.trim(),
      headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim()),
      rowCount: table.querySelectorAll('tbody tr').length,
      sampleRow: Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td => td.textContent?.trim().substring(0, 50))
    }));

    // Buttons
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, .btn')).map(btn => ({
      text: (btn.textContent?.trim() || btn.value || '').substring(0, 80),
      type: btn.type,
      className: btn.className?.substring(0, 50),
      href: btn.href
    })).filter(b => b.text);

    // Tab structure
    const tabs = [];
    document.querySelectorAll('.x_tabs .tab, .tabs .tab, ul.tabs li, .tab_menu li, .nav-tabs li, .x_tab_menu li').forEach(tab => {
      tabs.push(tab.textContent?.trim());
    });

    // Links (to discover sub-pages)
    const adminLinks = [];
    document.querySelectorAll('a[href*="act="], a[href*="/admin/"], a[href*="module="]').forEach(a => {
      const text = a.textContent?.trim();
      const href = a.href;
      if (text && href && text.length < 60) {
        adminLinks.push({ text, href });
      }
    });

    // Content sections
    const sections = Array.from(document.querySelectorAll('.x_content_wrap, .content_wrap, .admin_content, .x_admin_content, fieldset, .form_group, .form-group')).map(s => ({
      tag: s.tagName,
      className: s.className?.substring(0, 50),
      heading: s.querySelector('legend, h2, h3, h4')?.textContent?.trim(),
      inputCount: s.querySelectorAll('input, select, textarea').length
    }));

    const docTitle = document.title;
    const currentUrl = window.location.href;

    return {
      docTitle,
      currentUrl,
      titles,
      navItems,
      mainNavItems,
      forms,
      tables,
      buttons,
      tabs,
      sections,
      adminLinks: adminLinks.slice(0, 50)
    };
  });
}

async function loginToAdmin(page) {
  console.log('\n[LOGIN] Navigating to admin URL...');
  await page.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await delay(2000);

  const currentUrl = page.url();
  console.log('[LOGIN] Current URL after navigate:', currentUrl);

  // Check if we're on a login page
  const loginForm = await page.$('#uid, #user_id, input[name="user_id"], input[name="email_address"]');
  if (loginForm) {
    console.log('[LOGIN] Login form found, logging in...');
    // Try multiple selectors for user ID
    const uidField = await page.$('#uid') || await page.$('#user_id') || await page.$('input[name="user_id"]');
    const pwdField = await page.$('#upw') || await page.$('#password') || await page.$('input[name="password"]');

    if (uidField) {
      await uidField.fill(CREDENTIALS.email);
    }
    if (pwdField) {
      await pwdField.fill(CREDENTIALS.password);
    }

    const submitBtn = await page.$('button[type="submit"], input[type="submit"], .btn_submit');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await delay(3000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    console.log('[LOGIN] After submit URL:', page.url());
    await takeScreenshot(page, '00-after-login');
    return true;
  }

  // Maybe we were redirected to admin directly
  const isAdmin = currentUrl.includes('/admin') || currentUrl.includes('module=admin');
  if (isAdmin) {
    console.log('[LOGIN] Already on admin page (no login needed)');
    return true;
  }

  // Try the login page directly
  console.log('[LOGIN] Trying login page...');
  await page.goto(`${BASE_URL}/?module=member&act=procMemberLogin`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await delay(1000);

  const loginPage = await page.goto(`${BASE_URL}/?module=member&act=dispMemberLoginForm`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await delay(1000);

  const uidField2 = await page.$('#uid, #user_id, input[name="user_id"], input[name="email_address"]');
  if (uidField2) {
    await uidField2.fill(CREDENTIALS.email);
    const pwdField2 = await page.$('#upw, #password, input[name="password"]');
    if (pwdField2) await pwdField2.fill(CREDENTIALS.password);
    await page.keyboard.press('Enter');
    await delay(3000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Now navigate to admin
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);
    console.log('[LOGIN] Admin URL after login:', page.url());
  }

  return true;
}

async function analyzePage(page, name, url, waitFor) {
  console.log(`\n[PAGE] Analyzing: ${name}`);
  console.log(`[PAGE] URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {});
    }
  } catch (e) {
    console.log(`[PAGE] Navigation error: ${e.message}`);
    // Try without networkidle
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await delay(3000);
    } catch (e2) {
      return { error: e2.message, url };
    }
  }

  const screenshotPath = await takeScreenshot(page, name);
  const info = await extractPageInfo(page);

  console.log(`[PAGE] Title: ${info.docTitle}`);
  console.log(`[PAGE] Forms: ${info.forms.length}, Tables: ${info.tables.length}, Buttons: ${info.buttons.length}`);
  console.log(`[PAGE] Nav items: ${info.navItems.length}, Admin links: ${info.adminLinks.length}`);

  return { ...info, screenshotPath };
}

function formatPageResults(name, info) {
  if (!info || info.error) {
    return `### ${name}\n- Error: ${info?.error || 'Unknown error'}\n- URL: ${info?.url || 'N/A'}\n\n`;
  }

  let md = `### ${name}\n`;
  md += `- **URL**: ${info.currentUrl}\n`;
  md += `- **Page Title**: ${info.docTitle}\n`;

  if (info.titles?.length > 0) {
    md += `- **Headings**: ${info.titles.map(t => `${t.tag}: ${t.text}`).join(', ')}\n`;
  }

  if (info.navItems?.length > 0) {
    md += `\n**Navigation Items (SNB/Side Nav)**:\n`;
    info.navItems.slice(0, 30).forEach(item => {
      md += `- ${item.text} (${item.href})\n`;
    });
  }

  if (info.tabs?.length > 0) {
    md += `\n**Tabs**:\n`;
    info.tabs.forEach(tab => {
      md += `- ${tab}\n`;
    });
  }

  if (info.forms?.length > 0) {
    md += `\n**Forms** (${info.forms.length} total):\n`;
    info.forms.forEach(form => {
      md += `\n*Form: ${form.id || form.name || 'unnamed'} (${form.method || 'GET'} -> ${form.action})*\n`;
      if (form.inputs?.length > 0) {
        form.inputs.forEach(input => {
          const label = input.label ? `[${input.label}] ` : '';
          const opts = input.options ? ` (options: ${input.options.join(', ')})` : '';
          md += `  - ${label}\`${input.tag}\` name="${input.name}" type="${input.type}"${opts}\n`;
        });
      }
    });
  }

  if (info.tables?.length > 0) {
    md += `\n**Tables** (${info.tables.length} total):\n`;
    info.tables.forEach(table => {
      md += `\n*Table: ${table.caption || table.id || table.className || 'unnamed'} (${table.rowCount} rows)*\n`;
      if (table.headers?.length > 0) {
        md += `  Columns: ${table.headers.join(' | ')}\n`;
      }
      if (table.sampleRow?.length > 0) {
        md += `  Sample row: ${table.sampleRow.join(' | ')}\n`;
      }
    });
  }

  if (info.buttons?.length > 0) {
    md += `\n**Buttons** (${info.buttons.length} total):\n`;
    const uniqueButtons = [...new Map(info.buttons.map(b => [b.text, b])).values()];
    uniqueButtons.slice(0, 20).forEach(btn => {
      md += `- "${btn.text}"\n`;
    });
  }

  if (info.sections?.length > 0) {
    md += `\n**Content Sections**:\n`;
    info.sections.slice(0, 10).forEach(s => {
      if (s.heading) md += `- ${s.heading} (${s.inputCount} inputs)\n`;
    });
  }

  md += '\n';
  return md;
}

async function main() {
  console.log('=== Rhymix ASIS Live Analysis ===');
  console.log('Date:', new Date().toISOString());

  const browser = await chromium.launch({
    headless: true,
    args: ['--lang=ko-KR']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }
  });

  const page = await context.newPage();
  const allResults = {};

  try {
    // =========================================================
    // PHASE 1: PUBLIC PAGES (no login needed)
    // =========================================================
    console.log('\n\n========== PHASE 1: PUBLIC PAGES ==========');

    const publicPages = [
      { name: '01-homepage', url: 'http://localhost/', label: 'Homepage' },
      { name: '02-login-page', url: 'http://localhost/?module=member&act=dispMemberLoginForm', label: 'Login Page' },
      { name: '03-register-page', url: 'http://localhost/?module=member&act=dispMemberSignUpForm', label: 'Register Page' }
    ];

    for (const p of publicPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 2: ADMIN LOGIN
    // =========================================================
    console.log('\n\n========== PHASE 2: ADMIN LOGIN ==========');
    await loginToAdmin(page);

    // =========================================================
    // PHASE 3: ADMIN DASHBOARD
    // =========================================================
    console.log('\n\n========== PHASE 3: ADMIN DASHBOARD ==========');
    allResults['Admin Dashboard'] = await analyzePage(page, '04-admin-dashboard', ADMIN_URL);

    // =========================================================
    // PHASE 4: MEMBER ADMIN PAGES
    // =========================================================
    console.log('\n\n========== PHASE 4: MEMBER ADMIN ==========');

    const memberPages = [
      { name: '05-member-list', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminList', label: 'Member List' },
      { name: '06-member-config', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminConfig', label: 'Member Config' },
      { name: '07-member-groups', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminGroupList', label: 'Member Groups' },
      { name: '08-member-permission', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminPermission', label: 'Member Permissions' },
      { name: '09-member-fields', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminFieldsetList', label: 'Member Extra Fields' },
      { name: '10-member-join', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminJoinForm', label: 'Member Join Config' }
    ];

    for (const p of memberPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 5: BOARD ADMIN
    // =========================================================
    console.log('\n\n========== PHASE 5: BOARD ADMIN ==========');

    const boardPages = [
      { name: '11-board-list', url: 'http://localhost/index.php?module=admin&act=dispBoardAdminList', label: 'Board List' },
      { name: '12-board-categories', url: 'http://localhost/index.php?module=admin&act=dispBoardAdminCategories', label: 'Board Categories' },
      { name: '13-document-list', url: 'http://localhost/index.php?module=admin&act=dispDocumentAdminList', label: 'Document List' }
    ];

    for (const p of boardPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 6: SITE DESIGN / MENU
    // =========================================================
    console.log('\n\n========== PHASE 6: SITE DESIGN ==========');

    const designPages = [
      { name: '14-site-design', url: 'http://localhost/index.php?module=admin&act=dispMenuAdminSiteDesign', label: 'Site Design' },
      { name: '15-menu-list', url: 'http://localhost/index.php?module=admin&act=dispMenuAdminList', label: 'Menu List' },
      { name: '16-layout-list', url: 'http://localhost/index.php?module=admin&act=dispLayoutAdminList', label: 'Layout List' },
      { name: '17-layout-config', url: 'http://localhost/index.php?module=admin&act=dispLayoutAdminConfig', label: 'Layout Config' }
    ];

    for (const p of designPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 7: POINTS SYSTEM
    // =========================================================
    console.log('\n\n========== PHASE 7: POINTS ==========');

    const pointPages = [
      { name: '18-point-config', url: 'http://localhost/index.php?module=admin&act=dispPointAdminConfig', label: 'Point Config' },
      { name: '19-point-list', url: 'http://localhost/index.php?module=admin&act=dispPointAdminList', label: 'Point List' }
    ];

    for (const p of pointPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 8: WIDGETS & MODULES
    // =========================================================
    console.log('\n\n========== PHASE 8: WIDGETS & MODULES ==========');

    const widgetPages = [
      { name: '20-widget-list', url: 'http://localhost/index.php?module=admin&act=dispWidgetAdminList', label: 'Widget List' },
      { name: '21-module-list', url: 'http://localhost/index.php?module=admin&act=dispAdminAdminList', label: 'Module List' },
      { name: '22-addon-list', url: 'http://localhost/index.php?module=admin&act=dispAddonAdminList', label: 'Addon List' }
    ];

    for (const p of widgetPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 9: SYSTEM SETTINGS
    // =========================================================
    console.log('\n\n========== PHASE 9: SYSTEM SETTINGS ==========');

    const systemPages = [
      { name: '23-system-general', url: 'http://localhost/index.php?module=admin&act=dispAdminConfig', label: 'System General Config' },
      { name: '24-system-ftp', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigFTP', label: 'System FTP Config' },
      { name: '25-system-mail', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigMail', label: 'System Mail Config' },
      { name: '26-system-sms', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigSMS', label: 'System SMS Config' }
    ];

    for (const p of systemPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 10: ADDITIONAL ADMIN AREAS
    // =========================================================
    console.log('\n\n========== PHASE 10: ADDITIONAL ADMIN ==========');

    const additionalPages = [
      { name: '27-admin-list', url: 'http://localhost/index.php?module=admin&act=dispAdminAdminList', label: 'Admin User List' },
      { name: '28-comment-list', url: 'http://localhost/index.php?module=admin&act=dispCommentAdminList', label: 'Comment List' },
      { name: '29-file-list', url: 'http://localhost/index.php?module=admin&act=dispFileAdminList', label: 'File List' },
      { name: '30-spam-list', url: 'http://localhost/index.php?module=admin&act=dispSpamAdminList', label: 'Spam List' }
    ];

    for (const p of additionalPages) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // =========================================================
    // PHASE 11: NAVIGATION DISCOVERY
    // =========================================================
    console.log('\n\n========== PHASE 11: NAVIGATION DISCOVERY ==========');

    // Go back to dashboard and extract ALL navigation links
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    const fullNav = await page.evaluate(() => {
      const allLinks = [];
      document.querySelectorAll('a').forEach(a => {
        const text = a.textContent?.trim();
        const href = a.href;
        if (text && href && text.length > 0 && text.length < 100 && (href.includes('act=') || href.includes('/admin'))) {
          allLinks.push({ text, href });
        }
      });

      // Also get the structured navigation
      const navSections = [];
      document.querySelectorAll('.gnb > li, #gnb > li, .admin_menu > li').forEach(li => {
        const section = {
          label: li.querySelector('a, span')?.textContent?.trim(),
          children: Array.from(li.querySelectorAll('.snb a, li a, ul a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href
          }))
        };
        if (section.label) navSections.push(section);
      });

      return { allLinks, navSections };
    });

    console.log('[NAV] Found', fullNav.allLinks.length, 'admin links');
    console.log('[NAV] Found', fullNav.navSections.length, 'nav sections');

    // =========================================================
    // PHASE 12: VISIT NEWLY DISCOVERED PAGES
    // =========================================================
    console.log('\n\n========== PHASE 12: DISCOVER ADDITIONAL PAGES ==========');

    // Also try the /admin/ URL path structure
    const additionalDiscovery = [
      { name: '31-admin-board-module', url: 'http://localhost/admin/module/board/', label: 'Board Module Admin' },
      { name: '32-admin-member-module', url: 'http://localhost/admin/module/member/', label: 'Member Module Admin' },
      { name: '33-admin-plugin', url: 'http://localhost/index.php?module=admin&act=dispInstalledModuleList', label: 'Installed Modules' },
      { name: '34-admin-install', url: 'http://localhost/index.php?module=admin&act=dispAdminPluginList', label: 'Plugin List' }
    ];

    for (const p of additionalDiscovery) {
      allResults[p.label] = await analyzePage(page, p.name, p.url);
    }

    // Save raw results
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'raw-results.json'),
      JSON.stringify(allResults, null, 2)
    );
    console.log('\n[SAVE] Raw results saved to', path.join(SCREENSHOTS_DIR, 'raw-results.json'));

    // =========================================================
    // GENERATE MARKDOWN REPORT
    // =========================================================
    console.log('\n\n========== GENERATING REPORT ==========');

    let md = `# ASIS Live Analysis - Rhymix PHP CMS

## Analysis Date: ${new Date().toISOString().split('T')[0]}
## Method: Playwright live browser capture
## Base URL: http://localhost

---

## Executive Summary

This document provides a comprehensive analysis of the Rhymix PHP CMS admin system captured via live browser automation.

---

## 1. Public Pages

`;

    const publicPageKeys = ['Homepage', 'Login Page', 'Register Page'];
    for (const key of publicPageKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 2. Admin Dashboard

`;
    if (allResults['Admin Dashboard']) {
      md += formatPageResults('Admin Dashboard', allResults['Admin Dashboard']);
    }

    md += `---

## 3. Member Management

`;
    const memberKeys = ['Member List', 'Member Config', 'Member Groups', 'Member Permissions', 'Member Extra Fields', 'Member Join Config'];
    for (const key of memberKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 4. Board/Content Management

`;
    const boardKeys = ['Board List', 'Board Categories', 'Document List'];
    for (const key of boardKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 5. Site Design & Layout

`;
    const designKeys = ['Site Design', 'Menu List', 'Layout List', 'Layout Config'];
    for (const key of designKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 6. Points System

`;
    const pointKeys = ['Point Config', 'Point List'];
    for (const key of pointKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 7. Widgets, Modules & Addons

`;
    const widgetKeys = ['Widget List', 'Module List', 'Addon List'];
    for (const key of widgetKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 8. System Configuration

`;
    const sysKeys = ['System General Config', 'System FTP Config', 'System Mail Config', 'System SMS Config'];
    for (const key of sysKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 9. Additional Admin Pages

`;
    const addKeys = ['Admin User List', 'Comment List', 'File List', 'Spam List', 'Board Module Admin', 'Member Module Admin', 'Installed Modules', 'Plugin List'];
    for (const key of addKeys) {
      if (allResults[key]) {
        md += formatPageResults(key, allResults[key]);
      }
    }

    md += `---

## 10. Full Navigation Structure

### Admin Links Discovered (via dashboard)

`;
    if (fullNav.navSections?.length > 0) {
      fullNav.navSections.forEach(section => {
        md += `**${section.label}**:\n`;
        (section.children || []).forEach(child => {
          md += `- ${child.text}: ${child.href}\n`;
        });
        md += '\n';
      });
    }

    md += `\n### All Admin URLs Discovered\n\n`;
    const uniqueLinks = [...new Map(fullNav.allLinks.map(l => [l.href, l])).values()];
    uniqueLinks.forEach(link => {
      md += `- [${link.text}](${link.href})\n`;
    });

    md += `\n---

## 11. Feature Inventory

Based on the live analysis, the following features were identified in Rhymix CMS:

### Member Management Features
- Member list with search/filter
- Member groups configuration
- Member permissions/access control
- Custom member fields (fieldsets)
- Member join form configuration
- Point system per member

### Content Management Features
- Board (게시판) creation and management
- Document management
- Comment management
- File attachment management

### Site Design Features
- Menu management
- Layout selection and configuration
- Theme/skin management
- Widget placement

### System Features
- System configuration (general, FTP, mail, SMS)
- Module management
- Addon management
- Spam/black-list management

---

## 12. Key Observations

1. **URL Pattern**: Rhymix uses \`?module=MODULE&act=ACTNAME\` URL pattern
2. **Module System**: Each feature is a "module" (member, board, layout, widget, etc.)
3. **Language**: Admin UI is in Korean (한국어)
4. **Authentication**: Session-based login via #uid (user_id) + #upw (password)
5. **Navigation**: Uses .gnb (global nav bar) + .snb (side nav bar) structure
6. **Forms**: Standard HTML forms with PHP processing
`;

    const reportPath = '.moai/specs/SPEC-RHYMIX-001/asis-live-analysis.md';
    fs.writeFileSync(reportPath, md);
    console.log('\n[REPORT] Saved to', reportPath);
    console.log('[DONE] Analysis complete!');

  } catch (err) {
    console.error('[ERROR] Main error:', err);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
