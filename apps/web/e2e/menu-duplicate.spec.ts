/**
 * SPEC-LEGACY-PARITY-001 M4 — 메뉴 항목 복제 실측 (AC-SITE-001 UI 배선).
 *
 * 시드는 스펙 밖에서 psql로 넣는다(.moai/state/verify/m4/seed.sql — E4 증거와
 * 동일 픽스처). 이 스펙은 UI 왕복만 담당한다:
 *
 *   /admin/menu/[id] → 원본 행의 [복제] 클릭 → 새 루트 행이 원본 바로 뒤에
 *   등장 → 새로고침 뒤에도 유지(서버 확정).
 *
 * 서브트리 행 수·listOrder 무충돌·버튼 참조형 복사·SQL NULL 의미론은 psql
 * 검증(E4)이 ground truth 로 확정한다 — 여기서 중복 단언하지 않는다.
 *
 * 개발 환경 실행: CI_E2E=1 pnpm test:e2e --grep "PARITY-001 M4"
 */
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

test.skip(process.env.CI_E2E !== '1', '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요)');

/** 설치 기준선 관리자 (seed.sql 과 같은 출처 — 스펙은 시드/철거하지 않는다) */
const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'Rhymix!2026';

/** 시더와 공유하는 제목 — 이 값으로 menu id 를 찾는다 */
const MENU_TITLE = 'M4 Duplicate Menu';
const SRC_TITLE = 'M4-원본';

/** /admin/menu/[id] 라우트 예산 — 실측 8.4분까지(2026-08-17, 동시 점유 환경) */
test.describe.configure({ timeout: 900_000 });

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

test.describe('SPEC-LEGACY-PARITY-001 M4 — 메뉴 항목 복제', () => {
  test('AC-SITE-001: 원본 [복제] 클릭 → 새 루트 행이 원본 뒤 + 새로고침 뒤 유지', async ({
    page,
  }) => {
    const menuId = (
      await query<{ id: number }>(`SELECT id FROM menus WHERE title = $1`, [MENU_TITLE])
    )[0]!.id;
    const srcId = (
      await query<{ id: number }>(`SELECT id FROM menu_items WHERE title = $1`, [SRC_TITLE])
    )[0]!.id;

    await loginAs(page, ADMIN_LOGIN, ADMIN_PASSWORD);
    // 로그인 직후 서버 리다이렉트가 커밋 중이면 곧바로 goto 하면 프레임이
    // 중단된다(net::ERR_ABORTED — 실측). 로드가 끝나길 기다린 뒤 이동한다.
    await page.waitForLoadState('load');
    const menuUrl = `/admin/menu/${menuId}`;
    try {
      await page.goto(menuUrl);
    } catch {
      // 리다이렉트 경합 재현 시 1회 재시도 — 이김 여부가 경합 타이밍에 달린
      // 환경(WSL2 Turbopack 콜드 컴파일)에서 흔하다.
      await page.waitForTimeout(1_000);
      await page.goto(menuUrl);
    }

    // 행 식별 — 페이지 chrome(관리자 사이드바의 ul/li ~25개)과 충돌하지 않도록
    // [복제] 버튼 role 로 행을 센다(단위 테스트 getAllByRole('button', { name: '복제' })
    // 와 동일 계약). 최상위 행 제목 순 — 원본, 형제1, 형제2 (자식은 lazy load 로 접힘)
    const dupButtons = page.getByRole('button', { name: '복제' });
    await expect(dupButtons).toHaveCount(3);

    // 원본 행의 복제 버튼 (행을 "ID: N" 텍스트로 식별해 strict mode 고정)
    const srcRow = page.locator('li').filter({ hasText: `ID: ${srcId}` }).first();
    await srcRow.getByRole('button', { name: '복제' }).click();

    // 복제 후 행 4개: 원본, 사본(새 id), 형제1, 형제2 — 사본은 원본 바로 뒤
    // (낙관적 로컬 삽입 → router.refresh() 서버 확정 순서로 4개가 된다)
    await expect(dupButtons).toHaveCount(4, { timeout: 30_000 });
    // 사본 행 = 같은 제목의 두 번째 행 — 문서 순서상 원본 바로 뒤에 삽입된다
    const copyRow = page.locator('li').filter({ hasText: SRC_TITLE }).nth(1);
    await expect(copyRow.locator('span.flex-1')).toHaveText(SRC_TITLE);
    // 사본은 새 서버 행이다 — 원본 id 와 다른 id 를 가진다
    await expect(copyRow).not.toContainText(`ID: ${srcId} `);

    // 새로고침 뒤에도 유지 — 로컬 상태가 아니라 DB 확정 상태
    await page.reload();
    await expect(dupButtons).toHaveCount(4);
    await expect(page.locator('li').filter({ hasText: SRC_TITLE }).nth(1).locator('span.flex-1')).toHaveText(SRC_TITLE);
  });
});
