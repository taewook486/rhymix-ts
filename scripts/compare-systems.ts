/**
 * ASIS vs TOBE Browser Comparison Script
 * Compares Rhymix PHP (localhost) with Rhymix-TS (localhost:3000)
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface ComparisonResult {
  url: string;
  asisStatus: number;
  tobeStatus: number;
  asisScreenshot?: string;
  tobeScreenshot?: string;
  features: {
    asis: string[];
    tobe: string[];
    missing: string[];
  };
  uiElements: {
    asis: string[];
    tobe: string[];
    different: string[];
  };
}

const BASE_DIR = path.join(process.cwd(), 'screenshots');
const ASIS_URL = 'http://localhost/';
const TOBE_URL = 'http://localhost:3000/';

// Pages to compare
const PAGES_TO_COMPARE = [
  { path: '/', name: 'homepage' },
  { path: '/ko', name: 'home_korean' },
  { path: '/ko/documents', name: 'documents_list' },
  { path: '/ko/documents/new', name: 'documents_create' },
  { path: '/ko/boards', name: 'boards_list' },
  { path: '/ko/members/login', name: 'login' },
  { path: '/ko/members/join', name: 'register' },
  { path: '/ko/admin', name: 'admin' },
];

async function setupBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  return { browser, context };
}

async function captureScreenshot(
  page: Page,
  url: string,
  name: string,
  system: 'asis' | 'tobe'
): Promise<string> {
  const dir = path.join(BASE_DIR, system);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  return filename;
}

async function extractUIElements(page: Page): Promise<string[]> {
  const elements = await page.evaluate(() => {
    const selectors = [
      'nav', 'header', 'footer', 'aside',
      'button', 'input', 'select', 'textarea',
      'table', 'form', 'dialog', 'modal',
      '[role="navigation"]', '[role="banner"]',
      '[role="complementary"]', '[role="contentinfo"]'
    ];

    const found: string[] = [];
    selectors.forEach(selector => {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        found.push(`${selector}: ${els.length}`);
      }
    });

    // Get specific interactive elements
    const buttons = document.querySelectorAll('button:not([hidden])');
    const inputs = document.querySelectorAll('input:not([hidden])');
    const links = document.querySelectorAll('a[href]:not([hidden])');

    return [
      ...found,
      `Buttons: ${buttons.length}`,
      `Inputs: ${inputs.length}`,
      `Links: ${links.length}`
    ];
  });

  return elements;
}

async function extractFeatures(page: Page): Promise<string[]> {
  const features = await page.evaluate(() => {
    const featureIndicators = {
      search: !!document.querySelector('input[type="search"], [placeholder*="search" i], [placeholder*="검색" i]'),
      pagination: !!document.querySelector('.pagination, [role="navigation"][aria-label*="pag" i]'),
      breadcrumb: !!document.querySelector('.breadcrumb, nav[aria-label*="breadcrumb" i]'),
      sidebar: !!document.querySelector('aside, [role="complementary"]'),
      notification: !!document.querySelector('.notification, [role="alert"], [aria-live]'),
      dropdown: !!document.querySelector('.dropdown, [role="menu"]'),
      tabs: !!document.querySelector('[role="tablist"], .tabs'),
      modal: !!document.querySelector('[role="dialog"], .modal'),
      editor: !!document.querySelector('.editor, [contenteditable="true"], .wysiwyg'),
      fileUpload: !!document.querySelector('input[type="file"]'),
    };

    return Object.entries(featureIndicators)
      .filter(([_, present]) => present)
      .map(([feature]) => feature);
  });

  return features;
}

async function comparePage(
  asisPage: Page,
  tobePage: Page,
  path: string,
  name: string
): Promise<ComparisonResult> {
  console.log(`\n📊 Comparing: ${name} (${path})`);

  // Navigate to pages
  const asisResponse = await asisPage.goto(`${ASIS_URL}${path}`, { waitUntil: 'networkidle' });
  const tobeResponse = await tobePage.goto(`${TOBE_URL}${path}`, { waitUntil: 'networkidle' });

  const result: ComparisonResult = {
    url: path,
    asisStatus: asisResponse?.status() || 0,
    tobeStatus: tobeResponse?.status() || 0,
    features: { asis: [], tobe: [], missing: [] },
    uiElements: { asis: [], tobe: [], different: [] }
  };

  // Capture screenshots
  try {
    result.asisScreenshot = await captureScreenshot(asisPage, path, name, 'asis');
    result.tobeScreenshot = await captureScreenshot(tobePage, path, name, 'tobe');
  } catch (error) {
    console.log(`  ⚠️  Screenshot capture failed: ${error}`);
  }

  // Extract features
  try {
    result.features.asis = await extractFeatures(asisPage);
    result.features.tobe = await extractFeatures(tobePage);
    result.features.missing = result.features.asis.filter(
      f => !result.features.tobe.includes(f)
    );
  } catch (error) {
    console.log(`  ⚠️  Feature extraction failed: ${error}`);
  }

  // Extract UI elements
  try {
    result.uiElements.asis = await extractUIElements(asisPage);
    result.uiElements.tobe = await extractUIElements(tobePage);
  } catch (error) {
    console.log(`  ⚠️  UI element extraction failed: ${error}`);
  }

  // Log results
  console.log(`  ASIS Status: ${result.asisStatus}`);
  console.log(`  TOBE Status: ${result.tobeStatus}`);
  console.log(`  ASIS Features: ${result.features.asis.join(', ') || 'none'}`);
  console.log(`  TOBE Features: ${result.features.tobe.join(', ') || 'none'}`);

  if (result.features.missing.length > 0) {
    console.log(`  ⚠️  Missing in TOBE: ${result.features.missing.join(', ')}`);
  }

  return result;
}

async function generateReport(results: ComparisonResult[]): Promise<void> {
  const reportPath = path.join(BASE_DIR, 'comparison-report.md');

  let report = '# ASIS vs TOBE Browser Comparison Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**ASIS URL:** ${ASIS_URL}\n`;
  report += `**TOBE URL:** ${TOBE_URL}\n\n`;

  // Summary
  report += '## Summary\n\n';
  const successCount = results.filter(r => r.tobeStatus === 200).length;
  report += `- **Pages Compared:** ${results.length}\n`;
  report += `- **TOBE Success Rate:** ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)\n\n`;

  // Detailed results
  report += '## Detailed Results\n\n';

  for (const result of results) {
    report += `### ${result.url}\n\n`;
    report += `| System | Status | Screenshot |\n`;
    report += `|--------|--------|------------|\n`;
    report += `| ASIS | ${result.asisStatus} | ${result.asisScreenshot || 'N/A'} |\n`;
    report += `| TOBE | ${result.tobeStatus} | ${result.tobeScreenshot || 'N/A'} |\n\n`;

    if (result.features.missing.length > 0) {
      report += `#### Missing Features in TOBE\n\n`;
      result.features.missing.forEach(f => {
        report += `- ⚠️ ${f}\n`;
      });
      report += '\n';
    }

    if (result.uiElements.asis.length > 0 || result.uiElements.tobe.length > 0) {
      report += `#### UI Elements\n\n`;
      report += `**ASIS:**\n`;
      result.uiElements.asis.forEach(e => report += `- ${e}\n`);
      report += `\n**TOBE:**\n`;
      result.uiElements.tobe.forEach(e => report += `- ${e}\n`);
      report += '\n';
    }
  }

  // Missing features summary
  report += '## All Missing Features Summary\n\n';
  const allMissing = results.flatMap(r => r.features.missing);
  const uniqueMissing = [...new Set(allMissing)];

  if (uniqueMissing.length > 0) {
    uniqueMissing.forEach(f => {
      const pages = results.filter(r => r.features.missing.includes(f)).map(r => r.url);
      report += `### ${f}\n`;
      report += `Missing in: ${pages.join(', ')}\n\n`;
    });
  } else {
    report += 'No missing features detected!\n\n';
  }

  // Recommendations
  report += '## Recommendations\n\n';

  if (uniqueMissing.includes('search')) {
    report += '1. **Add Search Functionality**: Implement search bar on relevant pages\n';
  }
  if (uniqueMissing.includes('pagination')) {
    report += '2. **Add Pagination**: Implement pagination for list views\n';
  }
  if (uniqueMissing.includes('breadcrumb')) {
    report += '3. **Add Breadcrumbs**: Implement breadcrumb navigation\n';
  }
  if (uniqueMissing.includes('notification')) {
    report += '4. **Add Notifications**: Implement notification system\n';
  }
  if (uniqueMissing.includes('editor')) {
    report += '5. **Add WYSIWYG Editor**: Implement rich text editor for content creation\n';
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\n📝 Report generated: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting ASIS vs TOBE Browser Comparison\n');

  const { browser, context } = await setupBrowser();

  // Create pages for both systems
  const asisPage = await context.newPage();
  const tobePage = await context.newPage();

  const results: ComparisonResult[] = [];

  for (const pageConfig of PAGES_TO_COMPARE) {
    try {
      const result = await comparePage(
        asisPage,
        tobePage,
        pageConfig.path,
        pageConfig.name
      );
      results.push(result);
    } catch (error) {
      console.error(`❌ Error comparing ${pageConfig.name}:`, error);
    }
  }

  await browser.close();

  // Generate report
  await generateReport(results);

  console.log('\n✅ Comparison complete!');
}

main().catch(console.error);
