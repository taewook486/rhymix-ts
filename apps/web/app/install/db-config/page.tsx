/**
 * SPEC-INSTALL-001 / Step 3: DB 접속 정보 — REQ-INSTALL-013.
 *
 * 게이트(`requireWizardStep('db', ...)`)를 통과한 경우에만 폼을 렌더하며,
 * 미통과 시 `redirect`가 throw되어 즉시 이전 단계로 보내집니다.
 */
import { getWizardSession } from '@/lib/install/wizard-session';
import { requireWizardStep } from '@/lib/install/wizard-guards';

import { DbConfigForm } from './db-config-form';

export const dynamic = 'force-dynamic';

export default async function DbConfigPage() {
  const session = await getWizardSession();
  requireWizardStep('db', session);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">설치 3단계 — 데이터베이스 설정</h1>
      <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">
        PostgreSQL 접속 정보를 입력해주세요. 입력값은 다음 단계로 진행하기 전에
        실제 접속·권한·테이블 충돌을 검사합니다.
      </p>

      <DbConfigForm />
    </main>
  );
}
