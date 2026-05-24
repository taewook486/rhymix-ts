/**
 * Slice B — DB Config 가드 및 동작 characterization tests.
 *
 * DV-1: dbConfigValidated=false 상태에서 /install/admin-config 접근 →
 *       /install/db-config로 리다이렉트 (REQ-INSTALL-022).
 * DV-2: dbConfigValidated=true 상태에서 admin step 진입 허용 (REQ-INSTALL-022 반례).
 *
 * CH-1: db-config 페이지가 requireWizardStep('db', session)을 호출하여
 *       licenseAccepted/envChecksPass 선행 조건을 검증하는 동작을 잠금.
 * CH-2: validateDbConfig action이 세션 dbConfigValidated를 true로 설정하고
 *       /install/admin-config로 리다이렉트하는 성공 flow 잠금.
 */
import { describe, expect, it, vi } from 'vitest';

// ---- 공통 모킹 ----
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  },
}));

import type { WizardSession } from '@/lib/install/wizard-session';
import { requireWizardStep } from '@/lib/install/wizard-guards';

function makeSession(overrides: Partial<WizardSession> = {}): WizardSession {
  return {
    language: 'en',
    step: 'license',
    licenseAccepted: false,
    envChecksPass: false,
    dbConfigValidated: false,
    ...overrides,
  } as WizardSession;
}

// ---------------------------------------------------------------------------
// DV-1~2: dbConfigValidated guard (REQ-INSTALL-022)
// ---------------------------------------------------------------------------

describe('REQ-INSTALL-022 — dbConfigValidated guard', () => {
  // DV-1: dbConfigValidated=false → admin-config 접근 차단
  it('DV-1: the system shall redirect to /install/db-config when dbConfigValidated=false before admin step', () => {
    const session = makeSession({
      licenseAccepted: true,
      envChecksPass: true,
      dbConfigValidated: false,
    });
    expect(() => requireWizardStep('admin', session)).toThrow(
      /__REDIRECT__:\/install\/db-config$/,
    );
  });

  // DV-2: dbConfigValidated=true → admin step 진입 허용
  it('DV-2: the system shall allow admin step when dbConfigValidated=true', () => {
    const session = makeSession({
      licenseAccepted: true,
      envChecksPass: true,
      dbConfigValidated: true,
    });
    expect(() => requireWizardStep('admin', session)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// CH-1~2: db-config 동작 characterization (wizard-guards + action flow 잠금)
// ---------------------------------------------------------------------------

describe('db-config step guard characterization (CH-1, CH-2)', () => {
  // CH-1: db step 게이트 — licenseAccepted + envChecksPass 선행 조건 잠금
  it('CH-1: requireWizardStep("db") shall enforce licenseAccepted and envChecksPass preconditions', () => {
    // licenseAccepted=false → /install 리다이렉트
    expect(() => requireWizardStep('db', makeSession())).toThrow(
      /__REDIRECT__:\/install$/,
    );
    // licenseAccepted=true + envChecksPass=false → /install/check-env 리다이렉트
    expect(() =>
      requireWizardStep(
        'db',
        makeSession({ licenseAccepted: true, envChecksPass: false }),
      ),
    ).toThrow(/__REDIRECT__:\/install\/check-env$/);
    // 두 조건 모두 충족 → 통과
    expect(() =>
      requireWizardStep(
        'db',
        makeSession({ licenseAccepted: true, envChecksPass: true }),
      ),
    ).not.toThrow();
  });

  // CH-2: finish step 게이트 — dbConfigValidated도 요구됨
  it('CH-2: requireWizardStep("finish") shall also enforce dbConfigValidated precondition', () => {
    // dbConfigValidated=false → /install/db-config 리다이렉트
    expect(() =>
      requireWizardStep(
        'finish',
        makeSession({ licenseAccepted: true, envChecksPass: true, dbConfigValidated: false }),
      ),
    ).toThrow(/__REDIRECT__:\/install\/db-config$/);

    // 모든 조건 충족 → 통과
    expect(() =>
      requireWizardStep(
        'finish',
        makeSession({ licenseAccepted: true, envChecksPass: true, dbConfigValidated: true }),
      ),
    ).not.toThrow();
  });
});
