/**
 * ASIS Rhymix Admin Complete Crawler
 * 모든 관리자 페이지를 순회하며 모든 메뉴, 버튼, 탭을 완전 조사
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface MenuItem {
  text: string;
  href?: string;
  clicked?: boolean;
  children?: MenuItem[];
}

interface PageData {
  url: string;
  title: string;
  heading?: string;
  menus: MenuItem[];
  tabs: string[];
  buttons: string[];
  forms: any[];
  content?: string;
  screenshot?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlASISAdmin(): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  const visitedUrls = new Set<string>();
  const pageDataList: PageData[] = [];
  const screenshotsDir = 'screenshots/asis-crawl';

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('🌐 http://localhost/ 접속 중...');
  await page.goto('http://localhost/', { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(2000);

  // 로그인
  console.log('\n🔐 로그인 중...');

  // 로그인 폼 찾기
  const loginSelectors = {
    userId: [
      'input[name="user_id"]',
      'input[name="uid"]',
      'input[type="text"].inputId',
      '#user_id'
    ],
    password: [
      'input[name="password"]',
      'input[type="password"]',
      '#password'
    ],
    submit: [
      'input[type="submit"]',
      'button[type="submit"]',
      'button:has-text("로그인")',
      '.btnLogin'
    ]
  };

  // ID 입력
  for (const selector of loginSelectors.userId) {
    try {
      await page.fill(selector, 'comfit99@naver.com', { timeout: 1000 });
      console.log('✅ ID 입력 성공');
      break;
    } catch (e) {}
  }

  await sleep(500);

  // PW 입력
  for (const selector of loginSelectors.password) {
    try {
      await page.fill(selector, 'rhymix123', { timeout: 1000 });
      console.log('✅ PW 입력 성공');
      break;
    } catch (e) {}
  }

  await sleep(500);

  // 로그인 버튼 클릭
  for (const selector of loginSelectors.submit) {
    try {
      await page.click(selector, { timeout: 1000 });
      console.log('✅ 로그인 버튼 클릭');
      await sleep(3000);
      break;
    } catch (e) {}
  }

  // 첫 페이지 저장
  await savePageData(page, pageDataList, screenshotsDir, visitedUrls, 0);

  // 관리자 페이지 직접 접근 시도
  console.log('\n🔍 관리자 페이지 접근 시도...');

  const adminUrls = [
    'http://localhost/?module=admin',
    'http://localhost/index.php?module=admin',
    'http://localhost/admin',
    'http://localhost/admin/index.php'
  ];

  let adminUrl = '';
  for (const url of adminUrls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await sleep(2000);

      const title = await page.title();
      const bodyText = await page.locator('body').textContent();

      if (title.includes('Admin') || title.includes('관리자') ||
          bodyText?.includes('모듈') || bodyText?.includes('설정') || bodyText?.includes('게시판')) {
        adminUrl = url;
        console.log(`✅ 관리자 페이지 접속: ${url}`);
        break;
      }
    } catch (e) {
      console.log(`❌ 접속 실패: ${url}`);
    }
  }

  if (!adminUrl) {
    console.log('⚠️ 관리자 페이지 직접 접근 실패, 링크 찾기...');

    // 관리자 링크 찾기
    const adminLink = page.locator('a:has-text("관리자"), a[href*="admin"], a[href*="module=admin"]').first();
    try {
      await adminLink.click({ timeout: 5000 });
      await sleep(3000);
      adminUrl = page.url();
      console.log(`✅ 관리자 링크 클릭: ${adminUrl}`);
    } catch (e) {
      console.log('❌ 관리자 링크 찾기 실패');
    }
  }

  // 관리자 페이지 저장
  if (adminUrl) {
    await savePageData(page, pageDataList, screenshotsDir, visitedUrls, 1);

    // 모든 관리자 메뉴 링크 수집
    console.log('\n🔍 관리자 메뉴 링크 수집 중...');

    const menuLinks = await page.locator('a[href]').all();
    const linksToVisit: string[] = [];

    for (const link of menuLinks) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();

        if (href && text && href.startsWith('/') && !href.includes('#') &&
            !href.includes('act=disp') && !href.includes('logout') &&
            text.trim().length > 0 && text.trim().length < 100) {
          const fullUrl = new URL(href, 'http://localhost').href;
          if (!visitedUrls.has(fullUrl)) {
            linksToVisit.push(fullUrl);
          }
        }
      } catch (e) {}
    }

    console.log(`📋 방문할 링크: ${linksToVisit.length}개`);

    // 각 링크 방문 (최대 30개)
    for (let i = 0; i < Math.min(linksToVisit.length, 30); i++) {
      const url = linksToVisit[i];

      if (visitedUrls.has(url)) continue;

      console.log(`\n🌐 ${i + 1}/${Math.min(linksToVisit.length, 30)}: ${url} 방문 중...`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await sleep(2000);

        await savePageData(page, pageDataList, screenshotsDir, visitedUrls, i + 2);

      } catch (e) {
        console.log(`❌ 방문 실패: ${url}`);
      }
    }
  }

  // 결과 저장
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const resultPath = `scripts/asis-crawl-${timestamp}.json`;

  fs.writeFileSync(resultPath, JSON.stringify(pageDataList, null, 2), 'utf-8');

  console.log('\n✅ 크롤링 완료!');
  console.log(`📄 결과: ${resultPath}`);
  console.log(`📊 통계:`);
  console.log(`   - 방문 페이지: ${pageDataList.length}개`);
  console.log(`   - 스크린샷: ${pageDataList.filter(p => p.screenshot).length}개`);

  // 요약 보고서 생성
  generateSummaryReport(pageDataList, timestamp);

  console.log('\n⏸️ 30초 후 브라우저 닫기...');
  await sleep(30000);

  await browser.close();
}

async function savePageData(
  page: Page,
  pageDataList: PageData[],
  screenshotsDir: string,
  visitedUrls: Set<string>,
  index: number
): Promise<void> {
  const url = page.url();
  const title = await page.title();

  if (visitedUrls.has(url)) return;
  visitedUrls.add(url);

  console.log(`   📄 ${title}`);

  const pageData: PageData = {
    url,
    title,
    menus: [],
    tabs: [],
    buttons: [],
    forms: []
  };

  // 스크린샷
  try {
    const filename = `${String(index + 1).padStart(3, '0')}-${slugify(title)}.png`;
    const screenshotPath = path.join(screenshotsDir, filename);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    pageData.screenshot = screenshotPath;
  } catch (e) {}

  // 헤딩
  try {
    const heading = page.locator('h1, h2, .h1, .page-header, .admin-header').first();
    if (await heading.isVisible()) {
      pageData.heading = await heading.textContent() || undefined;
    }
  } catch (e) {}

  // 메뉴 링크
  try {
    const menuLinks = await page.locator('nav a, .menu a, .sidebar a, aside a').all();
    for (const link of menuLinks.slice(0, 30)) {
      try {
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        if (text && text.trim() && text.trim().length < 100) {
          pageData.menus.push({ text: text.trim(), href: href || undefined });
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 탭
  try {
    const tabs = await page.locator('[role="tab"], .tab, .tab-button').all();
    for (const tab of tabs) {
      try {
        const text = await tab.textContent();
        if (text && text.trim()) {
          pageData.tabs.push(text.trim());
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 버튼
  try {
    const buttons = await page.locator('button, input[type="submit"], input[type="button"], .btn').all();
    for (const btn of buttons.slice(0, 30)) {
      try {
        const text = await btn.textContent();
        if (text && text.trim() && text.trim().length < 100) {
          pageData.buttons.push(text.trim());
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 폼
  try {
    const forms = await page.locator('form').all();
    for (const form of forms) {
      try {
        const action = await form.getAttribute('action');
        const method = await form.getAttribute('method');
        const inputs = await form.locator('input, select, textarea').all();

        const fields: any[] = [];
        for (const input of inputs.slice(0, 20)) {
          try {
            const name = await input.getAttribute('name');
            const type = await input.getAttribute('type');
            if (name) {
              fields.push({ name, type: type || 'text' });
            }
          } catch (e) {}
        }

        if (fields.length > 0) {
          pageData.forms.push({ action: action || '', method: method || 'POST', fields });
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 페이지 내용 요약
  try {
    const content = await page.locator('main, .content, .admin-content, #content').first();
    if (await content.isVisible()) {
      const text = await content.textContent();
      pageData.content = text?.slice(0, 500) || '';
    }
  } catch (e) {}

  pageDataList.push(pageData);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

function generateSummaryReport(pageDataList: PageData[], timestamp: string): void {
  let report = '# ASIS Rhymix Admin Structure Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- Total Pages Visited: ${pageDataList.length}\n`;
  report += `- Screenshots Taken: ${pageDataList.filter(p => p.screenshot).length}\n\n`;

  // 모든 고유 메뉴 수집
  const allMenus = new Map<string, Set<string>>();

  for (const page of pageDataList) {
    for (const menu of page.menus) {
      const key = menu.href || 'no-href';
      if (!allMenus.has(key)) {
        allMenus.set(key, new Set());
      }
      allMenus.get(key)!.add(menu.text);
    }
  }

  report += `## Unique Menu Items (${allMenus.size})\n\n`;

  for (const [href, texts] of allMenus) {
    const textList = Array.from(texts).join(', ');
    report += `- ${href}: ${textList}\n`;
  }

  report += `\n## Page Details\n\n`;

  for (let i = 0; i < pageDataList.length; i++) {
    const page = pageDataList[i];
    report += `### ${i + 1}. ${page.title}\n\n`;
    report += `**URL:** ${page.url}\n\n`;

    if (page.heading) {
      report += `**Heading:** ${page.heading}\n\n`;
    }

    if (page.menus.length > 0) {
      report += `**Menus (${page.menus.length}):**\n`;
      for (const menu of page.menus.slice(0, 20)) {
        report += `- ${menu.text} -> ${menu.href || 'N/A'}\n`;
      }
      report += `\n`;
    }

    if (page.tabs.length > 0) {
      report += `**Tabs (${page.tabs.length}):** ${page.tabs.join(', ')}\n\n`;
    }

    if (page.buttons.length > 0) {
      report += `**Buttons (${page.buttons.length}):** ${page.buttons.slice(0, 10).join(', ')}`;
      if (page.buttons.length > 10) report += '...';
      report += `\n\n`;
    }

    if (page.screenshot) {
      report += `**Screenshot:** ${page.screenshot}\n\n`;
    }

    report += `---\n\n`;
  }

  const reportPath = `scripts/asis-crawl-summary-${timestamp}.md`;
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 요약 보고서: ${reportPath}`);
}

// 실행
crawlASISAdmin()
  .then(() => {
    console.log('\n🎉 완전 조사 완료!');
  })
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
