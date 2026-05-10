/**
 * E2E-03: SiteLock 503 차단 — REQ-INSTALL-024.
 *
 * - 비-allowlist IP → 503 + 한국어 SiteLock 안내 페이지
 * - allowlist IP (127.0.0.1) → 200
 * - /admin 은 SiteLock bypass (자체 인증 게이트가 별도)
 *
 * x-forwarded-for 헤더로 client IP를 위장하여 proxy.ts의 extractClientIp가
 * allowlist 검사를 수행하게 합니다.
 */
import { expect, test } from '@playwright/test';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';
import { disableSiteLock, enableSiteLock } from './support/sitelock-helper';

test.beforeAll(async () => {
  await resetDb();
  await seedInstalledSite({ scheme: 'http' });
  await enableSiteLock(['127.0.0.1']);
});

test.afterAll(async () => {
  await disableSiteLock();
});

test('the system shall return 503 to a non-allowlisted IP', async ({ request }) => {
  const res = await request.get('/', {
    headers: { 'x-forwarded-for': '198.51.100.1' },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(503);
  const body = await res.text();
  expect(body).toContain('사이트 잠금');
});

test('the system shall pass through to allowlisted IP', async ({ request }) => {
  const res = await request.get('/', {
    headers: { 'x-forwarded-for': '127.0.0.1' },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(200);
});

test('the system shall bypass SiteLock for /admin even when IP is not allowlisted', async ({
  request,
}) => {
  const res = await request.get('/admin', {
    headers: { 'x-forwarded-for': '198.51.100.1' },
    maxRedirects: 0,
  });
  // /admin placeholder는 200, 향후 인증 게이트 도입 시 307 리다이렉트도 허용.
  expect([200, 307]).toContain(res.status());
});
