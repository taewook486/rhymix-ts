import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'screenshots-detailed');
const ASIS_URL = 'http://localhost/';
const TOBE_URL = 'http://localhost:3000/';

// Detailed page list with ASIS query parameters
const PAGES = [
  { name: 'homepage', asis: '/', tobe: '/' },
  { name: 'board_list', asis: '/?mid=board', tobe: '/ko/boards' },
  { name: 'login', asis: '/board/login', tobe: '/ko/signin' },
  { name: 'admin', asis: '/?module=admin', tobe: '/ko/admin' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  const results = [];

  for (const page of PAGES) {
    console.log(`\n📊 Comparing: ${page.name}`);

    // ASIS
    const asisPage = await context.newPage();
    await asisPage.goto(`${ASIS_URL}${page.asis}`, { waitUntil: 'networkidle' });
    await asisPage.screenshot({ path: path.join(BASE_DIR, 'asis', `${page.name}.png`), fullPage: true });

    // Extract ASIS info
    const asisInfo = await asisPage.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      hasNav: !!document.querySelector('nav'),
      hasForm: !!document.querySelector('form'),
      hasTable: !!document.querySelector('table'),
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      links: document.querySelectorAll('a').length,
    }));
    console.log(`  ASIS: ${asisInfo.title} | Nav: ${asisInfo.hasNav} | Form: ${asisInfo.hasForm}`);

    await asisPage.close();

    // TOBE
    const tobePage = await context.newPage();
    const tobeResponse = await tobePage.goto(`${TOBE_URL}${page.tobe}`, { waitUntil: 'networkidle' }).catch(() => null);
    await tobePage.screenshot({ path: path.join(BASE_DIR, 'tobe', `${page.name}.png`), fullPage: true });

    // Extract TOBE info
    const tobeInfo = await tobePage.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      hasNav: !!document.querySelector('nav'),
      hasForm: !!document.querySelector('form'),
      hasTable: !!document.querySelector('table'),
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      links: document.querySelectorAll('a').length,
    }));
    console.log(`  TOBE: ${tobeInfo.title} | Nav: ${tobeInfo.hasNav} | Form: ${tobeInfo.hasForm}`);

    await tobePage.close();

    results.push({ page: page.name, asis: asisInfo, tobe: tobeInfo });
  }

  await browser.close();

  // Save results
  fs.writeFileSync(path.join(BASE_DIR, 'comparison-results.json'), JSON.stringify(results, null, 2));
  console.log('\n✅ Detailed comparison complete!');
}

main().catch(console.error);
