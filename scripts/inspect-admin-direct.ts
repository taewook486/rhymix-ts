/**
 * ASIS Rhymix Admin 직접 URL 접속 조사
 */

import { chromium } from 'playwright';

async function inspectAdminDirect() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const page = await browser.newPage();

  console.log('🌐 관리자 페이지 직접 접속...');
  console.log('   URL: http://localhost/index.php?module=admin');

  await page.goto('http://localhost/index.php?module=admin', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  await sleep(3000);

  // 스크린샷
  await page.screenshot({ path: 'screenshots/admin-direct.png', fullPage: true });
  console.log('📸 스크린샷: screenshots/admin-direct.png');

  // 페이지 제목
  const title = await page.title();
  console.log(`📄 제목: ${title}`);
  console.log(`📍 URL: ${page.url()}`);

  // 모든 텍스트 추출
  const bodyText = await page.locator('body').textContent();
  console.log('\n📋 페이지 내용 (미리보기):');
  console.log(bodyText?.slice(0, 2000));

  // 모든 링크 추출
  console.log('\n🔗 모든 링크:');
  const links = await page.locator('a').all();

  const linkData: Array<{text: string; href: string | null}> = [];

  for (const link of links.slice(0, 100)) {
    try {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      if (text && text.trim() && text.trim().length < 200) {
        linkData.push({
          text: text.trim(),
          href: href || null
        });
      }
    } catch (e) {}
  }

  // 링크 정렬 및 출력
  linkData.sort((a, b) => a.text.localeCompare(b.text, 'ko'));

  for (const link of linkData) {
    console.log(`   - ${link.text} -> ${link.href || 'no-href'}`);
  }

  // 사이드바/내비게이션 메뉴 분석
  console.log('\n📋 사이드바 메뉴 구조:');

  const sidebarSelectors = [
    '.sidebar', '#sidebar', 'aside', '.admin-menu',
    '.module_list', '#admin-menu', '.navigation',
    '.left-panel', '.side-menu'
  ];

  for (const selector of sidebarSelectors) {
    try {
      const sidebar = page.locator(selector).first();
      if (await sidebar.isVisible()) {
        console.log(`✅ 사이드바 발견: ${selector}`);

        const sidebarLinks = await sidebar.locator('a').all();
        console.log(`   - ${sidebarLinks.length}개 메뉴 아이템`);

        for (const link of sidebarLinks.slice(0, 50)) {
          try {
            const text = await link.textContent();
            const href = await link.getAttribute('href');
            if (text && text.trim()) {
              console.log(`     • ${text.trim()} -> ${href || 'no-href'}`);
            }
          } catch (e) {}
        }

        break;
      }
    } catch (e) {}
  }

  // 위젯 영역 분석
  console.log('\n🧩 위젯 영역:');

  const widgetSelectors = [
    '.widget', '[class*="widget"]', '.dashboard-widget',
    '.recent', '.latest', '.statistics', '.info'
  ];

  for (const selector of widgetSelectors) {
    try {
      const widgets = page.locator(selector);
      const count = await widgets.count();
      if (count > 0) {
        console.log(`✅ ${selector}: ${count}개 발견`);

        for (const widget of await widgets.all()) {
          try {
            const text = await widget.textContent();
            if (text && text.trim().length > 0 && text.trim().length < 100) {
              console.log(`   - ${text.trim().slice(0, 80)}`);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // 버튼 분석
  console.log('\n🔘 버튼:');
  const buttons = await page.locator('button, input[type="submit"], input[type="button"], .btn, a[class*="btn"]').all();

  const buttonData: string[] = [];
  for (const btn of buttons.slice(0, 50)) {
    try {
      const text = await btn.textContent();
      if (text && text.trim() && text.trim().length < 100) {
        buttonData.push(text.trim());
      }
    } catch (e) {}
  }

  // 중복 제거 및 정렬
  const uniqueButtons = [...new Set(buttonData)].sort();
  for (const btn of uniqueButtons) {
    console.log(`   - ${btn}`);
  }

  // 폼 분석
  console.log('\n📝 폼:');
  const forms = await page.locator('form').all();

  for (const form of forms) {
    try {
      const action = await form.getAttribute('action');
      const method = await form.getAttribute('method');

      const inputs = await form.locator('input, select, textarea').all();
      const fieldNames: string[] = [];

      for (const input of inputs.slice(0, 20)) {
        try {
          const name = await input.getAttribute('name');
          const type = await input.getAttribute('type');
          const label = await input.getAttribute('placeholder') || await input.getAttribute('aria-label');

          if (name) {
            fieldNames.push(`${name} (${type || 'text'}${label ? ': ' + label : ''})`);
          }
        } catch (e) {}
      }

      if (fieldNames.length > 0) {
        console.log(`   - ${method || 'POST'} ${action || 'current'}`);
        console.log(`     Fields: ${fieldNames.join(', ')}`);
      }
    } catch (e) {}
  }

  // 결과 저장
  const result = {
    url: page.url(),
    title,
    links: linkData,
    buttons: uniqueButtons,
    screenshot: 'screenshots/admin-direct.png'
  };

  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const resultPath = `scripts/asis-admin-structure-${timestamp}.json`;

  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n✅ 결과 저장: ${resultPath}`);

  console.log('\n⏸️ 60초 후 브라우저 닫기...');
  await sleep(60000);

  await browser.close();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

inspectAdminDirect().catch(console.error);
