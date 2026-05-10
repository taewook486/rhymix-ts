/**
 * E2E-01: 설치 위저드 happy path — REQ-INSTALL-001/011/012/013/014.
 *
 * 빈 DB → 4단계 위저드 통과 → /install/complete 도달 → /admin 진입까지 검증.
 *
 * 주의:
 *  - DB가 매 테스트 전에 TRUNCATE 됩니다 (resetDb).
 *  - Turbopack 첫 컴파일 + Argon2id 해싱이 최대 60초까지 걸릴 수 있어 타임아웃은
 *    config의 60초를 그대로 사용합니다.
 */
import { expect, test } from '@playwright/test';

import { resetDb } from './support/db-reset';

test.beforeEach(async () => {
  await resetDb();
});

test('the system shall complete a fresh install through all four steps', async ({ page }) => {
  // 1. 루트 진입 → /install로 리다이렉트
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Rhymix-TS 설치' })).toBeVisible();
  await expect(page.getByText('1 / 4 단계 — 라이선스 동의')).toBeVisible();
  expect(page.url()).toContain('/install');

  // Step 1 — 라이선스 동의
  await page.locator('input[name="accepted"]').check();
  await page.getByRole('button', { name: '다음' }).click();

  // Step 2 — 환경 자가진단
  await expect(page.getByRole('heading', { name: '설치 2단계 — 환경 자가진단' })).toBeVisible({
    timeout: 30_000,
  });
  // 적어도 1행 이상 진단 결과가 노출되어야 함 (DiagnosticsTable).
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();

  // Step 3 — DB 접속 정보
  await expect(page).toHaveURL(/\/install\/db-config/);
  await page.locator('input[name="host"]').fill('127.0.0.1');
  await page.locator('input[name="port"]').fill('5444');
  await page.locator('input[name="user"]').fill('rhymix');
  await page.locator('input[name="pass"]').fill('rhymix');
  await page.locator('input[name="database"]').fill('rhymix_ts');
  await page.locator('input[name="schema"]').fill('public');
  await page.getByRole('button', { name: '검증 후 다음' }).click();

  // Step 4 — 관리자 + 사이트 옵션
  await expect(page).toHaveURL(/\/install\/admin-config/);
  await page.locator('input[name="email"]').fill('admin@e2e.local');
  await page.locator('input[name="userId"]').fill('admin');
  await page.locator('input[name="password"]').fill('e2e-password-1234');
  await page.locator('input[name="password2"]').fill('e2e-password-1234');
  await page.locator('input[name="nickName"]').fill('admin');
  await page.locator('select[name="timeZone"]').selectOption('Asia/Seoul');
  // SSL 미사용 (개발/로컬) — happy path에서 HSTS는 별도 단위 테스트로 검증.
  await page.locator('input[name="useSsl"][value="none"]').check();
  // SiteLock 미사용
  await page.getByRole('button', { name: '설치 완료' }).click();

  // 완료 화면
  await expect(page).toHaveURL(/\/install\/complete/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: '설치가 완료되었습니다.' })).toBeVisible();

  // /admin placeholder 도달
  await page.getByRole('link', { name: '관리자 대시보드로 이동' }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole('heading', { name: '관리자 대시보드 — 구현 예정' })).toBeVisible();
});
