/**
 * SPEC-PAGE-001 Slice C — 페이지 모듈 E2E 테스트
 *
 * AC-PAGE-C1: 설치 → default 테마 시드 → page 인스턴스(본문 저장됨) → 도메인 인덱스 지정
 *             → `/` 방문 → HTTP 200 + [data-rhymix-layout="default"] 안에 page 본문 텍스트 확인
 *
 * 전제 조건:
 *  - CI_E2E=1 환경 변수 설정
 *  - DATABASE_URL 환경 변수 설정
 *
 * 개발 환경 실행: CI_E2E=1 pnpm test:e2e --grep "page module"
 *
 * REQ-PAGE-052
 */
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';

// 풀스택 환경(CI_E2E=1)이 없으면 skip
test.skip(
  process.env.CI_E2E !== '1',
  '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요)',
);

const PAGE_BODY_MARKER = 'E2E-PAGE-BODY-MARKER-12345';

/**
 * default 테마 + page 모듈 인스턴스(mcontent 포함)를 시드한다.
 * domain.indexModuleInstanceId를 해당 page 인스턴스로 설정한다.
 */
async function seedPageModuleInstance(siteId: number): Promise<{ moduleInstanceId: number }> {
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
      `INSERT INTO layouts (id, "themeId", name, title, "layoutPath", "layoutType")
       VALUES (gen_random_uuid()::text, $1, 'default', 'Default Layout', 'themes/default/layouts/default', 'DESKTOP')
       ON CONFLICT ("themeId", name, "layoutType") DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [themeId],
    );
    const layoutId = layoutRes.rows[0]!.id;

    // page 모듈 인스턴스 — mcontent에 마커 텍스트 삽입
    const moduleRes = await client.query<{ id: number }>(
      `INSERT INTO module_instances
         ("siteId", "moduleCode", mid, name, "layoutId", mcontent, "updatedAt")
       VALUES ($1, 'page', 'home', '홈 페이지', $2, $3, NOW())
       ON CONFLICT ("siteId", mid) DO UPDATE
         SET "layoutId" = EXCLUDED."layoutId",
             mcontent = EXCLUDED.mcontent,
             "updatedAt" = NOW()
       RETURNING id`,
      [siteId, layoutId, `<p>${PAGE_BODY_MARKER}</p>`],
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

test('page module renders body inside default layout (AC-PAGE-C1)', async ({ page }) => {
  // 1. 설치된 site + domain 시드
  const { siteId } = await seedInstalledSite({ hostname: 'localhost' });

  // 2. default 테마 + page 인스턴스(mcontent 포함) 시드
  await seedPageModuleInstance(siteId);

  // 3. 홈 방문
  const response = await page.goto('/', { waitUntil: 'networkidle' });

  // 4. HTTP 200 확인
  expect(response?.status()).toBe(200);

  // 5. [data-rhymix-layout="default"] 레이아웃 존재 확인
  await expect(page.locator('[data-rhymix-layout="default"]')).toBeVisible();

  // 6. 레이아웃 안에 page 본문 마커 텍스트 존재 확인 (AC-PAGE-C1)
  await expect(
    page.locator('[data-rhymix-layout="default"]'),
  ).toContainText(PAGE_BODY_MARKER);
});
