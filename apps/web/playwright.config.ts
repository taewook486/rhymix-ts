import { defineConfig, devices } from '@playwright/test';

/**
 * SPEC-INSTALL-001 Slice E-followup — Playwright 설정.
 *
 * 설치 위저드 E2E 시나리오만 다룹니다. 다음 슬라이스(/login, /admin) 진입 시
 * `projects` 또는 `testMatch`를 분리하는 방향으로 확장합니다.
 *
 * 주의:
 *  - Turbopack 첫 컴파일 + hash-wasm Argon2id가 60초 가까이 걸릴 수 있어
 *    timeout을 60초로 잡습니다 (관리자 비밀번호 해싱은 setSession 단계에서 발생).
 *  - DB 쓰기는 격리되지 않았으므로 fullyParallel=false, workers=1 강제.
 *  - reuseExistingServer=true(local)로 개발자가 이미 띄운 서버를 그대로 사용.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    cwd: '../..',
    url: 'http://localhost:3000',
    timeout: 90_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
