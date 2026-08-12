/**
 * SPEC-FRONT-PARITY-001 M1 — 중복 마크업 해소 실제 렌더 검증.
 *
 * acceptance.md AC-FP-003 / AC-FP-004 / AC-FP-007을 **실제 브라우저 렌더 결과**로
 * 검증한다. 단위 테스트·정적 grep으로는 중복 렌더를 잡을 수 없다는 것이
 * 2026-08-11 실측으로 확인되었기 때문이다(research.md §0).
 *
 * 검증 라우트 3종 (acceptance.md Edge Cases):
 *  - `/`          인덱스 (DefaultLayout 적용)
 *  - `/board`     게시판 목록 (DefaultLayout 적용)
 *  - `/board/[id]` 글 보기 (**DefaultLayout 미적용** — 레이아웃 우회 라우트)
 *
 * 주의: DB를 TRUNCATE 하고 설치 위저드를 처음부터 통과시키므로 실행 시간이 길다.
 */
import { expect, test, type Page } from '@playwright/test';

import { resetDb } from './support/db-reset';

const ADMIN = {
  email: 'admin@e2e.local',
  userId: 'admin',
  password: 'e2e-password-1234',
  nickName: 'admin',
} as const;

/** 설치 위저드 4단계를 통과시킨다 (install-happy-path.spec.ts와 동일 흐름). */
async function completeInstall(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Rhymix-TS 설치' })).toBeVisible();

  // Step 1 — 라이선스 동의
  await page.locator('input[name="accepted"]').check();
  await page.getByRole('button', { name: '다음' }).click();

  // Step 2 — 환경 자가진단
  await expect(page.getByRole('heading', { name: '설치 2단계 — 환경 자가진단' })).toBeVisible({
    timeout: 30_000,
  });
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
  await page.locator('input[name="email"]').fill(ADMIN.email);
  await page.locator('input[name="userId"]').fill(ADMIN.userId);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.locator('input[name="password2"]').fill(ADMIN.password);
  await page.locator('input[name="nickName"]').fill(ADMIN.nickName);
  await page.locator('select[name="timeZone"]').selectOption('Asia/Seoul');
  await page.locator('input[name="useSsl"][value="none"]').check();

  // 알려진 이슈: 마지막 단계의 "설치 완료" 버튼은 Playwright click이 제출을 트리거하지
  // 못한다. form.requestSubmit()으로 직접 제출한다.
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) throw new Error('설치 admin-config 단계에 <form>이 없습니다');
    form.requestSubmit();
  });

  await expect(page).toHaveURL(/\/install\/complete/, { timeout: 90_000 });
}

/**
 * /login 에서 설치 위저드가 만든 admin 계정으로 로그인한다.
 * 이미 인증된 세션이면 /login이 리다이렉트되므로 즉시 반환한다.
 * (admin-2fa-enforcement.spec.ts의 loginAsAdmin과 동일 패턴)
 */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  if (!/\/login/.test(page.url())) return;

  await page
    .locator('input[name="userId"], input[name="username"], input[type="text"]')
    .first()
    .fill(ADMIN.userId);
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(ADMIN.password);
  await page.getByRole('button', { name: /로그인|Login|Sign in/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 });
}

/** AC-FP-003 + AC-FP-004: footer 1개 / main 1개 / main 중첩 0 / 푸터 문구 중복 없음. */
async function assertSingleFooterAndMain(page: Page, label: string): Promise<void> {
  // RSC 스트리밍에서 푸터는 본문 뒤에 도착한다. 도착 전에 세면 0이 나오므로
  // 카운트 전에 푸터가 DOM에 붙을 때까지 기다린다(단언 완화가 아니라 동기화).
  await expect(page.getByTestId('global-footer'), `${label}: 푸터 렌더 대기`).toBeAttached({
    timeout: 15_000,
  });

  const counts = await page.evaluate(() => ({
    footers: document.querySelectorAll('footer').length,
    mains: document.querySelectorAll('main').length,
    nestedMains: document.querySelectorAll('main main').length,
    footerTexts: Array.from(document.querySelectorAll('footer')).map(f =>
      (f.textContent ?? '').replace(/\s+/g, ' ').trim(),
    ),
  }));

  // AC-FP-003: <footer> 정확히 1개
  expect(counts.footers, `${label}: <footer> 개수`).toBe(1);
  // AC-FP-003: 동일 푸터 문구 2회 이상 노출 금지
  expect(
    new Set(counts.footerTexts).size,
    `${label}: 푸터 문구 중복 (${JSON.stringify(counts.footerTexts)})`,
  ).toBe(counts.footerTexts.length);
  // AC-FP-004: <main> 정확히 1개, 중첩 0
  expect(counts.mains, `${label}: <main> 개수`).toBe(1);
  expect(counts.nestedMains, `${label}: <main> 중첩 개수`).toBe(0);
}

test.describe('SPEC-FRONT-PARITY-001 M1 — 중복 마크업 해소', () => {
  // 설치 위저드 4단계 통과에 Argon2id 해싱 포함 ~50초가 걸려 config 기본 60초로는 부족하다.
  // serial 모드로 **설치는 첫 테스트에서 1회만** 수행하고 이후 테스트는 그 상태를
  // 재사용한다 — 검증 대상이 "설치 직후 방문자 화면의 마크업"이라 매 테스트마다
  // 재설치할 이유가 없고, 위저드 3회 반복은 순수 낭비이기 때문이다.
  test.describe.configure({ mode: 'serial', timeout: 240_000 });

  test('설치: 빈 DB에서 위저드 4단계 통과 (이후 테스트의 전제)', async ({ page }) => {
    await page.context().clearCookies();
    await resetDb();
    await completeInstall(page);
  });

  test('AC-FP-003/004: 로그인 상태에서 3개 라우트 모두 footer 1개 · main 1개', async ({ page }) => {
    await loginAsAdmin(page);

    // 1) 인덱스
    await page.goto('/');
    await assertSingleFooterAndMain(page, '/ (로그인)');

    // AC-FP-007: 온보딩 패널이 렌더되며 자체 main/footer를 갖지 않는다
    const onboardingScoped = await page.evaluate(
      () => document.querySelectorAll('.operator-onboarding main, .operator-onboarding footer').length,
    );
    expect(onboardingScoped, '온보딩 패널 내부의 main/footer').toBe(0);

    // 2) 게시판 목록
    await page.goto('/board');
    await assertSingleFooterAndMain(page, '/board (로그인)');

    // 3) 글 보기 — 목록의 첫 글로 진입 (DefaultLayout 미적용 라우트)
    const firstPost = page.locator('table tbody tr a').first();
    await expect(firstPost, '/board 목록에 글이 최소 1건 있어야 함').toBeVisible();
    await firstPost.click();
    await expect(page).toHaveURL(/\/board\/\d+/, { timeout: 15_000 });
    await assertSingleFooterAndMain(page, '/board/[id] (로그인)');
  });

  test('AC-FP-003/004: 비로그인 방문자도 3개 라우트 모두 footer 1개 · main 1개', async ({
    page,
  }) => {
    // 온보딩 패널이 렌더되지 않는 상태에서도 조건이 유지되어야 한다 (Edge Cases)
    await page.context().clearCookies();

    await page.goto('/');
    await assertSingleFooterAndMain(page, '/ (비로그인)');

    await page.goto('/board');
    await assertSingleFooterAndMain(page, '/board (비로그인)');

    const firstPost = page.locator('table tbody tr a').first();
    await expect(firstPost, '/board 목록에 글이 최소 1건 있어야 함').toBeVisible();
    await firstPost.click();
    await expect(page).toHaveURL(/\/board\/\d+/, { timeout: 15_000 });
    await assertSingleFooterAndMain(page, '/board/[id] (비로그인)');
  });

  test('AC-FP-006(c): 항상 렌더되는 attribution 푸터가 3개 라우트 모두에 존재', async ({
    page,
  }) => {
    for (const route of ['/', '/board']) {
      await page.goto(route);
      await expect(
        page.getByTestId('global-footer'),
        `${route}: attribution 푸터`,
      ).toContainText('Powered by Rhymix-TS');
    }

    // 레이아웃 미적용 라우트에서도 푸터가 0개가 되지 않아야 한다 (REQ-FP-006(c))
    await page.goto('/board');
    await page.locator('table tbody tr a').first().click();
    await expect(page).toHaveURL(/\/board\/\d+/, { timeout: 15_000 });
    await expect(
      page.getByTestId('global-footer'),
      '/board/[id]: attribution 푸터',
    ).toContainText('Powered by Rhymix-TS');
  });
});
