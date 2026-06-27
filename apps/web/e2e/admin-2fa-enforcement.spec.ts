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
import { generateSync } from 'otplib';

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
 *
 * @MX:NOTE: SPEC-INSTALL-002(설치 완료 후 자동 로그인)로 인해 runInstallWizard()
 *           직후에는 이미 인증된 세션이 존재한다. 이 상태로 /login에 진입하면
 *           즉시 다른 페이지로 redirect되어 로그인 폼이 나타나지 않으므로,
 *           먼저 이미 로그인되어 있는지 확인하고 아니면 폼을 채운다.
 */
async function loginAsAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  if (!/\/login/.test(page.url())) {
    // 이미 인증된 세션 — /login이 다른 페이지로 redirect함
    return;
  }
  // 로그인 폼 필드 이름은 NextAuth credentials 기본값 또는 커스텀 폼을 따름
  await page.locator('input[name="userId"], input[name="username"], input[type="text"]').first().fill('admin');
  await page.locator('input[name="password"], input[type="password"]').first().fill('e2e-password-1234');
  await page.getByRole('button', { name: /로그인|Login|Sign in/i }).click();
  // NextAuth credentials 로그인은 비동기 fetch + redirect — 세션 쿠키가 실제로
  // 설정될 때까지 /login을 벗어나는 navigation을 기다린다. 기다리지 않으면
  // 호출자가 곧바로 보호된 라우트로 이동할 때 미인증 상태로 리다이렉트될 수 있다.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
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

  // 3. 로그인 (설치 후 세션 없음)
  await loginAsAdmin(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  // 4. /admin 에 정상 접근됨 — 2FA enroll 페이지로 redirect 되면 안 됨
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/admin\/2fa/);
});

test('2FA 강제 설정 시 미등록 admin은 enroll 페이지로 redirect됨', async ({ page }) => {
  // 1. 설치 위저드 실행 → admin 계정 + siteId=1 생성
  await runInstallWizard(page);

  // 2. DB에 2FA 강제 정책 설정 (siteId=1)
  await setTwoFactorEnforced(1, true);

  // 3. 로그인 (설치 후 세션 없음)
  await loginAsAdmin(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  // 4. /admin 접근 → 2FA 미등록 상태이므로 /admin/2fa/enroll 로 redirect 되어야 함
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/2fa\/enroll/, { timeout: 10_000 });

  // 5. enroll 페이지 UI 확인
  await expect(page.getByRole('heading', { name: '2단계 인증 설정' })).toBeVisible();
});

/**
 * SPEC-ADMIN-2FA-OTP-001 M7 — 전체 2FA 루프 검증.
 *
 * plan.md M7 시나리오: 정책 on → 미enroll 관리자 → enroll 완료 → /admin 접근 →
 * 새 세션 → verify → /admin 접근. 비관리자 무영향은 서버측 게이트 상태 매트릭스
 * 테스트(packages/admin/src/security/two-factor-gate.test.ts, REQ-2OTP-082)와
 * admin/layout.tsx 의 isAdminSession 사전 게이트가 이미 커버하므로 이 파일에서는
 * 별도 UI 케이스를 중복 작성하지 않는다.
 *
 * otplib 은 루트 package.json 의 직접 의존성(pnpm 호이스트)으로 apps/web 컨텍스트
 * 에서 import 가능 — Playwright 트랜스파일 파이프라인이 ESM import 를 그대로 해석한다.
 * 서버(enrollStart)가 렌더한 base32 시크릿을 페이지에서 추출해 현재 유효한
 * 6자리 TOTP 코드를 계산한다 (packages/auth/src/two-factor-totp.test.ts 와 동일 패턴).
 */
test('2FA 정책 on → enroll → 새 세션 verify → /admin 접근 (M7 전체 루프)', async ({
  page,
  context,
}) => {
  // 1. 설치 위저드 실행 → admin 계정 + siteId=1 생성
  await runInstallWizard(page);

  // 2. DB 에 2FA 강제 정책 설정 (siteId=1)
  await setTwoFactorEnforced(1, true);

  // 3. 로그인 후 /admin 이동 → 미enroll 이므로 /admin/2fa/enroll 로 redirect
  await loginAsAdmin(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/2fa\/enroll/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: '2단계 인증 설정' })).toBeVisible();

  // 4. 서버가 렌더한 base32 시크릿 추출 (REQ-2OTP-020 수동 입력 폴백).
  //    enrollStart mutation 이 resolve 되어야 <code data-testid="totp-secret"> 가 채워진다.
  const secretEl = page.getByTestId('totp-secret');
  await expect(secretEl).toBeVisible({ timeout: 30_000 });
  const secret = (await secretEl.textContent())?.trim() ?? '';
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);

  // 현재 시점에 유효한 6자리 TOTP 코드를 계산 (enrollConfirm 검증용).
  const enrollTotp = generateSync({ secret, strategy: 'totp' });

  // 5. 코드 제출 → enrollConfirm (REQ-2OTP-021/022). 검증 통과 시 백업코드 화면으로 전환.
  await page.locator('#code').fill(enrollTotp);
  await page.getByRole('button', { name: '등록하기' }).click();

  // 6. 백업코드 화면 — 저장 확인 체크 후 완료 (REQ-2OTP-025, 백업코드는 1회 표시).
  await expect(page.getByText('백업 코드를 지금 반드시 저장하세요.')).toBeVisible({
    timeout: 15_000,
  });
  await page.locator('#backup-ack').check();
  await page.getByRole('button', { name: '완료' }).click();

  // 7. /admin 도착 — 현재 세션이 verified 이므로 더 이상 enroll/verify 로 redirect 안 됨.
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/admin\/2fa/);

  // --- 새 세션 시뮬레이션 (plan.md M7: "새 세션" 재챌린지) ---
  // 8. 쿠키 제거 = 새 세션. DB 의 twoFactorEnabled=true 는 유지되므로 재로그인 직후에는
  //    세션 미verified 상태가 된다 (모든 새 세션은 재챌린지 — REQ-ADMIN-EXTRAS-046).
  await context.clearCookies();

  // 9. 동일 admin 으로 재로그인 후 /admin 이동.
  //    apps/web/app/admin/layout.tsx 가 checkAdmin2FA(REQ-2OTP-060~062)로 enroll/verify
  //    를 구분하므로, 이미 등록된 관리자는 /admin/2fa/verify 로 redirect 된다.
  await loginAsAdmin(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/2fa\/verify/, { timeout: 10_000 });

  // 10. verify 페이지 — 재챌린지 (REQ-2OTP-040~042, 060 need-verify).
  //     등록 시 사용한 동일 시크릿으로 새 코드를 계산 — verify mutation 이 저장된
  //     (암호화된) 시크릿을 복호화하여 검증한다.
  await expect(page.getByRole('heading', { name: '2단계 인증 확인' })).toBeVisible();

  const verifyTotp = generateSync({ secret, strategy: 'totp' });
  await page.locator('#code').fill(verifyTotp);
  await page.getByRole('button', { name: '확인하기' }).click();

  // 11. verify 통과 → /admin 접근 성공. 서버측 one-shot marker → jwt callback 이
  //     session.user.twoFactorVerified=true 를 채워 게이트가 pass 한다 (REQ-2OTP-042/046/047).
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/admin\/2fa/);
});
