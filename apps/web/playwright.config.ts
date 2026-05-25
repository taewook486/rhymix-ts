import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * .env.local 인라인 로더 — Next.js dev 서버는 자동 로드하지만
 * Playwright 자체 프로세스는 별개이므로 명시적으로 주입합니다.
 * dotenv 의존성 없이 최소 파서로 처리.
 */
function loadEnvLocal(): void {
  const envPath = path.resolve(__dirname, '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1]!;
    const rawValue = match[2]!;
    if (process.env[key] !== undefined && process.env[key] !== '') continue;
    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvLocal();

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
    url: 'http://localhost:3000/api/health',
    timeout: 90_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
