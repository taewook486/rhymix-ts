/**
 * ASIS Rhymix Admin Full Inspector
 * 브라우저로 관리자 페이지의 모든 메뉴, 버튼, 탭을 포괄적으로 조사
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface MenuItem {
  text: string;
  href?: string;
  children?: MenuItem[];
  selector?: string;
  depth?: number;
}

interface AdminStructure {
  url: string;
  title: string;
  mainMenus: MenuItem[];
  adminMenus: MenuItem[];
  tabs: Array<{
    text: string;
    panel?: string;
  }>;
  buttons: Array<{
    text: string;
    selector: string;
    type?: string;
  }>;
  forms: Array<{
    action: string;
    method: string;
    fields: Array<{
      name: string;
      type: string;
      label?: string;
    }>;
  }>;
  configuration: Array<{
    key: string;
    value: string;
    label?: string;
  }>;
  screenshots: string[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickAndWait(page: Page, selector: string): Promise<boolean> {
  try {
    await page.click(selector);
    await sleep(1000);
    return true;
  } catch (e) {
    return false;
  }
}

async function inspectASISAdmin(): Promise<AdminStructure> {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const result: AdminStructure = {
    url: '',
    title: '',
    mainMenus: [],
    adminMenus: [],
    tabs: [],
    buttons: [],
    forms: [],
    configuration: [],
    screenshots: []
  };

  try {
    console.log('🌐 http://localhost/ 접속 중...');
    await page.goto('http://localhost/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await sleep(2000);

    result.url = page.url();
    result.title = await page.title();

    // 메인 메뉴 조사
    console.log('\n🔍 메인 메뉴 (GNB) 조사...');
    const gnbSelectors = ['nav', '#gnb', '.gnb', 'header nav', '.navigation', '#navigation'];
    for (const selector of gnbSelectors) {
      try {
        const gnb = page.locator(selector).first();
        if (await gnb.isVisible()) {
          const links = await gnb.locator('a').all();
          for (const link of links) {
            try {
              const text = await link.textContent();
              const href = await link.getAttribute('href');
              const isVisible = await link.isVisible();
              if (text && isVisible && text.trim()) {
                result.mainMenus.push({
                  text: text.trim(),
                  href: href || undefined
                });
              }
            } catch (e) {}
          }
          break;
        }
      } catch (e) {}
    }

    // 로그인 시도
    console.log('\n🔐 로그인 시도...');

    // 여러 로그인 필드 선택자 시도
    const userIdSelectors = [
      'input[name="user_id"]',
      'input[name="uid"]',
      'input[name="email"]',
      'input[type="text"].inputId',
      '#user_id',
      '#uid',
      '#email',
      '.login input[type="text"]'
    ];

    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"].inputPassword',
      '#password',
      '#user_password',
      '.login input[type="password"]'
    ];

    let userIdFilled = false;
    let passwordFilled = false;

    for (const selector of userIdSelectors) {
      try {
        await page.fill(selector, 'comfit99@naver.com', { timeout: 2000 });
        userIdFilled = true;
        console.log(`✅ ID 입력: ${selector}`);
        break;
      } catch (e) {}
    }

    await sleep(500);

    for (const selector of passwordSelectors) {
      try {
        await page.fill(selector, 'rhymix123', { timeout: 2000 });
        passwordFilled = true;
        console.log(`✅ PW 입력: ${selector}`);
        break;
      } catch (e) {}
    }

    if (userIdFilled && passwordFilled) {
      // 로그인 버튼 클릭
      const submitSelectors = [
        'input[type="submit"][value*="로그인"]',
        'button[type="submit"]',
        '.btnLogin',
        'button:has-text("로그인")',
        'input[type="submit"]'
      ];

      for (const selector of submitSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log(`✅ 로그인 버튼 클릭: ${selector}`);
          await sleep(3000);
          break;
        } catch (e) {}
      }

      result.url = page.url();
      result.title = await page.title();
    }

    // 스크린샷 1: 로그인 후
    const shot1 = `screenshots/01-landing-${Date.now()}.png`;
    await page.screenshot({ path: shot1, fullPage: true });
    result.screenshots.push(shot1);
    console.log(`📸 스크린샷: ${shot1}`);

    // 관리자 페이지 링크 찾기
    console.log('\n🔍 관리자 페이지 링크 찾기...');

    const adminLinkSelectors = [
      'a:has-text("관리자")',
      'a:has-text("Admin")',
      'a[href*="admin"]',
      'a[href*="/admin/"]',
      '.admin a',
      '.administrator a'
    ];

    let adminPageFound = false;

    for (const selector of adminLinkSelectors) {
      try {
        const adminLink = page.locator(selector).first();
        if (await adminLink.isVisible({ timeout: 2000 })) {
          const linkText = await adminLink.textContent();
          const href = await adminLink.getAttribute('href');
          console.log(`🔗 관리자 링크 발견: ${linkText} -> ${href}`);

          await adminLink.click();
          await sleep(3000);
          adminPageFound = true;

          const shot2 = `screenshots/02-admin-dashboard-${Date.now()}.png`;
          await page.screenshot({ path: shot2, fullPage: true });
          result.screenshots.push(shot2);
          console.log(`📸 스크린샷: ${shot2}`);

          break;
        }
      } catch (e) {}
    }

    // 직접 관리자 URL 시도
    if (!adminPageFound) {
      console.log('🔗 직접 관리자 URL 접속 시도...');
      const adminUrls = [
        'http://localhost/admin',
        'http://localhost/?module=admin',
        'http://localhost/index.php?module=admin'
      ];

      for (const url of adminUrls) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await sleep(2000);

          const title = await page.title();
          if (title.includes('Admin') || title.includes('관리자') || title.includes('Rhymix')) {
            console.log(`✅ 관리자 페이지 접속: ${url}`);
            adminPageFound = true;

            const shot = `screenshots/02-admin-dashboard-${Date.now()}.png`;
            await page.screenshot({ path: shot, fullPage: true });
            result.screenshots.push(shot);

            break;
          }
        } catch (e) {}
      }
    }

    if (adminPageFound) {
      // 관리자 메뉴 조사
      console.log('\n🔍 관리자 메뉴 조사...');

      const menuSelectors = [
        '.sidebar',
        '#sidebar',
        'aside',
        '.admin-menu',
        '.module_list',
        '#admin-menu',
        '.navigation',
        '.side-menu'
      ];

      for (const menuSelector of menuSelectors) {
        try {
          const menu = page.locator(menuSelector).first();
          if (await menu.isVisible()) {
            console.log(`📋 메뉴 발견: ${menuSelector}`);

            const links = await menu.locator('a').all();
            console.log(`   - ${links.length}개 링크 발견`);

            for (const link of links.slice(0, 50)) {
              try {
                const text = await link.textContent();
                const href = await link.getAttribute('href');
                const isVisible = await link.isVisible();

                if (text && isVisible && text.trim()) {
                  result.adminMenus.push({
                    text: text.trim(),
                    href: href || undefined
                  });
                }
              } catch (e) {}
            }

            break;
          }
        } catch (e) {}
      }

      // 모든 버튼 조사
      console.log('\n🔍 버튼 조사...');
      const allButtons = await page.locator('button, input[type="submit"], input[type="button"], .btn, a[class*="btn"]').all();
      console.log(`   - ${allButtons.length}개 버튼 발견`);

      for (const btn of allButtons.slice(0, 100)) {
        try {
          const text = await btn.textContent();
          const isVisible = await btn.isVisible();
          const tagName = await btn.evaluate(el => el.tagName);

          if (text && isVisible && text.trim() && text.trim().length > 0 && text.trim().length < 100) {
            result.buttons.push({
              text: text.trim(),
              selector: tagName.toLowerCase(),
              type: tagName.toLowerCase()
            });
          }
        } catch (e) {}
      }

      // 폼 조사
      console.log('\n🔍 폼 조사...');
      const forms = await page.locator('form').all();
      console.log(`   - ${forms.length}개 폼 발견`);

      for (const form of forms) {
        try {
          const action = await form.getAttribute('action');
          const method = await form.getAttribute('method');

          const fields: Array<{ name: string; type: string; label?: string }> = [];
          const inputs = await form.locator('input, select, textarea').all();

          for (const input of inputs.slice(0, 20)) {
            try {
              const name = await input.getAttribute('name');
              const type = await input.getAttribute('type');
              const label = await input.getAttribute('label');
              if (name) {
                fields.push({ name, type: type || 'text', label: label || undefined });
              }
            } catch (e) {}
          }

          if (fields.length > 0) {
            result.forms.push({
              action: action || '',
              method: method || 'POST',
              fields
            });
          }
        } catch (e) {}
      }

      // 탭 조사
      console.log('\n🔍 탭 조사...');
      const tabSelectors = [
        '.tabs',
        '[role="tablist"]',
        '.tab-nav',
        '.tab-buttons'
      ];

      for (const tabSelector of tabSelectors) {
        try {
          const tabs = page.locator(tabSelector);
          if (await tabs.isVisible()) {
            const tabButtons = await tabs.locator('[role="tab"], .tab, button').all();

            for (const tab of tabButtons) {
              try {
                const text = await tab.textContent();
                if (text && text.trim()) {
                  result.tabs.push({
                    text: text.trim()
                  });
                }
              } catch (e) {}
            }
            break;
          }
        } catch (e) {}
      }
    }

    // 결과 저장
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const resultPath = `scripts/asis-admin-full-${timestamp}.json`;

    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('\n✅ 조사 완료!');
    console.log(`📄 결과 저장: ${resultPath}`);
    console.log(`📊 통계:`);
    console.log(`   - 메인 메뉴: ${result.mainMenus.length}개`);
    console.log(`   - 관리자 메뉴: ${result.adminMenus.length}개`);
    console.log(`   - 버튼: ${result.buttons.length}개`);
    console.log(`   - 폼: ${result.forms.length}개`);
    console.log(`   - 탭: ${result.tabs.length}개`);
    console.log(`   - 스크린샷: ${result.screenshots.length}개`);

    // 10초 대기 (사용자가 브라우저를 볼 수 있도록)
    console.log('\n⏸️ 10초 후 브라우저 닫기...');
    await sleep(10000);

    await browser.close();

    return result;

  } catch (error) {
    console.error('❌ 오류:', error);
    await browser.close();
    throw error;
  }
}

// 실행
inspectASISAdmin()
  .then(() => {
    console.log('\n🎉 모든 조사 완료!');
  })
  .catch(error => {
    console.error('❌ 치명적 오류:', error);
    process.exit(1);
  });
