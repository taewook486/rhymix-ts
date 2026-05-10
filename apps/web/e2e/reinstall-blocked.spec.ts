/**
 * E2E-02: 재설치 차단 — REQ-INSTALL-023, REQ-INSTALL-001(반대 방향).
 *
 * 이미 설치된 상태에서:
 *  - /install → 410 Gone
 *  - / 일반 라우트 → 200 (리다이렉트 없음)
 *  - /install/complete → 200/304 (1회성 환영 예외)
 *
 * 빠른 시드를 위해 위저드 대신 raw SQL로 site/admin을 직접 INSERT 합니다.
 */
import { expect, test } from '@playwright/test';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';

test.beforeAll(async () => {
  await resetDb();
  await seedInstalledSite({ scheme: 'http' });
});

test('the system shall return 410 when the wizard is accessed after install', async ({
  request,
}) => {
  const res = await request.get('/install', { maxRedirects: 0 });
  expect(res.status()).toBe(410);
});

test('the system shall pass through ordinary routes after install without redirecting to /install', async ({
  page,
}) => {
  const response = await page.goto('/');
  // / 페이지는 200으로 응답해야 하며 /install로 리다이렉트되면 안 됨.
  expect(response?.status()).toBe(200);
  expect(page.url()).not.toContain('/install');
});

test('the system shall allow /install/complete after install for one-shot welcome', async ({
  request,
}) => {
  const res = await request.get('/install/complete', { maxRedirects: 0 });
  // SSR 페이지는 200, 캐시 적중 시 304 도 허용.
  expect([200, 304]).toContain(res.status());
});
