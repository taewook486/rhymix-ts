/**
 * E2E: Admin 2FA Enforcement — SPEC-ADMIN-EXTRAS-001 REQ-023.
 *
 * 2FA 강제(enforce) 설정 유무에 따른 /admin 접근 동작 검증.
 *
 * 시나리오:
 *  1. 2FA 강제 설정 없으면 install → admin 로그인 → /admin 바로 접근 가능
 *  2. 2FA 강제 설정 시 미등록 admin은 /admin/2fa/enroll 로 redirect됨
 *
 * 주의:
 *  - 매 테스트 전 DB를 TRUNCATE 후 설치 위저드 전체를 수행합니다.
 *    install happy-path 패턴을 그대로 따릅니다.
 *  - 2FA 강제 설정은 pg.Client로 site_settings 테이블에 직접 INSERT 합니다
 *    (tRPC mutation이 세션을 요구하므로 DB 직접 조작이 더 단순합니다).
 *  - Argon2id 해싱 + Turbopack 컴파일로 첫 실행이 60초 가까이 걸릴 수 있습니다.
 */
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

import { resetDb } from './support/db-reset';

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되어 있지 않습니다. apps/web/.env.local 또는 환경변수를 확인하세요.',
    );
  }
  return url;
}

/**
 * site_settings 테이블에 requireAdminTwoFactor=true 를 직접 삽입합니다.
 * isAdminTwoFactorRequired() 가 siteId=1 기준으로 조회하므로 siteId=1 사용.
 *
 * @MX:WARN: [AUTO] 테스트 환경 전용 직접 DB 조작입니다.
 * @MX:REASON: tRPC admin.security.setTwoFactorPolicy 는 인증된 세션이 필요하므로
 *             브라우저 없이 정책만 설정할 때 raw SQL이 더 안정적입니다.
 */
async function setTwoFactorEnforced(siteId: number, enforced: boolean): Promise<void> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    // upsert: 이미 있으면 value 갱신, 없으면 삽입
    await client.query(
      `INSERT INTO site_settings ("siteId", key, value, "updatedAt")
       VALUES ($1, 'requireAdminTwoFactor', $2::jsonb, NOW())
       ON CONFLICT ("siteId", key)
       DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()`,
      [siteId, JSON.stringify(enforced)],
    );
  } finally {
    await client.end();
  }
}

/**
 * 설치 위저드 전체를 실행하여 admin 계정을 생성합니다.
 * install-happy-path.spec.ts 패턴을 인라인으로 재사용합니다.
 */
async function runInstallWizard(page: import('@playwright/test').Page): Promise<void> {
  // 루트 진입 → /install 리다이렉트
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
  await expect(page.getByRole('heading', { name: '설치가 완료되었습니다.' })).toBeVisible();
}

/**
 * /login 페이지에서 admin 계정으로 로그인합니다.
 * (설치 위저드에서 생성된 계정 사용)
 */
async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  // 로그인 폼 필드 이름은 NextAuth credentials 기본값 또는 커스텀 폼을 따름
  await page.locator('input[name="userId"], input[name="username"], input[type="text"]').first().fill('admin');
  await page.locator('input[name="password"], input[type="password"]').first().fill('e2e-password-1234');
  await page.getByRole('button', { name: /로그인|Login|Sign in/i }).click();
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

test.beforeEach(async () => {
  await resetDb();
});

test('2FA 강제 설정 없으면 admin 접근 허용됨', async ({ page }) => {
  // 1. 설치 위저드 실행 → admin 계정 생성
  await runInstallWizard(page);

  // 2. 2FA 강제 정책 미설정 상태 확인 (기본값 false)
  // (resetDb 후 site_settings에 requireAdminTwoFactor 행이 없으므로 별도 조작 불필요)

  // 3. /admin 링크 클릭 또는 직접 이동 → 2FA 없이 바로 접근 가능해야 함
  await page.getByRole('link', { name: '관리자 대시보드로 이동' }).click();

  // 4. /admin 에 정상 접근됨 — 2FA enroll 페이지로 redirect 되면 안 됨
  await expect(page).toHaveURL(/\/admin(?!\/2fa)/);
  await expect(page).not.toHaveURL(/\/admin\/2fa/);
});

test('2FA 강제 설정 시 미등록 admin은 enroll 페이지로 redirect됨', async ({ page }) => {
  // 1. 설치 위저드 실행 → admin 계정 + siteId=1 생성
  await runInstallWizard(page);

  // 2. DB에 2FA 강제 정책 설정 (siteId=1)
  await setTwoFactorEnforced(1, true);

  // 3. /admin 에 직접 접근 시도
  await page.goto('/admin');

  // 4. 2FA 미등록 상태이므로 /admin/2fa/enroll 로 redirect 되어야 함
  await expect(page).toHaveURL(/\/admin\/2fa\/enroll/, { timeout: 10_000 });

  // 5. enroll 페이지 UI 확인
  await expect(page.getByRole('heading', { name: '2단계 인증 설정' })).toBeVisible();
});
