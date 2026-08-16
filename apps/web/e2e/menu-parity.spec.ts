/**
 * SPEC-LEGACY-PARITY-001 M2 — 승계 3동작 특성화 (AC-SITE-004/005/006).
 *
 * 특성화 테스트는 첫 실행부터 GREEN이다 — 고정 대상은 2026-08-16 M1 실측으로
 * 확인된 **현행** 동작이다 (research.md §3.0, Q3 포함):
 *
 *  1. groupIds ACL — 제한 항목은 그룹 소속자에게만 렌더 (REQ-SITE-004)
 *  2. 중첩 트리 3단계 전 깊이 렌더 (REQ-SITE-005)
 *  3. HEADER_PRIMARY / FOOTER / UTILITY 3슬롯 동시 배정·렌더 (REQ-SITE-006)
 *
 * 픽스처는 전부 테스트 코드가 직접 시드한다 — M1이 dev DB에 손으로 넣은 행
 * (M1-*)에 의존하지 않는다. resetDb()가 매 테스트 전 public 스키마 전체를
 * TRUNCATE하므로 dev DB의 어떤 선행 상태도 테스트 결과에 영향을 줄 수 없다.
 *
 * ACL 테스트의 방문 순서는 캐싱 가드다 (Q3 — "요청마다 ACL 계산" 경계의 지킴이):
 * 인증 렌더 → 비로그인 재방문 순으로 왕복하며, 어느 방향의 풀라우트 캐싱이
 * ACL 결과를 가려도 실패한다.
 *
 * 개발 환경 실행: CI_E2E=1 pnpm test:e2e --grep "SPEC-LEGACY-PARITY-001"
 */
import { expect, test, type Browser, type Page } from '@playwright/test';
import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';
import {
  listAssignedSlots,
  MENU_TITLES,
  PLAIN_LOGIN,
  PLAIN_PASSWORD,
  seedMenuParityFixtures,
  STAFF_LOGIN,
  STAFF_PASSWORD,
  type SeedMenuParityResult,
} from './support/seed-menu-parity-fixtures';

// 풀스택 환경(dev 서버 + DB)이 없으면 skip한다.
test.skip(process.env.CI_E2E !== '1', '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요)');

const HEADER_NAV = 'nav[aria-label="주 메뉴"]';
const FOOTER = 'footer[data-testid="global-footer"]';

/** 로그인 폼을 통한 자격 증명 로그인 (notification.spec.ts의 검증된 패턴). */
async function loginAs(page: Page, userId: string, password: string): Promise<void> {
  await page.goto('/login');
  // 로그인 폼의 실제 필드명은 "identifier"다 (app/(auth)/login/page.tsx).
  // 뒤의 후보들은 하위 호환용 폴백 — 첫 후보가 항상 이긴다.
  await page
    .locator('input[name="identifier"], input[name="userId"], input[name="username"], input[type="text"]')
    .first()
    .fill(userId);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /로그인|Login|Sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe('SPEC-LEGACY-PARITY-001 M2 — 승계 3동작 특성화', () => {
  let seed: SeedMenuParityResult;

  test.beforeEach(async () => {
    await resetDb();
    seed = await seedMenuParityFixtures();
  });

  // 테스트가 남긴 M2 픽스처 철거 후, 최소한의 설치 상태를 복원한다.
  // 이 dev DB는 사용자가 localhost:8080 레거시와 화면을 비교하는 라이브 환경이다 —
  // 빈 DB로 두면 앱 전체가 설치 마법사로 302 리다이렉트된다. beforeEach의
  // resetDb()는 테스트 격리에 필요하므로 유지하되, 종료 시 wipe만 남기지 않는다.
  // (관리자 계정은 비교 기준선 install-new.ts와 동일한 admin / Rhymix!2026.)
  test.afterAll(async () => {
    await resetDb();
    await seedInstalledSite({
      adminEmail: 'admin@example.com',
      adminPassword: 'Rhymix!2026',
    });
  });

  test('AC-SITE-004: groupIds ACL — 미소속·비로그인 숨김, 소속 표시', async ({
    page,
    browser,
  }) => {
    const restricted = `a:text-is("${MENU_TITLES.restricted}")`;
    const control = `a:text-is("${MENU_TITLES.control}")`;

    // 열람자(뷰어)마다 독립 브라우저 컨텍스트를 쓴다 — 하나의 컨텍스트에서
    // clearCookies()로 로그아웃을 흉내 내면, 진행 중이던 /api/auth/session 폴링이
    // 롤링된 authjs.session-token을 Set-Cookie로 되살려 세션을 조용히 복구한다
    // (NextAuth v5 JWT 롤링 경쟁 — admin-2fa-enforcement.spec.ts와 같은 결론).
    // 비로그인 뷰어는 fixture page(한 번도 로그인하지 않는 컨텍스트)가 담당한다.
    const anonVisible = async (anonPage: Page): Promise<void> => {
      await expect(anonPage.locator(`${HEADER_NAV} ${control}`)).toBeVisible();
      await expect(anonPage.locator(`${HEADER_NAV} ${restricted}`)).toHaveCount(0);
    };

    // 1) 비로그인 — 제한 항목은 렌더되지 않고, 공개 항목은 렌더된다
    await page.goto('/');
    await anonVisible(page);

    // 2) 소속(M2 Staff) 로그인 — 제한 항목이 렌더된다.
    //    1)의 비로그인 렌더가 캐시돼 있어도 소속자에게는 보여야 한다 (역방향 가드).
    const staffCtx = await browser.newContext();
    const staffPage = await staffCtx.newPage();
    await loginAs(staffPage, STAFF_LOGIN, STAFF_PASSWORD);
    await staffPage.goto('/');
    await expect(staffPage.locator(`${HEADER_NAV} ${control}`)).toBeVisible();
    await expect(staffPage.locator(`${HEADER_NAV} ${restricted}`)).toBeVisible();

    // 3) 미소속 로그인 — 로그인 자체로는 열리지 않는다. 조건은 그룹 소속이다.
    const plainCtx = await browser.newContext();
    const plainPage = await plainCtx.newPage();
    await loginAs(plainPage, PLAIN_LOGIN, PLAIN_PASSWORD);
    await plainPage.goto('/');
    await expect(plainPage.locator(`${HEADER_NAV} ${control}`)).toBeVisible();
    await expect(plainPage.locator(`${HEADER_NAV} ${restricted}`)).toHaveCount(0);

    // 4) 비로그인 재방문 — 2)·3)의 인증 렌더 이후에도 비로그인에게 제한 항목은
    //    렌더되지 않는다 (정방향 가드, Q3). fixture page은 로그인 이력이 없어
    //    세션 쿠키가 없다 — 별도 조작 없이 진짜 비로그인 상태다.
    await page.goto('/');
    await anonVisible(page);

    await staffCtx.close();
    await plainCtx.close();
  });

  test('AC-SITE-005: 중첩 트리 3단계 전 깊이 렌더 (비로그인·로그인 동일)', async ({
    page,
  }) => {
    // li > a(트리상) + ul > li > a(트리중) + ul > li > a(트리하) — 전체 사슬을
    // 하나의 구조적 로케이터로 고정한다. 재귀가 끊기면(깊이 1 강제 등) 사슬이
    // 해소되지 않아 실패한다.
    const grandchild = page.locator(
      `${HEADER_NAV} li:has(> a:text-is("${MENU_TITLES.treeTop}"))` +
        ` > ul li:has(> a:text-is("${MENU_TITLES.treeMid}"))` +
        ` > ul a:text-is("${MENU_TITLES.treeBottom}")`,
    );

    await page.goto('/');
    await expect(page.locator(`${HEADER_NAV} a:text-is("${MENU_TITLES.treeTop}")`)).toBeVisible();
    await expect(grandchild).toBeVisible();

    // 로그인 상태에서도 동일하게 전 깊이가 렌더된다
    await loginAs(page, STAFF_LOGIN, STAFF_PASSWORD);
    await page.goto('/');
    await expect(grandchild).toBeVisible();
  });

  test('AC-SITE-006: 3슬롯 동시 배정 저장 + 공개 페이지 3곳 렌더', async ({ page }) => {
    // 저장 검증 — 배정 3종이 모두 존재 (INSERT 성공 자체가 @@unique 위반 0건).
    // ORDER BY slot은 Postgres enum 선언 순서(HEADER_PRIMARY→FOOTER→UTILITY)를
    // 따르므로 정렬 후 멤버십을 비교한다 — 고정 대상은 '3종 동시 배정'이지
    // 열거 순서가 아니다.
    const slots = await listAssignedSlots(seed.domainId);
    expect([...slots].sort()).toEqual(['FOOTER', 'HEADER_PRIMARY', 'UTILITY']);

    // 렌더 검증 — 헤더·푸터·유틸리티 3곳에 서로 다른 메뉴가 동시에 렌더된다
    await page.goto('/');
    const nav = page.locator(HEADER_NAV);
    const footer = page.locator(FOOTER);
    await expect(nav.locator(`a:text-is("${MENU_TITLES.control}")`)).toBeVisible();
    await expect(footer.locator(`a:text-is("${MENU_TITLES.footer}")`)).toBeVisible();

    // 유틸리티 항목은 페이지에 렌더되되 헤더 nav도 푸터도 아닌 세 번째 영역에 있다
    // (toContainLocator는 이 레포의 @playwright/test 1.59.1에 없다 — toHaveCount로)
    const utilLink = page.locator(`a:text-is("${MENU_TITLES.utility}")`);
    await expect(utilLink).toBeVisible();
    await expect(nav.locator(`a:text-is("${MENU_TITLES.utility}")`)).toHaveCount(0);
    await expect(footer.locator(`a:text-is("${MENU_TITLES.utility}")`)).toHaveCount(0);
  });
});
