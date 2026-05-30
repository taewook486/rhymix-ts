/**
 * SPEC-LAYOUT-001 Slice C — DefaultLayout E2E 테스트.
 *
 * AC-LAYOUT-C1: 도메인 홈 방문 시 HTTP 200 + [data-rhymix-layout="default"] 요소 + footer 텍스트 존재 확인.
 *
 * 전제 조건:
 *  - default 테마가 DB에 시드되어 있어야 함
 *  - domain에 indexModuleInstanceId가 설정되어 있어야 함
 *  - x-domain-id 헤더가 proxy에서 주입되어야 함
 *
 * 풀스택 환경(CI_E2E=1)이 없으면 skip한다.
 * 개발 환경에서 실행하려면: CI_E2E=1 pnpm test:e2e --grep "default layout"
 *
 * REQ-LAYOUT-052
 */
import { expect, test } from '@playwright/test';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';
import { Client } from 'pg';

// 풀스택 환경이 아니면 skip
test.skip(
  process.env.CI_E2E !== '1',
  '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요)',
);

/**
 * DB에 default 테마 + 레이아웃 + 모듈 인스턴스 + 도메인 indexModuleInstanceId를 시드한다.
 */
async function seedDefaultThemeAndModule(siteId: number): Promise<{ moduleInstanceId: number }> {
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

    // ModuleInstance (board 모듈 사용 — board는 항상 등록된 모듈)
    const moduleRes = await client.query<{ id: number }>(
      `INSERT INTO module_instances ("siteId", "moduleCode", mid, name, "layoutId", "updatedAt")
       VALUES ($1, 'board', 'home', '홈 게시판', $2, NOW())
       ON CONFLICT ("siteId", mid) DO UPDATE SET "layoutId" = EXCLUDED."layoutId", "updatedAt" = NOW()
       RETURNING id`,
      [siteId, layoutId],
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

test('default layout renders on domain home', async ({ page }) => {
  // 1. 설치된 site + domain 시드
  const { siteId } = await seedInstalledSite({ hostname: 'localhost' });

  // 2. default 테마 + 모듈 인스턴스 시드
  await seedDefaultThemeAndModule(siteId);

  // 3. 도메인 홈 방문
  const response = await page.goto('/', { waitUntil: 'networkidle' });

  // 4. HTTP 200 확인
  expect(response?.status()).toBe(200);

  // 5. [data-rhymix-layout="default"] 요소 존재 확인 (AC-LAYOUT-C1)
  await expect(page.locator('[data-rhymix-layout="default"]')).toBeVisible();

  // 6. footer 텍스트 존재 확인 (AC-LAYOUT-C1)
  await expect(page.locator('footer')).toContainText('Powered by Rhymix-TS');
});
