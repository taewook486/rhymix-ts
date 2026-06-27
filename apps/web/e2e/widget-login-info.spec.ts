/**
 * SPEC-WIDGET-001 Slice C — login_info 빌트인 위젯 E2E 테스트
 *
 * AC-WIDGET-C1: 페이지 본문(mcontent)에 <rx-widget name="login_info" /> 포함 시
 *   - 익명 사용자: 로그인 폼 또는 /login 링크가 렌더됨
 *   - 인증 사용자: 닉네임이 렌더됨
 *
 * 전제 조건:
 *  - CI_E2E=1 환경 변수 설정
 *  - SPEC-PAGE-001 구현 완료 (page 모듈 mcontent → renderBodyWithWidgets 통합)
 *  - DATABASE_URL 환경 변수 설정
 *
 * 개발 환경 실행: CI_E2E=1 pnpm test:e2e --grep "login_info widget"
 *
 * REQ-WIDGET-074
 */
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';

// 풀스택 환경(CI_E2E=1) + SPEC-PAGE-001 구현이 없으면 skip
test.skip(
  process.env.CI_E2E !== '1',
  '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요). SPEC-PAGE-001 page 모듈 mcontent 렌더링 통합 선행 필요.',
);

/**
 * login_info 위젯 토큰이 포함된 page 모듈 인스턴스 + 레이아웃을 시드한다.
 *
 * - moduleCode: 'page', mcontent: '<rx-widget name="login_info" />'
 * - domain.indexModuleInstanceId를 해당 인스턴스로 설정
 */
async function seedPageWithLoginInfoWidget(siteId: number): Promise<{ moduleInstanceId: number }> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');

    // Theme upsert
    const themeRes = await client.query<{ id: string }>(
      `INSERT INTO themes (id, name, "displayName", version, manifest, "tokensSchema", status, "updatedAt")
       VALUES (gen_random_uuid()::text, 'default', 'Default Theme', '1.0.0', '{}', '{}', 'INSTALLED', NOW())
       ON CONFLICT (name) DO UPDATE SET manifest = EXCLUDED.manifest, "updatedAt" = NOW()
       RETURNING id`,
    );
    const themeId = themeRes.rows[0]!.id;

    // Layout upsert
    const layoutRes = await client.query<{ id: string }>(
      `INSERT INTO layouts (id, "themeId", name, title, "layoutPath", "layoutType", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'default', 'Default Layout', 'themes/default/layouts/default', 'DESKTOP', NOW())
       ON CONFLICT ("themeId", name, "layoutType") DO UPDATE SET title = EXCLUDED.title, "updatedAt" = NOW()
       RETURNING id`,
      [themeId],
    );
    const layoutId = layoutRes.rows[0]!.id;

    // page 모듈 인스턴스 — mcontent에 login_info 위젯 토큰 삽입
    const moduleRes = await client.query<{ id: number }>(
      `INSERT INTO module_instances
         ("siteId", "moduleCode", mid, name, "layoutId", mcontent, "updatedAt")
       VALUES ($1, 'page', 'home', '홈 페이지', $2, $3, NOW())
       ON CONFLICT ("siteId", mid) DO UPDATE
         SET "layoutId" = EXCLUDED."layoutId",
             mcontent = EXCLUDED.mcontent,
             "updatedAt" = NOW()
       RETURNING id`,
      [siteId, layoutId, '<rx-widget name="login_info" />'],
    );
    const moduleInstanceId = moduleRes.rows[0]!.id;

    // Domain에 indexModuleInstanceId 설정
    await client.query(
      `UPDATE domains SET "indexModuleInstanceId" = $1 WHERE "siteId" = $2`,
      [moduleInstanceId, siteId],
    );

    await client.query('COMMIT');
    return { moduleInstanceId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

test.beforeEach(async () => {
  await resetDb();
});

test('login_info 위젯: 익명 사용자에게 로그인 폼 또는 링크 렌더 (AC-WIDGET-C1)', async ({ page }) => {
  // 1. 설치된 site + domain 시드
  const { siteId } = await seedInstalledSite({ hostname: 'localhost' });

  // 2. login_info 위젯이 포함된 page 모듈 인스턴스 시드
  await seedPageWithLoginInfoWidget(siteId);

  // 3. 홈 방문 (미인증 상태)
  const response = await page.goto('/', { waitUntil: 'networkidle' });

  // 4. HTTP 200 확인
  expect(response?.status()).toBe(200);

  // 5. 로그인 폼 또는 /login 링크 존재 확인 (REQ-WIDGET-032 익명 분기)
  const loginFormCount = await page.locator('form[action*="login"], form[method]').count();
  const loginLinkCount = await page.locator('a[href*="/login"]').count();
  expect(
    loginFormCount > 0 || loginLinkCount > 0,
    '로그인 폼 또는 /login 링크가 렌더되지 않았습니다',
  ).toBe(true);
});

test('login_info 위젯: 인증 사용자에게 닉네임 렌더 (AC-WIDGET-C1)', async ({ page }) => {
  // 1. 설치된 site + domain + admin 사용자 시드
  const { siteId } = await seedInstalledSite({
    hostname: 'localhost',
    adminUserId: 'testadmin',
    adminEmail: 'testadmin@e2e.local',
  });

  // 2. login_info 위젯이 포함된 page 모듈 인스턴스 시드
  await seedPageWithLoginInfoWidget(siteId);

  // 3. 로그인 후 홈 방문
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="id"], input[type="text"]', 'testadmin');
  await page.fill('input[name="password"], input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10_000 });

  const response = await page.goto('/', { waitUntil: 'networkidle' });

  // 4. HTTP 200 확인
  expect(response?.status()).toBe(200);

  // 5. 닉네임 표시 확인 (REQ-WIDGET-032 인증 분기)
  await expect(
    page.locator('[data-widget="login_info"] >> text=testadmin, text=testadmin').first(),
  ).toBeVisible({ timeout: 10_000 });
});
