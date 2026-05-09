/**
 * 위저드 단계 진입 가드 — REQ-INSTALL-021, REQ-INSTALL-022.
 *
 * 각 단계 페이지의 서버 컴포넌트 상단에서 호출하여, 선행 조건을 만족하지
 * 못한 경우 적절한 이전 단계로 리다이렉트합니다. `redirect()`는 내부적으로
 * Next.js의 NEXT_REDIRECT 에러를 throw하므로 호출 직후 코드는 실행되지
 * 않는다는 점을 호출자가 인지해야 합니다.
 *
 * @MX:NOTE: 가드 캐스케이드는 step 순서(license → env-check → db → admin)를 따른다.
 */
import { redirect } from 'next/navigation';

import type { InstallStep } from '@rhymix-ts/core';

import type { WizardSession } from './wizard-session';

/**
 * 주어진 step에 진입하기 위한 선행 조건을 점검하고, 미충족 시 redirect.
 * `license` 단계는 항상 허용됩니다.
 */
export function requireWizardStep(step: InstallStep, session: WizardSession): void {
  // 1단계: 라이선스 동의 — env-check 이후의 모든 단계가 의존.
  if (step !== 'license' && step !== 'language') {
    if (!session.licenseAccepted) {
      redirect('/install');
    }
  }

  // 2단계: 환경 자가진단 통과 — db 이후 단계가 의존.
  if (step === 'db' || step === 'admin' || step === 'finish') {
    if (!session.envChecksPass) {
      redirect('/install/check-env');
    }
  }

  // 3단계: DB 설정 검증 — admin 이후 단계가 의존.
  if (step === 'admin' || step === 'finish') {
    if (!session.dbConfigValidated) {
      redirect('/install/db-config');
    }
  }
}
