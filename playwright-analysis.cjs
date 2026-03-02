const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = '.moai/specs/SPEC-RHYMIX-001/screenshots';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzePage(page, name, url) {
  console.log('\n=== Analyzing: ' + name + ' ===');
  console.log('URL: ' + url);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);
  } catch (e) {
    console.log('Navigation error:', e.message);
    return { error: e.message };
  }

  // Take screenshot
  const screenshotPath = path.join(screenshotsDir, name + '.png');
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved: ' + screenshotPath);
  } catch (e) {
    console.log('Screenshot error:', e.message);
  }

  // Extract page content
  const content = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form')).map(form => ({
      action: form.action,
      method: form.method,
      id: form.id,
      name: form.name,
      inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(el => ({
        tag: el.tagName,
        type: el.type || el.tagName.toLowerCase(),
        name: el.name,
        id: el.id,
        placeholder: el.placeholder
      })).filter(i => i.name || i.id)
    }));

    const tabNavs = Array.from(document.querySelectorAll('.x .nav, .x .tabs, ul.nav, .nav-tabs, .x_tabs, .x_nav, .admin_nav, .snb')).map(nav =>
      Array.from(nav.querySelectorAll('li, a')).map(el => el.textContent?.trim()).filter(Boolean)
    );

    const headings = Array.from(document.querySelectorAll('h1, h2, h3, .x .header, .page-header')).map(h => ({
      tag: h.tagName,
      text: h.textContent?.trim()
    }));

    const tables = Array.from(document.querySelectorAll('table')).map(table => ({
      headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim()),
      rows: table.querySelectorAll('tbody tr').length
    }));

    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], .btn, a.btn, .button')).map(btn => ({
      text: (btn.textContent?.trim() || btn.value)?.substring(0, 50),
      className: btn.className?.substring(0, 50)
    }));

    const pageTitle = document.querySelector('h1, .x .header, .page-header, .x_page_title')?.textContent?.trim() || document.title;

    const selects = Array.from(document.querySelectorAll('select')).map(sel => ({
      name: sel.name,
      id: sel.id,
      options: Array.from(sel.querySelectorAll('option')).map(opt => opt.textContent?.trim()).slice(0, 10)
    }));

    const sections = Array.from(document.querySelectorAll('fieldset, .x .section, .x_section, .form_group, .form-group')).map(s => ({
      legend: s.querySelector('legend, h2, h3')?.textContent?.trim(),
      inputCount: s.querySelectorAll('input, select, textarea').length
    }));

    return { forms, tabNavs, headings, tables, buttons, pageTitle, selects, sections };
  });

  console.log('Page Title:', content.pageTitle);
  console.log('Forms:', content.forms.length);
  console.log('Tabs:', JSON.stringify(content.tabNavs));
  console.log('Tables:', content.tables.length);
  console.log('Buttons:', content.buttons.length);

  return content;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR'
  });
  const page = await context.newPage();

  const results = {};

  try {
    // === ASIS Login ===
    console.log('=== ASIS Login ===');
    await page.goto('http://localhost/index.php?module=admin', { waitUntil: 'networkidle' });
    await delay(2000);

    const userIdInput = await page.$('#uid');
    if (userIdInput) {
      console.log('Logging in to ASIS...');
      await page.fill('#uid', 'comfit99@naver.com');
      await page.fill('#upw', 'rhymix123');
      await page.click('button[type="submit"]');
      await delay(3000);
      console.log('ASIS Login successful');
    }

    // Take admin dashboard screenshot
    await page.screenshot({ path: path.join(screenshotsDir, 'asis-admin-dashboard.png'), fullPage: true });

    // === ASIS Pages Analysis ===
    const asisPages = [
      { name: 'asis-site-design', url: 'http://localhost/index.php?module=admin&act=dispMenuAdminSiteDesign' },
      { name: 'asis-member-config', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminConfig' },
      { name: 'asis-member-groups', url: 'http://localhost/index.php?module=admin&act=dispMemberAdminGroupList' },
      { name: 'asis-point-config', url: 'http://localhost/index.php?module=admin&act=dispPointAdminConfig' }
    ];

    for (const pageInfo of asisPages) {
      try {
        results[pageInfo.name] = await analyzePage(page, pageInfo.name, pageInfo.url);
      } catch (err) {
        console.error('Error analyzing ' + pageInfo.name + ':', err.message);
        results[pageInfo.name] = { error: err.message };
      }
    }

    // === TOBE Analysis ===
    console.log('\n=== TOBE Login ===');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await delay(2000);

    // Check login state
    const tobeLoginBtn = await page.$('a[href*="login"], button:has-text("Login"), a:has-text("로그인")');
    if (tobeLoginBtn) {
      await tobeLoginBtn.click();
      await delay(1000);
    }

    const emailInput = await page.$('input[name="email"], input[type="email"], #email');
    if (emailInput) {
      console.log('TOBE login form found, filling credentials...');
      await page.fill('input[name="email"], input[type="email"], #email', 'comfit99@naver.com');
      await page.fill('input[name="password"], input[type="password"], #password', 'Swbin046@');
      await page.click('button[type="submit"]');
      await delay(3000);
      console.log('TOBE Login submitted');
    }

    // Take TOBE dashboard screenshot
    await page.screenshot({ path: path.join(screenshotsDir, 'tobe-dashboard.png'), fullPage: true });

    // === TOBE Pages Analysis ===
    const tobePages = [
      { name: 'tobe-widgets', url: 'http://localhost:3000/admin/widgets' },
      { name: 'tobe-themes', url: 'http://localhost:3000/admin/themes' },
      { name: 'tobe-permissions', url: 'http://localhost:3000/admin/permissions' }
    ];

    for (const pageInfo of tobePages) {
      try {
        results[pageInfo.name] = await analyzePage(page, pageInfo.name, pageInfo.url);
      } catch (err) {
        console.error('Error analyzing ' + pageInfo.name + ':', err.message);
        results[pageInfo.name] = { error: err.message };
      }
    }

    // Save results
    fs.writeFileSync(
      path.join(screenshotsDir, 'analysis-results.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('\n=== Analysis Complete ===');
    console.log('Results saved to ' + screenshotsDir + '/analysis-results.json');

  } catch (err) {
    console.error('Main error:', err);
  } finally {
    await browser.close();
  }
}

main();
