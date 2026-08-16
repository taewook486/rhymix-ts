/**
 * SPEC-LEGACY-PARITY-001 M3 — 버튼 이미지 전체 범위 실측 (AC-SITE-002/003/010).
 *
 *  1. 관리자 왕복: 3종 파일 업로드 → 저장 → 재진입 미리보기 유지 + DB 저장값이
 *     이미지 참조형({"image": <storageKey>}) — AC-SITE-002. 이후 1종만 제거하면
 *     해당 상태만 NULL, 나머지 2종 유지 — AC-SITE-003.
 *  2. 공개 렌더: normal 이미지 기본 표시(라벨 대체) + hover/active 상태 전환을
 *     실제 CSS opacity로 실측 — AC-SITE-010. naturalWidth 폴링으로 다운로드
 *     라우트가 <img> 컨텍스트에서 실제 이미지를 serve하는지도 함께 검증한다.
 *
 * DB는 테스트 코드가 직접 시드하고(의존성 최소화), 종료 시 설치 기준선을 복원한다.
 * 렌더 테스트용 이미지 파일은 업로드 경로를 우회해 uploads/에 직접 쓴다 — 렌더
 * 검증과 업로드 파이프라인 검증(테스트 1이 담당)을 분리하기 위함이다.
 *
 * 개발 환경 실행: CI_E2E=1 pnpm test:e2e --grep "PARITY-001 M3"
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';

test.skip(process.env.CI_E2E !== '1', '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요)');

const HEADER_NAV = 'nav[aria-label="주 메뉴"]';
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'm3-admin-pass-42';
const BTN_ITEM = 'M3-버튼';
const LABEL_ITEM = 'M3-라벨';
/** 렌더 테스트가 uploads/에 직접 쓰는 키 — 종료 시 철거한다. */
const RENDER_KEYS = ['e2e/m3/normal.png', 'e2e/m3/hover.png', 'e2e/m3/active.png'];
const UPLOADS_DIR = join(process.cwd(), 'uploads');

/** 1x1 투명 PNG (내용은 무의미 — 존재·로드 가능성이 검증 대상) */
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

interface M3Seed {
  siteId: number;
  domainId: number;
  menuId: number;
  btnItemId: number;
}

async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

async function seedM3Fixtures(): Promise<M3Seed> {
  const { siteId } = await seedInstalledSite({ adminPassword: ADMIN_PASSWORD });
  const domainId = (
    await query<{ id: number }>(
      `SELECT id FROM domains WHERE "siteId" = $1 AND "isDefault" = true LIMIT 1`,
      [siteId],
    )
  )[0]!.id;

  const menuId = (
    await query<{ id: number }>(
      `INSERT INTO menus ("siteId", title, "isAdminMenu", "listOrder", "updatedAt")
       VALUES ($1, 'M3 Button Menu', false, 1, NOW()) RETURNING id`,
      [siteId],
    )
  )[0]!.id;

  const insertItem = async (title: string, listOrder: number): Promise<number> =>
    (
      await query<{ id: number }>(
        `INSERT INTO menu_items
          ("menuId", "parentId", title, url, "groupIds", "listOrder", "updatedAt")
         VALUES ($1, NULL, $2, '/', '{}', $3, NOW()) RETURNING id`,
        [menuId, title, listOrder],
      )
    )[0]!.id;

  const btnItemId = await insertItem(BTN_ITEM, 1);
  await insertItem(LABEL_ITEM, 2);

  await query(
    `INSERT INTO menu_slot_assignments ("domainId", slot, "menuId", "updatedAt")
     VALUES ($1, 'HEADER_PRIMARY', $2, NOW())`,
    [domainId, menuId],
  );

  return { siteId, domainId, menuId, btnItemId };
}

async function loginAs(page: Page, userId: string, password: string): Promise<void> {
  await page.goto('/login');
  await page
    .locator('input[name="identifier"], input[name="userId"], input[name="username"], input[type="text"]')
    .first()
    .fill(userId);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /로그인|Login|Sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe('SPEC-LEGACY-PARITY-001 M3 — 버튼 이미지 전체 범위', () => {
  // dev 서버는 라우트를 첫 요청에 컴파일한다. /admin/menu/[id] 는 이 스펙이
  // 처음 열어보는 라우트라 WSL2에서 Turbopack 콜드 컴파일만으로 기본 60초를
  // 넘긴다(측정: 서버 기동 준비에만 114초). 구현 결함이 아니라 환경 비용이므로
  // 이 스펙에 한해 예산을 늘린다 — playwright.config.ts 전역은 그대로 둔다.
  test.describe.configure({ timeout: 240_000 });

  let seed: M3Seed;

  test.beforeEach(async () => {
    await resetDb();
    seed = await seedM3Fixtures();
  });

  // 이 dev DB는 사용자가 localhost:8080 레거시와 비교하는 라이브 환경 — 테스트가
  // 남긴 픽스처를 철거하고 설치 기준선을 복원한다 (menu-parity.spec.ts와 동일).
  test.afterAll(async () => {
    rmSync(join(UPLOADS_DIR, 'e2e'), { recursive: true, force: true });
    await resetDb();
    await seedInstalledSite({
      adminEmail: 'admin@example.com',
      adminPassword: 'Rhymix!2026',
    });
  });

  test('AC-SITE-002/003: 3종 업로드 저장·재진입 표시 + 상태별 제거 격리', async ({
    page,
  }) => {
    await loginAs(page, ADMIN_LOGIN, ADMIN_PASSWORD);
    await page.goto(`/admin/menu/${seed.menuId}`);

    // 저장 완료 판정은 DOM이 아니라 DB(ground truth)를 폴링한다 — 토스트/라우터
    // 갱신 시점과 무관하게 저장 사실 자체를 기다린다.
    const waitForDb = async (sql: string) => {
      await expect
        .poll(async () => (await query<{ v: unknown }>(sql))[0]?.v ?? null, {
          timeout: 30_000,
        })
        .toBeTruthy();
    };

    // 1) 3종 파일 업로드 → 저장
    // 편집기는 항목마다 독립 <form>을 렌더하므로 같은 name 의 입력이 항목 수만큼
    // 존재한다(정상 마크업). 폼을 숨은 id 필드로 이 항목에 고정하지 않으면
    // strict mode 위반이 된다 — 픽스처가 2개 항목을 심기 때문에 실제로 걸린다.
    const form = page.locator('form').filter({
      has: page.locator(`input[name="id"][value="${seed.btnItemId}"]`),
    });
    const png = (name: string) => ({
      name,
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_B64, 'base64'),
    });
    for (const [name, file] of [
      ['normalBtnFile', png('normal.png')],
      ['hoverBtnFile', png('hover.png')],
      ['activeBtnFile', png('active.png')],
    ] as const) {
      await form.locator(`input[name="${name}"]`).setInputFiles(file, { timeout: 10_000 });
    }
    await form.getByRole('button', { name: '저장' }).click();
    await waitForDb(
      `SELECT ("normalBtn"->>'image') IS NOT NULL
         AND ("hoverBtn"->>'image') IS NOT NULL
         AND ("activeBtn"->>'image') IS NOT NULL AS v
       FROM menu_items WHERE id = ${seed.btnItemId}`,
    );

    // 2) 재진입 시 그대로 표시 — 미리보기 3종 (AC-SITE-002 "재진입 시 그대로")
    await page.reload();
    await expect(form.locator('img[data-menu-btn-preview="normal"]')).toHaveCount(1);
    await expect(form.locator('img[data-menu-btn-preview="hover"]')).toHaveCount(1);
    await expect(form.locator('img[data-menu-btn-preview="active"]')).toHaveCount(1);
    await expect(form.locator('img[data-menu-btn-preview="normal"]')).toHaveAttribute(
      'src',
      /\/api\/files\/by-key\//,
    );

    // 3) 1종만 제거 → 해당 상태만 NULL, 나머지 2종 유지 (AC-SITE-003)
    await form.locator('input[name="removeNormalBtn"]').check();
    await form.getByRole('button', { name: '저장' }).click();
    await expect
      .poll(
        async () =>
          (
            await query<{ v: unknown }>(
              `SELECT ("normalBtn" IS NULL) AND ("hoverBtn"->>'image' IS NOT NULL)
                 AND ("activeBtn"->>'image' IS NOT NULL) AS v
               FROM menu_items WHERE id = ${seed.btnItemId}`,
            )
          )[0]?.v,
        { timeout: 30_000 },
      )
      .toBe(true);

    await page.reload();
    await expect(form.locator('img[data-menu-btn-preview="normal"]')).toHaveCount(0);
    await expect(form.locator('img[data-menu-btn-preview="hover"]')).toHaveCount(1);
    await expect(form.locator('img[data-menu-btn-preview="active"]')).toHaveCount(1);
  });

  test('AC-SITE-010: 공개 페이지 normal 기본 + hover/active 상태 전환 실측', async ({
    page,
  }) => {
    // 렌더 검증은 업로드를 우회한다: 이미지 파일을 uploads/에 직접 쓰고 DB에
    // 참조형을 넣는다 — 렌더러의 URL 해석·상태 스위치만을 격리 측정한다.
    mkdirSync(join(UPLOADS_DIR, 'e2e/m3'), { recursive: true });
    for (const key of RENDER_KEYS) {
      writeFileSync(join(UPLOADS_DIR, key), Buffer.from(PNG_B64, 'base64'));
    }
    await query(
      `UPDATE menu_items SET
         "normalBtn" = '{"image":"e2e/m3/normal.png","alt":"소개"}'::jsonb,
         "hoverBtn"  = '{"image":"e2e/m3/hover.png"}'::jsonb,
         "activeBtn" = '{"image":"e2e/m3/active.png"}'::jsonb
       WHERE id = ${seed.btnItemId}`,
    );

    await page.goto('/');
    const link = page.locator(`${HEADER_NAV} a:has(img[data-menu-btn="normal"])`);
    await expect(link).toBeVisible();

    // normal 기본 표시: 이미지가 실제로 로드되고(naturalWidth — 다운로드 라우트가
    // <img> 컨텍스트에서 serve 가능한지까지 실측), 라벨 텍스트는 대체된다.
    const normalImg = link.locator('img[data-menu-btn="normal"]');
    await expect
      .poll(
        async () =>
          normalImg.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    expect((await link.textContent())?.trim()).toBe('');
    await expect(normalImg).toHaveAttribute('alt', '소개');

    // 이미지 없는 항목은 텍스트 라벨 그대로 (M2 보호 분기 — 공존 확인)
    const labelLink = page.locator(`${HEADER_NAV} a:text-is("${LABEL_ITEM}")`);
    await expect(labelLink).toBeVisible();
    await expect(labelLink.locator('img')).toHaveCount(0);

    // hover 전환: opacity 0 → 1 (normal은 1 → 0)
    const hoverImg = link.locator('img[data-menu-btn="hover"]');
    await link.hover();
    await expect
      .poll(async () => hoverImg.evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1');
    await expect
      .poll(async () => normalImg.evaluate((el) => getComputedStyle(el).opacity))
      .toBe('0');

    // active 전환: 마우스를 누르고 있는 동안 active 레이어 (normal은 1 → 0).
    // normal 까지 확인해야 "겹침"이 아니라 "교대"임이 증명된다 — hover만 고치고
    // active에서 두 장이 겹쳐 있으면 절반짜리 수정이다.
    const activeImg = link.locator('img[data-menu-btn="active"]');
    const box = (await link.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect
      .poll(async () => activeImg.evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1');
    await expect
      .poll(async () => normalImg.evaluate((el) => getComputedStyle(el).opacity))
      .toBe('0');
    await page.mouse.up();
  });
});
