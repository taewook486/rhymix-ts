/**
 * ASIS Rhymix Admin Inspector
 * 브라우저로 관리자 페이지의 모든 메뉴와 버튼을 조사
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface MenuItem {
  text: string;
  href?: string;
  children?: MenuItem[];
  selector?: string;
}

interface AdminStructure {
  url: string;
  title: string;
  mainMenus: MenuItem[];
  sideMenus: MenuItem[];
  buttons: Array<{
    text: string;
    selector: string;
    action?: string;
  }>;
  forms: Array<{
    action: string;
    method: string;
    fields: string[];
  }>;
}

async function inspectASISAdmin(): Promise<AdminStructure> {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 클릭 사이에 딜레이
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('🌐 http://localhost/ 접속 중...');
  await page.goto('http://localhost/', { waitUntil: 'networkidle' });

  // 로그인 폼 찾기
  const loginForm = page.locator('form[action*="login"], form[name*="login"], #member, .login');

  if (await loginForm.isVisible()) {
    console.log('📝 로그인 폼 발견');

    // ID 입력
    await page.fill('input[name="user_id"], input[type="text"].inputId, #user_id', 'comfit99@naver.com');

    // 비밀번호 입력
    await page.fill('input[name="password"], input[type="password"].inputPassword, #password', 'rhymix123');

    // 로그인 버튼 클릭
    await page.click('input[type="submit"][value*="로그인"], button[type="submit"], .btnLogin');

    console.log('✅ 로그인 완료, 대기 중...');
    await page.waitForTimeout(2000);
  }

  // 현재 URL과 페이지 제목
  const url = page.url();
  const title = await page.title();
  console.log(`📍 현재 페이지: ${title} (${url})`);

  const result: AdminStructure = {
    url,
    title,
    mainMenus: [],
    sideMenus: [],
    buttons: [],
    forms: []
  };

  // 메인 메뉴 조사 (GNB)
  console.log('\n🔍 메인 메뉴 조사 중...');
  const mainMenu = page.locator('nav, #gnb, .gnb, header nav');
  if (await mainMenu.isVisible()) {
    result.mainMenus = await extractMenuItems(mainMenu, page);
  }

  // 사이드바/관리자 메뉴 조사
  console.log('\n🔍 사이드바 메뉴 조사 중...');
  const sideMenu = page.locator('.sidebar, #sidebar, aside, .admin-menu, .module_list');
  if (await sideMenu.isVisible()) {
    result.sideMenus = await extractMenuItems(sideMenu, page);
  }

  // 버튼 조사
  console.log('\n🔍 버튼 조사 중...');
  const buttons = await page.locator('button, input[type="submit"], input[type="button"], .btn').all();
  for (const btn of buttons.slice(0, 50)) { // 최대 50개
    try {
      const text = await btn.textContent();
      const isVisible = await btn.isVisible();
      if (text && isVisible && text.trim()) {
        result.buttons.push({
          text: text.trim(),
          selector: await getSelector(btn, page)
        });
      }
    } catch (e) {
      // 무시
    }
  }

  // 관리자 페이지 링크들 따라가기
  console.log('\n🔍 관리자 메뉴 클릭하며 조사...');
  const adminLinks = page.locator('a:has-text("관리자"), a:has-text("Admin"), a[href*="admin"]');
  const adminLinkCount = await adminLinks.count();

  if (adminLinkCount > 0) {
    await adminLinks.first().click();
    await page.waitForTimeout(2000);

    // 관리자 페이지에서 모든 링크와 메뉴 조사
    const adminMenus = page.locator('a, .menu a, li a');
    const menuCount = await adminMenus.count();

    console.log(`📋 관리자 메뉴 ${menuCount}개 발견`);

    // 관리자 페이지 스크린샷
    await page.screenshot({ path: 'screenshots/admin-dashboard.png', fullPage: true });
    console.log('📸 스크린샷 저장: screenshots/admin-dashboard.png');
  }

  // 결과 저장
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/asis-admin-structure.json',
    JSON.stringify(result, null, 2),
    'utf-8'
  );
  console.log('\n✅ 조사 완료! 결과 저장: scripts/asis-admin-structure.json');

  await browser.waitForTimeout(5000);
  await browser.close();

  return result;
}

async function extractMenuItems(locator: any, page: Page): Promise<MenuItem[]> {
  const items: MenuItem[] = [];
  try {
    const links = await locator.locator('a').all();

    for (const link of links.slice(0, 30)) {
      try {
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        const isVisible = await link.isVisible();

        if (text && isVisible && text.trim()) {
          items.push({
            text: text.trim(),
            href: href || undefined
          });
        }
      } catch (e) {
        // 무시
      }
    }
  } catch (e) {
    // 무시
  }

  return items;
}

async function getSelector(element: any, page: Page): Promise<string> {
  try {
    return await element.evaluate((el: any) => {
      if (el.id) return `#${el.id}`;
      if (el.className) return `.${el.className.split(' ')[0]}`;
      return el.tagName.toLowerCase();
    });
  } catch (e) {
    return 'unknown';
  }
}

// 실행
inspectASISAdmin()
  .then(result => {
    console.log('\n🎉 조사 완료!');
    console.log(`발견된 메인 메뉴: ${result.mainMenus.length}개`);
    console.log(`발견된 사이드 메뉴: ${result.sideMenus.length}개`);
    console.log(`발견된 버튼: ${result.buttons.length}개`);
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
