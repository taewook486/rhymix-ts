/**
 * 뉴버전(rhymix-ts) 설치 마법사 자동 진행 스크립트.
 *
 * 목적: 초기화된 PostgreSQL 위에 레거시와 **동일한 관리자 계정·사이트명**으로 설치해
 *       두 버전의 화면 비교 기준선을 맞춘다.
 *
 * 선택자 출처: e2e/install-happy-path.spec.ts (기존 통과 테스트) — 값만 교체했다.
 *
 * 실행: pnpm dlx tsx e2e/reset-baseline/install-new.ts
 */

import { chromium } from '@playwright/test';

const BASE_URL = process.env.NEW_BASE_URL ?? 'http://localhost:3000';

const ADMIN = {
  email: 'admin@example.com',
  userId: 'admin',
  password: 'Rhymix!2026',
  nickName: 'admin',
};

const DB = {
  host: '127.0.0.1',
  port: '5444',
  user: 'rhymix',
  pass: 'rhymix',
  database: 'rhymix_ts',
  schema: 'public',
};

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'ko-KR' } as never);
  page.setDefaultTimeout(90_000);

  try {
    // 1단계 — 라이선스 동의
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    console.log(`[1/4] 라이선스 — URL: ${page.url()}`);
    await page.locator('input[name="accepted"]').check();
    await page.getByRole('button', { name: '다음' }).click();

    // 2단계 — 환경 자가진단
    await page.waitForURL(/\/install\/(diagnostics|check)/, { timeout: 90_000 }).catch(() => undefined);
    console.log(`[2/4] 환경 자가진단 — URL: ${page.url()}`);
    await page.locator('table tbody tr').first().waitFor({ timeout: 90_000 });
    await page.getByRole('button', { name: '다음' }).click();

    // 3단계 — DB 접속 정보
    await page.waitForURL(/\/install\/db-config/, { timeout: 90_000 });
    console.log(`[3/4] DB 접속 정보 — URL: ${page.url()}`);
    await page.locator('input[name="host"]').fill(DB.host);
    await page.locator('input[name="port"]').fill(DB.port);
    await page.locator('input[name="user"]').fill(DB.user);
    await page.locator('input[name="pass"]').fill(DB.pass);
    await page.locator('input[name="database"]').fill(DB.database);
    await page.locator('input[name="schema"]').fill(DB.schema);
    await page.getByRole('button', { name: '검증 후 다음' }).click();

    // 4단계 — 관리자 + 사이트 옵션
    await page.waitForURL(/\/install\/admin-config/, { timeout: 90_000 });
    console.log(`[4/4] 관리자 계정 — URL: ${page.url()}`);
    await page.locator('input[name="email"]').fill(ADMIN.email);
    await page.locator('input[name="userId"]').fill(ADMIN.userId);
    await page.locator('input[name="password"]').fill(ADMIN.password);
    await page.locator('input[name="password2"]').fill(ADMIN.password);
    await page.locator('input[name="nickName"]').fill(ADMIN.nickName);
    await page.locator('select[name="timeZone"]').selectOption('Asia/Seoul');
    await page.locator('input[name="useSsl"][value="none"]').check();
    await page.getByRole('button', { name: '설치 완료' }).click();

    // 완료 확인
    await page.waitForURL(/\/install\/complete/, { timeout: 180_000 });
    const heading = await page.locator('h1, h2').first().textContent();
    console.log(`[완료] ${page.url()} — "${(heading ?? '').trim()}"`);
  } catch (err) {
    console.error(`[실패] 현재 URL: ${page.url()}`);
    const body = await page.locator('body').textContent().catch(() => '');
    console.error(`[화면 문구] ${(body ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)}`);
    await page.screenshot({ path: 'e2e/reset-baseline/new-install-failed.png', fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[설치 실패]', err instanceof Error ? err.message : err);
  process.exit(1);
});
