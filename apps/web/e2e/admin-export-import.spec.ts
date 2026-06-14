/**
 * E2E: Admin Export/Import Round-Trip — SPEC-ADMIN-EXTRAS-001 REQ-092.
 *
 * 시나리오:
 *  1. export 페이지에서 bundle 다운로드(트리거) 가능 확인
 *  2. import 페이지 dryRun — 유효한 bundle 업로드 시 plan 표시됨
 *  3. import 페이지 — 잘못된 JSON은 파싱 에러 표시
 *
 * 주의:
 *  - resetDb() + 설치 위저드 전체를 매 테스트 전에 실행합니다.
 *  - export 다운로드는 JS Blob URL 방식(JS anchor click)이므로
 *    Playwright page.waitForEvent('download')가 동작하지 않습니다.
 *    대신 export mutation 성공 시 toast "내보내기 완료"가 노출되는 것으로 확인합니다.
 *  - import dryRun은 서버에 tRPC 요청을 보내므로 admin 세션이 필요합니다.
 *    설치 완료 후 /admin 접근이 가능한 상태여야 합니다.
 */
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { resetDb } from './support/db-reset';

// ---------------------------------------------------------------------------
// 공통 헬퍼 — install + admin 세션 확보
// ---------------------------------------------------------------------------

/**
 * 설치 위저드 전체를 수행하여 admin 계정을 만들고 /admin 에 접근된 상태로 만듭니다.
 * 각 테스트는 이 함수를 호출하여 준비 완료 상태를 확보합니다.
 */
async function setupInstalledAdminSession(page: import('@playwright/test').Page): Promise<void> {
  // 1. 루트 진입 → /install 리다이렉트
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
  await page.locator('input[name="email"]').fill('admin@e2e.local');
  await page.locator('input[name="userId"]').fill('admin');
  await page.locator('input[name="password"]').fill('e2e-password-1234');
  await page.locator('input[name="password2"]').fill('e2e-password-1234');
  await page.locator('input[name="nickName"]').fill('admin');
  await page.locator('select[name="timeZone"]').selectOption('Asia/Seoul');
  await page.locator('input[name="useSsl"][value="none"]').check();
  await page.getByRole('button', { name: '설치 완료' }).click();

  // 완료 화면 대기
  await expect(page).toHaveURL(/\/install\/complete/, { timeout: 60_000 });

  // /admin 진입 — 세션이 install 과정에서 설정됨
  await page.getByRole('link', { name: '관리자 대시보드로 이동' }).click();
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * 유효한 최소 export bundle JSON을 생성합니다.
 *
 * bundle-schema.ts 의 adminExportBundleSchema 를 만족하는 최솟값:
 *  - metadata.version: "1.0.0" (SUPPORTED_VERSIONS[0])
 *  - metadata.exportedAt: ISO 날짜 문자열
 *  - metadata.format: "partial"
 *  - selection: 모두 false
 *  - entityCounts: 모두 0
 *  - bundleSizeBytes: 0
 *
 * dryRun은 version check 통과 후 빈 bundle에 대해 빈 plan을 반환합니다.
 */
function buildMinimalValidBundle(): string {
  const bundle = {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        actorId: 1,
        nickname: 'e2e-test',
      },
      sourceSiteId: 1,
      sourceSiteTitle: 'E2E Test Site',
      format: 'partial',
      selection: {
        menu: false,
        moduleInstances: false,
        documents: { include: false },
        comments: { include: false },
        siteSettings: false,
      },
      entityCounts: {
        menus: 0,
        menuItems: 0,
        moduleInstances: 0,
        documents: 0,
        comments: 0,
      },
      bundleSizeBytes: 0,
    },
    menus: [],
    moduleInstances: [],
    documents: [],
    comments: [],
  };
  return JSON.stringify(bundle, null, 2);
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

test.beforeEach(async () => {
  await resetDb();
});

test('export 페이지에서 bundle 다운로드 가능', async ({ page }) => {
  // 1. 설치 완료 + admin 세션 확보
  await setupInstalledAdminSession(page);

  // 2. export 페이지 이동
  await page.goto('/admin/settings/export');
  await expect(page.getByRole('heading', { name: '내보내기 (Export)' })).toBeVisible();

  // 3. export form 노출 확인 — 체크박스와 내보내기 버튼이 있어야 함
  await expect(page.getByRole('button', { name: /내보내기/ })).toBeVisible();

  // 4. 기본 선택 상태 (메뉴, 모듈 인스턴스, 사이트 설정 체크됨)으로 내보내기 실행
  //    JS Blob URL 다운로드이므로 waitForEvent('download')는 사용 불가.
  //    mutation 성공 시 toast "내보내기 완료"가 노출되는 것으로 성공 확인.
  await page.getByRole('button', { name: /내보내기/ }).click();

  // 5. toast 알림 또는 성공 상태 확인 (sonner toast는 aria role="status" 또는 data-testid 없음)
  //    "내보내는 중..." 텍스트가 잠깐 나타났다가 "내보내기 완료" toast로 변경됨.
  //    toast 라이브러리(sonner)가 생성하는 요소를 기다림.
  await expect(page.getByText('내보내기 완료')).toBeVisible({ timeout: 15_000 });
});

test('import 페이지 dryRun — 유효한 bundle 업로드 시 plan 표시됨', async ({ page }) => {
  // 1. 설치 완료 + admin 세션 확보
  await setupInstalledAdminSession(page);

  // 2. import 페이지 이동
  await page.goto('/admin/settings/import');
  await expect(page.getByRole('heading', { name: '가져오기 (Import)' })).toBeVisible();

  // 3. 유효한 bundle JSON을 임시 파일로 저장 후 업로드
  const bundleJson = buildMinimalValidBundle();
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `e2e-bundle-${Date.now()}.json`);
  await fs.writeFile(tmpFile, bundleJson, 'utf-8');

  try {
    // 4. 파일 업로드 — input[type="file"]에 직접 set
    await page.locator('input[type="file"]').setInputFiles(tmpFile);

    // 5. 파싱 성공 메시지 확인
    await expect(page.getByText('파일이 정상적으로 파싱되었습니다.')).toBeVisible();

    // 6. "미리 보기 (Dry Run)" 버튼 클릭
    await page.getByRole('button', { name: /미리 보기/ }).click();

    // 7. dryRun 결과 — "가져오기 미리 보기 결과" 헤딩 노출 확인
    await expect(page.getByText('가져오기 미리 보기 결과')).toBeVisible({ timeout: 15_000 });

    // 8. 요약 카드 4개(생성/업데이트/건너뜀/오류)가 렌더됨
    await expect(page.getByText('생성')).toBeVisible();
    await expect(page.getByText('업데이트')).toBeVisible();
    await expect(page.getByText('건너뜀')).toBeVisible();
    await expect(page.getByText('오류')).toBeVisible();
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('import 페이지 — 잘못된 JSON은 파싱 에러 표시', async ({ page }) => {
  // 1. 설치 완료 + admin 세션 확보
  await setupInstalledAdminSession(page);

  // 2. import 페이지 이동
  await page.goto('/admin/settings/import');
  await expect(page.getByRole('heading', { name: '가져오기 (Import)' })).toBeVisible();

  // 3. 잘못된 JSON 파일 생성 (JSON 파싱 불가)
  const invalidJson = 'this is { not: valid json ]';
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `e2e-invalid-${Date.now()}.json`);
  await fs.writeFile(tmpFile, invalidJson, 'utf-8');

  try {
    // 4. 잘못된 파일 업로드
    await page.locator('input[type="file"]').setInputFiles(tmpFile);

    // 5. 파싱 에러 메시지 확인
    //    ImportForm의 parseJsonFile()은 JSON 파싱 실패 시
    //    "JSON 파일을 파싱할 수 없습니다. 올바른 Export 파일인지 확인하세요." 메시지를 표시
    await expect(
      page.getByText('JSON 파일을 파싱할 수 없습니다. 올바른 Export 파일인지 확인하세요.'),
    ).toBeVisible();

    // 6. "미리 보기" 버튼이 비활성화 상태여야 함 (parsedBundle이 null이므로)
    await expect(page.getByRole('button', { name: /미리 보기/ })).toBeDisabled();
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});
