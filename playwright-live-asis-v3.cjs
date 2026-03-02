/**
 * Rhymix ASIS Live Analysis v3
 * Visit remaining important pages discovered from the admin navigation
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = '.moai/specs/SPEC-RHYMIX-001/screenshots/asis';
const ADMIN_URL = 'http://localhost/admin/';
const CREDENTIALS = { email: 'comfit99@naver.com', password: 'rhymix123' };

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const p = path.join(SCREENSHOTS_DIR, name + '.png');
  try {
    await page.screenshot({ path: p, fullPage: true });
    return p;
  } catch (e) {
    return null;
  }
}

async function extractPageData(page) {
  return page.evaluate(function() {
    var forms = Array.from(document.querySelectorAll('form')).map(function(form) {
      var inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(function(el) {
        var labelEl = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
        var label = labelEl ? labelEl.textContent.trim() : '';
        var options = [];
        if (el.tagName === 'SELECT') {
          options = Array.from(el.querySelectorAll('option')).map(function(o) {
            return { value: o.value, text: o.textContent.trim() };
          }).slice(0, 15);
        }
        return {
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          label: label,
          options: options
        };
      }).filter(function(i) { return i.name || i.id; });
      return { id: form.id, name: form.name, action: form.action, method: form.method, inputs: inputs };
    });

    var tables = Array.from(document.querySelectorAll('table')).map(function(table, i) {
      var headers = Array.from(table.querySelectorAll('thead th, thead td, tr:first-child th')).map(function(th) { return th.textContent.trim(); });
      var rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 5).map(function(tr) {
        return Array.from(tr.querySelectorAll('td')).map(function(td) { return td.textContent.trim().substring(0, 80); });
      });
      return {
        index: i,
        id: table.id,
        caption: table.querySelector('caption') ? table.querySelector('caption').textContent.trim() : '',
        headers: headers,
        rowCount: table.querySelectorAll('tbody tr').length,
        sampleRows: rows
      };
    });

    var buttons = [];
    document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, .btn, .button').forEach(function(btn) {
      var text = (btn.textContent ? btn.textContent.trim() : (btn.value || btn.title || '')).substring(0, 80);
      if (text && buttons.indexOf(text) === -1) {
        buttons.push(text);
      }
    });

    var headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(function(h) {
      return { tag: h.tagName, text: h.textContent.trim().substring(0, 100) };
    }).filter(function(h) { return h.text; });

    var tabs = [];
    document.querySelectorAll('.tab_menu li, .x_tab_menu li, .nav-tabs li, ul.tabs li').forEach(function(tab) {
      var a = tab.querySelector('a');
      tabs.push({ text: tab.textContent.trim(), href: a ? a.href : '' });
    });

    var sections = Array.from(document.querySelectorAll('fieldset')).map(function(s) {
      return {
        legend: s.querySelector('legend') ? s.querySelector('legend').textContent.trim() : '',
        inputCount: s.querySelectorAll('input, select, textarea').length
      };
    });

    return {
      docTitle: document.title,
      currentUrl: window.location.href,
      headings: headings,
      forms: forms,
      tables: tables,
      buttons: buttons,
      tabs: tabs,
      sections: sections
    };
  });
}

async function visitPage(page, name, url) {
  console.log('[VISIT] ' + name + ' -> ' + url);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(1500);
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await delay(2000);
    } catch (e2) {
      return { error: e2.message, name: name, url: url };
    }
  }
  await screenshot(page, name);
  const d = await extractPageData(page);
  console.log('  Title: "' + d.docTitle + '" forms=' + d.forms.length + ' tables=' + d.tables.length);
  return Object.assign(d, { name: name, requestedUrl: url });
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--lang=ko-KR'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'ko-KR' });
  const page = await context.newPage();
  const pageData = {};

  try {
    // Login
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);
    const uid = await page.$('#uid');
    if (uid) {
      await page.fill('#uid', CREDENTIALS.email);
      await page.fill('#upw', CREDENTIALS.password);
      await page.click('button[type="submit"]');
      await delay(3000);
    }
    console.log('Logged in. URL: ' + page.url());

    // Visit remaining important pages from the discovered navigation
    const pages = [
      { name: '70-page-admin', url: 'http://localhost/index.php?module=admin&act=dispPageAdminContent' },
      { name: '71-poll-admin', url: 'http://localhost/index.php?module=admin&act=dispPollAdminList' },
      { name: '72-editor-admin', url: 'http://localhost/index.php?module=admin&act=dispEditorAdminIndex' },
      { name: '73-trash-admin', url: 'http://localhost/index.php?module=admin&act=dispTrashAdminList' },
      { name: '74-filebox-admin', url: 'http://localhost/index.php?module=admin&act=dispModuleAdminFileBox' },
      { name: '75-module-admin', url: 'http://localhost/index.php?module=admin&act=dispModuleAdminContent' },
      { name: '76-lang-admin', url: 'http://localhost/index.php?module=admin&act=dispModuleAdminLangcode' },
      { name: '77-importer', url: 'http://localhost/index.php?module=admin&act=dispImporterAdminImportForm' },
      { name: '78-rss-admin', url: 'http://localhost/index.php?module=admin&act=dispRssAdminIndex' },
      { name: '79-cleanup', url: 'http://localhost/index.php?module=admin&act=dispAdminCleanupList' },
      { name: '80-server-env', url: 'http://localhost/index.php?module=admin&act=dispAdminViewServerEnv' },
      // Additional member actions
      { name: '81-member-insert', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminInsert' },
      { name: '82-member-group-add', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminGroupAdd' },
      // Board creation / edit
      { name: '83-board-create', url: 'http://localhost/index.php?module=admin&act=dispBoardAdminInsert' },
      // Layout editor
      { name: '84-layout-edit', url: 'http://localhost/index.php?module=admin&act=dispLayoutAdminEditor' },
      // Notification center sub-pages
      { name: '85-ncenter-config', url: 'http://localhost/index.php?module=admin&act=dispNcenterliteAdminConfig' },
      // Advanced mailer sub-pages
      { name: '86-mailer-config', url: 'http://localhost/index.php?module=admin&act=dispAdvanced_mailerAdminConfig' },
      // System config sub-pages
      { name: '87-system-db', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigDB' },
      { name: '88-system-cache', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigCache' },
      { name: '89-system-security', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigSecurity' },
      { name: '90-system-sns', url: 'http://localhost/index.php?module=admin&act=dispAdminConfigSns' }
    ];

    for (let i = 0; i < pages.length; i++) {
      pageData[pages[i].name] = await visitPage(page, pages[i].name, pages[i].url);
    }

    // Save new data
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'raw-results-v3.json'),
      JSON.stringify(pageData, null, 2)
    );
    console.log('\n[DONE] Saved raw-results-v3.json');

  } catch (err) {
    console.error('Fatal: ' + err.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
