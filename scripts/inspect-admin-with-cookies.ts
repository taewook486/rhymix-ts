/**
 * ASIS Rhymix Admin 정밀 조사 - 쿠키 사용
 */

import { chromium } from 'playwright';

interface AdminMenuItem {
  text: string;
  href: string;
  category?: string;
}

interface AdminPageStructure {
  url: string;
  title: string;
  mainMenu: AdminMenuItem[];
  sideMenu: AdminMenuItem[];
  tabs: string[];
  buttons: string[];
  widgets: string[];
  content?: string;
  screenshot: string;
}

async function inspectWithCookies() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 400
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // 쿠키 설정
  await context.addCookies([
    {
      name: 'RXSESSID',
      value: '6af2cbb268464f5fc689b25a98034d3f',
      domain: 'localhost',
      path: '/'
    },
    {
      name: 'rx_login_status',
      value: 'Ul2bMkVBZSaJp2jE04iIAUxN',
      domain: 'localhost',
      path: '/'
    },
    {
      name: 'rx_uatype',
      value: 'fHPvW40yNa4GBvLoTkV_9Q%3A0',
      domain: 'localhost',
      path: '/'
    }
  ]);

  const page = await context.newPage();

  console.log('🌐 http://localhost/index.php?module/admin 접속 (쿠키 적용됨)...');

  try {
    await page.goto('http://localhost/index.php?module=admin', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    await sleep(5000);

    const result: AdminPageStructure = {
      url: page.url(),
      title: await page.title(),
      mainMenu: [],
      sideMenu: [],
      tabs: [],
      buttons: [],
      widgets: [],
      screenshot: 'screenshots/admin-with-cookies.png'
    };

    // 스크린샷
    await page.screenshot({ path: result.screenshot, fullPage: true });
    console.log(`📸 스크린샷: ${result.screenshot}`);

    // 현재 페이지 확인
    const bodyText = await page.locator('body').textContent();
    console.log(`📍 현재 URL: ${result.url}`);
    console.log(`📄 제목: ${result.title}`);

    if (bodyText?.includes('로그인이 필요합니다') || bodyText?.includes('login required')) {
      console.log('❌ 로그인 실패 - 쿠키가 유효하지 않습니다');
    } else {
      console.log('✅ 로그인 성공!');

      // 관리자 대시보드 위젯 추출
      console.log('\n🧩 대시보드 위젯 조사...');

      const widgetSelectors = [
        '.widget', '[class*="widget"]', '.dashboard',
        '.recent', '.latest', '.statistics', '.counter'
      ];

      const widgetsFound = new Set<string>();

      for (const selector of widgetSelectors) {
        try {
          const widgets = page.locator(selector);
          const count = await widgets.count();

          if (count > 0) {
            for (const widget of await widgets.all()) {
              try {
                const text = await widget.textContent();
                if (text && text.trim() && text.trim().length > 0 && text.trim().length < 200) {
                  const trimmed = text.trim().slice(0, 100);
                  widgetsFound.add(trimmed);
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }

      result.widgets = Array.from(widgetsFound);
      console.log(`📊 위젯 ${result.widgets.length}개 발견`);

      // 사이드바 메뉴 조사
      console.log('\n📋 사이드바 메뉴 조사...');

      const sidebarSelectors = [
        '.sidebar', '#sidebar', 'aside', '.admin-menu',
        '.module_list', '#admin-menu', '.left-panel'
      ];

      for (const selector of sidebarSelectors) {
        try {
          const sidebar = page.locator(selector).first();
          if (await sidebar.isVisible({ timeout: 2000 })) {
            console.log(`✅ 사이드바 발견: ${selector}`);

            const menuItems = await sidebar.locator('a, li, .menu-item').all();
            console.log(`   - ${menuItems.length}개 메뉴 아이템`);

            for (const item of menuItems.slice(0, 100)) {
              try {
                const tagName = await item.evaluate(el => el.tagName.toLowerCase());
                const text = await item.textContent();
                const href = await item.getAttribute('href');

                if (text && text.trim() && text.trim().length < 200) {
                  result.sideMenu.push({
                    text: text.trim(),
                    href: href || 'no-href'
                  });
                  console.log(`     • [${tagName}] ${text.trim()}`);
                }
              } catch (e) {}
            }

            break;
          }
        } catch (e) {}
      }

      // GNB 메뉴 조사
      console.log('\n📋 GNB 메뉴 조사...');

      const gnbSelectors = [
        'nav', '#gnb', '.gnb', '.main-nav', 'header nav'
      ];

      for (const selector of gnbSelectors) {
        try {
          const gnb = page.locator(selector).first();
          if (await gnb.isVisible({ timeout: 2000 })) {
            console.log(`✅ GNB 발견: ${selector}`);

            const menuItems = await gnb.locator('a').all();

            for (const item of menuItems.slice(0, 30)) {
              try {
                const text = await item.textContent();
                const href = await item.getAttribute('href');

                if (text && text.trim() && text.trim().length < 100) {
                  result.mainMenu.push({
                    text: text.trim(),
                    href: href || 'no-href'
                  });
                }
              } catch (e) {}
            }

            break;
          }
        } catch (e) {}
      }

      // 탭 조사
      console.log('\n🏷️ 탭 조사...');

      const tabs = await page.locator('[role="tab"], .tab, .tab-button, [class*="tab"]').all();
      const tabSet = new Set<string>();

      for (const tab of tabs) {
        try {
          const text = await tab.textContent();
          const ariaSelected = await tab.getAttribute('aria-selected');

          if (text && text.trim() && text.trim().length < 100) {
            tabSet.add(text.trim());
          }
        } catch (e) {}
      }

      result.tabs = Array.from(tabSet);
      console.log(`📋 탭 ${result.tabs.length}개 발견`);

      // 버튼 조사
      console.log('\n🔘 버튼 조사...');

      const buttons = await page.locator('button, input[type="submit"], input[type="button"], .btn, a[class*="btn"]').all();
      const buttonSet = new Set<string>();

      for (const btn of buttons.slice(0, 50)) {
        try {
          const text = await btn.textContent();
          if (text && text.trim() && text.trim().length < 150) {
            buttonSet.add(text.trim());
          }
        } catch (e) {}
      }

      result.buttons = Array.from(buttonSet);
      console.log(`🔘 버튼 ${result.buttons.length}개 발견`);

      // 각 사이드바 메뉴 클릭하며 조사
      console.log('\n🔍 각 메뉴 방문하며 조사...');

      const uniqueMenuUrls = new Set<string>();
      for (const menu of result.sideMenu) {
        if (menu.href && menu.href !== 'no-href' && !menu.href.includes('javascript:') && !menu.href.includes('#')) {
          const fullUrl = menu.href.startsWith('http') ? menu.href : `http://localhost${menu.href}`;
          uniqueMenuUrls.add(fullUrl);
        }
      }

      const visitedPages: Array<{url: string; title: string; screenshot: string}> = [];

      for (let i = 0; i < Math.min(Array.from(uniqueMenuUrls).length, 20); i++) {
        const url = Array.from(uniqueMenuUrls)[i];

        try {
          console.log(`\n🌐 ${i + 1}/${Math.min(Array.from(uniqueMenuUrls).length, 20)}: ${url} 방문 중...`);

          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await sleep(2000);

          const pageTitle = await page.title();
          const screenshotFile = `screenshots/menu-${i + 1}-${slugify(pageTitle)}.png`;

          await page.screenshot({ path: screenshotFile, fullPage: true });

          visitedPages.push({
            url,
            title: pageTitle,
            screenshot: screenshotFile
          });

          console.log(`   📄 ${pageTitle}`);

        } catch (e) {
          console.log(`   ❌ 방문 실패: ${url}`);
        }
      }

      // 결과 저장
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      const finalResult = {
        ...result,
        visitedPages,
        timestamp: new Date().toISOString()
      };

      const resultPath = `scripts/asis-admin-complete-${timestamp}.json`;
      fs.writeFileSync(resultPath, JSON.stringify(finalResult, null, 2), 'utf-8');

      console.log(`\n✅ 조사 완료!`);
      console.log(`📄 결과: ${resultPath}`);
      console.log(`📊 통계:`);
      console.log(`   - 메인 메뉴: ${result.mainMenu.length}개`);
      console.log(`   - 사이드 메뉴: ${result.sideMenu.length}개`);
      console.log(`   - 탭: ${result.tabs.length}개`);
      console.log(`   - 버튼: ${result.buttons.length}개`);
      console.log(`   - 위젯: ${result.widgets.length}개`);
      console.log(`   - 방문 페이지: ${visitedPages.length}개`);

    }

    console.log('\n⏸️ 60초 후 브라우저 닫기...');
    await sleep(60000);

    await browser.close();

  } catch (error) {
    console.error('❌ 오류:', error);
    await browser.close();
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

inspectWithCookies().catch(console.error);
