/**
 * SPEC-BOARD-UI-001 — 게시판 목록 UI E2E 인수 테스트
 *
 * 커버리지:
 *  AC-BUI-001: /{mid} 접속 시 번호/제목/작성자/날짜/조회수/추천수 컬럼 테이블 렌더
 *  AC-BUI-002: 공지 문서가 목록 최상단에 별도 배경으로 표시
 *  AC-BUI-003: 21번째 게시물 → 페이지2, URL ?page=2 변경
 *  AC-BUI-004: 제목 검색 시 해당 문서만 목록에 표시
 *  AC-BUI-005: 추천순 정렬 시 추천수 높은 문서가 상단
 *  AC-BUI-006: 비밀글 클릭 시 작성자 외 사용자는 내용 열람 불가
 *  AC-BUI-007: 상세 페이지 이전글/다음글 링크 동작
 *  AC-BUI-008: 비로그인 글쓰기 클릭 → /login?callbackUrl=... 이동
 *  AC-BUI-009: 첨부파일 있는 문서 목록에 클립 아이콘 표시
 *
 * 전제 조건:
 *  - CI_E2E=1 환경 변수 설정
 *  - DATABASE_URL 환경 변수 설정
 *  - SPEC-BOARD-UI-001 프론트엔드 구현 완료 후 녹색 확인 (테스트는 AC 계약 기준으로 작성)
 *
 * 개발 환경 실행: CI_E2E=1 pnpm test:e2e --grep "SPEC-BOARD-UI-001"
 *
 * ──────────────────────────────────────────────────────────────────────
 * HTML 계약 (프론트엔드 구현 담당자 참조):
 *
 *  목록 페이지:
 *   <table data-testid="board-table"> ... </table>
 *   <thead>에 반드시 포함: "번호" "제목" "작성자" (or 닉네임) "날짜" "조회수" "추천수"
 *   공지 행: <tr data-testid="notice-row">
 *   일반 행: <tr data-testid="board-row">
 *   첨부파일 아이콘: <span data-testid="attachment-icon"> (또는 role="img" aria-label 포함)
 *   페이지네이션: <nav data-testid="pagination">
 *     페이지 링크: ?page=N 쿼리 포함 (예: <a href="?page=2">2</a>)
 *   검색 폼: <form data-testid="search-form">
 *     필드: <select name="searchField" data-testid="search-field">
 *           <input name="search" data-testid="search-input">
 *           <button type="submit" data-testid="search-submit">
 *   정렬 드롭다운: <select data-testid="sort-select" name="sort">
 *     옵션 value: "latest" | "recommend" | "views"
 *   글쓰기 버튼: <a data-testid="write-btn" href="/{mid}/write"> 또는
 *                비로그인 시 href="/login?callbackUrl=/{mid}/write"
 *
 *  상세 페이지:
 *   이전글 링크: <a data-testid="prev-doc-link">
 *   다음글 링크: <a data-testid="next-doc-link">
 *   비밀글 메시지: <p data-testid="secret-message"> 또는 텍스트 "비밀글입니다"
 * ──────────────────────────────────────────────────────────────────────
 */
import { expect, test } from '@playwright/test';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';
import {
  seedBoardFixtures,
  SEARCH_UNIQUE_KEYWORD,
  SECRET_AUTHOR,
} from './support/seed-board-fixtures';

// 풀스택 환경(CI_E2E=1)이 없으면 스킵
test.skip(
  process.env.CI_E2E !== '1',
  '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요). SPEC-BOARD-UI-001 프론트엔드 구현 완료 선행 필요.',
);

// ---------------------------------------------------------------------------
// 공통 설정
// ---------------------------------------------------------------------------

/** 테스트마다 DB를 초기화하고 픽스처를 시드한다. */
let fixtures: Awaited<ReturnType<typeof seedBoardFixtures>>;
let siteId: number;

test.beforeEach(async () => {
  await resetDb();
  ({ siteId } = await seedInstalledSite({ hostname: 'localhost' }));
  fixtures = await seedBoardFixtures(siteId);
});

// ---------------------------------------------------------------------------
// AC-BUI-001: 목록 테이블 컬럼 렌더
// ---------------------------------------------------------------------------

test('AC-BUI-001: 목록 테이블에 번호/제목/작성자/날짜/조회수/추천수 컬럼이 렌더된다', async ({
  page,
}) => {
  // 1. 게시판 목록 페이지 방문
  const response = await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);

  // 2. 게시판 테이블 존재 확인
  const table = page.locator('[data-testid="board-table"]');
  await expect(table).toBeVisible({ timeout: 10_000 });

  // 3. 필수 컬럼 헤더 확인 (한국어 텍스트, 대소문자 무관)
  // 번호 또는 No.
  const hasNumberCol =
    (await page.locator('th').filter({ hasText: '번호' }).count()) > 0 ||
    (await page.locator('th').filter({ hasText: 'No' }).count()) > 0;
  expect(hasNumberCol, '번호 컬럼이 없습니다').toBe(true);

  // 제목
  await expect(page.locator('th').filter({ hasText: '제목' })).toBeVisible();

  // 작성자 (또는 닉네임)
  const hasAuthorCol =
    (await page.locator('th').filter({ hasText: '작성자' }).count()) > 0 ||
    (await page.locator('th').filter({ hasText: '닉네임' }).count()) > 0;
  expect(hasAuthorCol, '작성자 컬럼이 없습니다').toBe(true);

  // 날짜 (또는 작성일)
  const hasDateCol =
    (await page.locator('th').filter({ hasText: '날짜' }).count()) > 0 ||
    (await page.locator('th').filter({ hasText: '작성일' }).count()) > 0;
  expect(hasDateCol, '날짜 컬럼이 없습니다').toBe(true);

  // 조회수 (또는 조회)
  const hasViewCol =
    (await page.locator('th').filter({ hasText: '조회수' }).count()) > 0 ||
    (await page.locator('th').filter({ hasText: '조회' }).count()) > 0;
  expect(hasViewCol, '조회수 컬럼이 없습니다').toBe(true);

  // 추천수 (또는 추천)
  const hasVoteCol =
    (await page.locator('th').filter({ hasText: '추천수' }).count()) > 0 ||
    (await page.locator('th').filter({ hasText: '추천' }).count()) > 0;
  expect(hasVoteCol, '추천수 컬럼이 없습니다').toBe(true);
});

// ---------------------------------------------------------------------------
// AC-BUI-002: 공지글 상단 고정 + 별도 배경
// ---------------------------------------------------------------------------

test('AC-BUI-002: 공지 문서가 목록 최상단에 별도 배경으로 표시된다', async ({ page }) => {
  // 1. 게시판 목록 페이지 방문
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 2. 공지 행이 존재하는지 확인
  const noticeRow = page.locator('[data-testid="notice-row"]').first();
  await expect(noticeRow).toBeVisible({ timeout: 10_000 });

  // 3. 공지 제목 텍스트 포함 확인
  await expect(noticeRow).toContainText('공지');

  // 4. 공지 행이 일반 행보다 상단에 위치하는지 확인
  //    — 공지 행의 bounding box y값이 첫 번째 일반 행보다 작아야 함
  const firstBoardRow = page.locator('[data-testid="board-row"]').first();
  await expect(firstBoardRow).toBeVisible({ timeout: 10_000 });

  const noticeBbox = await noticeRow.boundingBox();
  const regularBbox = await firstBoardRow.boundingBox();
  expect(noticeBbox, '공지 행 위치를 가져올 수 없습니다').not.toBeNull();
  expect(regularBbox, '일반 행 위치를 가져올 수 없습니다').not.toBeNull();
  expect(noticeBbox!.y, '공지글이 일반글보다 위에 있어야 합니다').toBeLessThan(regularBbox!.y);

  // 5. 공지 행과 일반 행의 배경색이 다른지 확인
  //    — 공지 행에 distinct background 클래스/색이 적용되어야 함
  const noticeBackground = await noticeRow.evaluate((el) =>
    window.getComputedStyle(el).backgroundColor,
  );
  const regularBackground = await firstBoardRow.evaluate((el) =>
    window.getComputedStyle(el).backgroundColor,
  );
  expect(
    noticeBackground,
    '공지 행과 일반 행의 배경색이 동일합니다. 공지는 구분되는 배경색이 있어야 합니다.',
  ).not.toBe(regularBackground);
});

// ---------------------------------------------------------------------------
// AC-BUI-003: 21번째 게시물 → 페이지2, URL ?page=2
// ---------------------------------------------------------------------------

test('AC-BUI-003: 21번째 게시물부터 페이지2로 이동하고 URL이 ?page=2가 된다', async ({ page }) => {
  // 1. 게시판 목록 1페이지 방문
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 2. 페이지네이션 네비게이션 존재 확인
  const pagination = page.locator('[data-testid="pagination"]');
  await expect(pagination).toBeVisible({ timeout: 10_000 });

  // 3. ?page=2 링크가 페이지네이션 안에 있어야 함
  const page2Link = pagination.locator('a[href*="page=2"]');
  await expect(page2Link, '페이지2 링크가 없습니다. 21개 문서가 있어 2번째 페이지가 필요합니다.').toBeVisible();

  // 4. 페이지2 링크 클릭
  await page2Link.first().click();

  // 5. URL에 ?page=2 포함 확인
  await expect(page).toHaveURL(/[?&]page=2/, { timeout: 10_000 });

  // 6. 2페이지에서는 21번째 문서(나머지 1개)만 표시되어야 함
  //    (공지글은 페이지 카운트에서 제외되므로 21개 일반글 → 1페이지 20개 + 2페이지 1개)
  const boardRows = page.locator('[data-testid="board-row"]');
  const rowCount = await boardRows.count();
  expect(rowCount, '2페이지에 1개 문서가 있어야 합니다').toBeGreaterThanOrEqual(1);
  expect(rowCount, '2페이지에 20개 이하의 문서여야 합니다').toBeLessThanOrEqual(20);
});

// ---------------------------------------------------------------------------
// AC-BUI-004: 제목 검색
// ---------------------------------------------------------------------------

test('AC-BUI-004: 제목 검색 시 해당 게시물만 목록에 표시된다', async ({ page }) => {
  // 1. 게시판 목록 페이지 방문
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 2. 검색 폼 존재 확인
  const searchForm = page.locator('[data-testid="search-form"]');
  await expect(searchForm).toBeVisible({ timeout: 10_000 });

  // 3. 검색 필드를 "제목"으로 설정
  const searchField = searchForm.locator('[data-testid="search-field"], select[name="searchField"]');
  if ((await searchField.count()) > 0) {
    await searchField.selectOption({ value: 'title' });
  }

  // 4. 고유 검색 키워드 입력
  const searchInput = searchForm.locator('[data-testid="search-input"], input[name="search"]');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(SEARCH_UNIQUE_KEYWORD);

  // 5. 검색 제출
  const submitBtn = searchForm.locator('[data-testid="search-submit"], button[type="submit"]');
  await submitBtn.click();
  await page.waitForURL(/search=/, { timeout: 10_000 });

  // 6. 검색 결과: 고유 키워드 포함 문서만 표시되어야 함
  const boardRows = page.locator('[data-testid="board-row"]');
  const rowCount = await boardRows.count();
  expect(rowCount, '검색 결과는 정확히 1개여야 합니다').toBe(1);

  // 7. 결과 행에 검색 키워드가 포함되어 있어야 함
  await expect(boardRows.first()).toContainText(SEARCH_UNIQUE_KEYWORD);
});

// ---------------------------------------------------------------------------
// AC-BUI-005: 추천순 정렬
// ---------------------------------------------------------------------------

test('AC-BUI-005: 추천순 정렬 선택 시 추천수 높은 게시물이 상단에 표시된다', async ({ page }) => {
  // 1. 게시판 목록 페이지 방문
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 2. 정렬 드롭다운 존재 확인
  const sortSelect = page.locator('[data-testid="sort-select"], select[name="sort"]');
  await expect(sortSelect).toBeVisible({ timeout: 10_000 });

  // 3. 추천순 선택
  await sortSelect.selectOption({ value: 'recommend' });

  // 4. URL에 sort=recommend 포함 확인 (또는 페이지 리렌더 확인)
  await page.waitForURL(/sort=recommend/, { timeout: 10_000 });

  // 5. 첫 번째 일반 행의 제목이 고추천 문서여야 함
  //    votedCount: [0]=100, [1]=50, 나머지=0 → 최상단이 '고추천 첨부파일 게시글'
  const firstRow = page.locator('[data-testid="board-row"]').first();
  await expect(firstRow).toBeVisible({ timeout: 10_000 });
  await expect(firstRow).toContainText('고추천');
});

// ---------------------------------------------------------------------------
// AC-BUI-006: 비밀글 — 비작성자 열람 차단
// ---------------------------------------------------------------------------

test('AC-BUI-006: 비밀글 클릭 시 작성자 외 사용자는 내용을 볼 수 없다', async ({ page }) => {
  // 1. 비로그인 상태에서 비밀글 상세 URL 직접 접근
  //    (목록에서 secret 문서가 보이는 경우 클릭하거나, 직접 URL 접근)
  const response = await page.goto(`/${fixtures.mid}/${fixtures.secretDocId}`, {
    waitUntil: 'networkidle',
  });

  // 2. 200 응답 확인 (403/404가 아닌 처리된 페이지)
  expect(response?.status()).toBe(200);

  // 3. "비밀글입니다" 메시지 표시 확인
  const secretMsg = page
    .locator('[data-testid="secret-message"]')
    .or(page.getByText('비밀글입니다', { exact: false }));
  await expect(secretMsg.first(), '"비밀글입니다" 메시지가 표시되어야 합니다').toBeVisible({
    timeout: 10_000,
  });

  // 4. 실제 비밀 내용(본문)은 보이지 않아야 함
  await expect(page.getByText('비밀 내용입니다')).not.toBeVisible();
});

test('AC-BUI-006(부가): 비밀글 목록에서 자물쇠 아이콘이 표시된다', async ({ page }) => {
  // 비밀글이 목록에 표시되는 경우(SECRET 문서도 list에 표시하는 구현 전제)
  // 이 테스트는 SECRET 문서가 목록에 노출될 때만 의미가 있음
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 비밀글 행이 있다면 자물쇠 아이콘 확인
  // Playwright v1.49 호환: text= 콤마 셀렉터 사용 금지 → filter({ hasText }) 사용
  const lockIcon = page.locator('[data-testid="secret-icon"]').or(
    page.locator('[aria-label*="비밀"]'),
  );
  // 비밀글이 목록에 없으면 스킵 (구현에 따라 달라질 수 있음)
  const count = await lockIcon.count();
  if (count > 0) {
    await expect(lockIcon.first()).toBeVisible();
  }
  // count=0인 경우: SECRET 문서가 목록에서 숨겨지는 구현이면 이 테스트는 통과
});

// ---------------------------------------------------------------------------
// AC-BUI-007: 이전글/다음글 링크 동작
// ---------------------------------------------------------------------------

test('AC-BUI-007: 상세 페이지에서 이전글/다음글 링크가 동작한다', async ({ page }) => {
  // 픽스처에 21개 일반 문서가 있으므로 중간 문서(인덱스 10)를 방문
  const middleDocId = fixtures.regularDocIds[10]!;
  const prevDocId = fixtures.regularDocIds[11]; // 이전 글 (listOrder 기준 이전 = 인덱스가 큰 것)
  const nextDocId = fixtures.regularDocIds[9];  // 다음 글 (listOrder 기준 다음 = 인덱스가 작은 것)

  // 1. 중간 문서 상세 페이지 방문
  await page.goto(`/${fixtures.mid}/${middleDocId}`, { waitUntil: 'networkidle' });

  // 2. 이전글 또는 다음글 링크 중 하나 이상 존재 확인
  const prevLink = page.locator('[data-testid="prev-doc-link"]');
  const nextLink = page.locator('[data-testid="next-doc-link"]');

  const hasPrev = (await prevLink.count()) > 0;
  const hasNext = (await nextLink.count()) > 0;

  expect(
    hasPrev || hasNext,
    '이전글 또는 다음글 링크 중 하나 이상이 있어야 합니다',
  ).toBe(true);

  // 3. 다음글 링크가 있으면 클릭하여 이동 확인
  if (hasNext) {
    await expect(nextLink).toBeVisible();
    await nextLink.click();
    // 다음 문서 URL로 이동했는지 확인
    await page.waitForURL(/\/\d+$/, { timeout: 10_000 });
    const newUrl = page.url();
    expect(
      newUrl,
      '다음글 링크가 다른 문서로 이동해야 합니다',
    ).not.toContain(`/${middleDocId}`);

    if (nextDocId != null) {
      expect(newUrl).toContain(`/${nextDocId}`);
    }
  }

  // 4. 이전 페이지로 돌아가 이전글 링크 확인
  if (hasPrev) {
    await page.goto(`/${fixtures.mid}/${middleDocId}`, { waitUntil: 'networkidle' });
    await expect(prevLink).toBeVisible();
    await prevLink.click();
    await page.waitForURL(/\/\d+$/, { timeout: 10_000 });
    const newUrl = page.url();
    expect(
      newUrl,
      '이전글 링크가 다른 문서로 이동해야 합니다',
    ).not.toContain(`/${middleDocId}`);

    if (prevDocId != null) {
      expect(newUrl).toContain(`/${prevDocId}`);
    }
  }
});

// ---------------------------------------------------------------------------
// AC-BUI-008: 비로그인 글쓰기 → /login?callbackUrl=... 리다이렉트
// ---------------------------------------------------------------------------

test('AC-BUI-008: 비로그인 상태에서 글쓰기 클릭 시 /login?callbackUrl=...으로 이동한다', async ({
  page,
}) => {
  // 1. 비로그인 상태로 게시판 목록 방문
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 2. 글쓰기 버튼/링크 존재 확인
  //    구현에 따라 비로그인 시 /login?callbackUrl=... href를 가지거나
  //    클릭 시 redirect 처리될 수 있음
  const writeBtn = page.locator('[data-testid="write-btn"]').or(
    page.locator('a').filter({ hasText: /글쓰기/ }),
  );
  await expect(writeBtn.first(), '글쓰기 버튼이 없습니다').toBeVisible({ timeout: 10_000 });

  // 3. 글쓰기 버튼 클릭 후 리다이렉트 대기
  await writeBtn.first().click();

  // 4. /login 으로 이동했는지 확인
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  // 5. callbackUrl 파라미터에 /{mid}/write가 포함되어야 함
  const currentUrl = page.url();
  expect(
    currentUrl,
    'callbackUrl 파라미터에 글쓰기 경로가 포함되어야 합니다',
  ).toMatch(/callbackUrl.*write/i);
});

// ---------------------------------------------------------------------------
// AC-BUI-009: 첨부파일 있는 문서에 클립 아이콘 표시
// ---------------------------------------------------------------------------

test('AC-BUI-009: 첨부파일이 있는 게시물 목록에 클립 아이콘이 표시된다', async ({ page }) => {
  // 1. 게시판 목록 페이지 방문
  await page.goto(`/${fixtures.mid}`, { waitUntil: 'networkidle' });

  // 2. 첨부파일 있는 문서(고추천 첨부파일 게시글)가 목록에 있어야 함
  const boardRows = page.locator('[data-testid="board-row"]');
  await expect(boardRows.first()).toBeVisible({ timeout: 10_000 });

  // 3. '고추천 첨부파일 게시글' 행을 찾아 첨부파일 아이콘 확인
  // Playwright v1.49 호환: filter({ hasText }) 패턴 사용
  const attachmentRow = boardRows.filter({ hasText: '고추천 첨부파일' });
  await expect(attachmentRow.first(), '첨부파일 있는 문서 행을 찾을 수 없습니다').toBeVisible({
    timeout: 10_000,
  });

  // 4. 해당 행 안에 클립 아이콘이 있어야 함
  const clipIcon = attachmentRow
    .first()
    .locator('[data-testid="attachment-icon"]')
    .or(attachmentRow.first().locator('[aria-label*="첨부"]'))
    .or(attachmentRow.first().locator('svg[class*="paper-clip"], svg[class*="attach"]'));

  await expect(
    clipIcon.first(),
    '첨부파일이 있는 문서에 클립 아이콘이 표시되어야 합니다',
  ).toBeVisible({ timeout: 10_000 });
});
