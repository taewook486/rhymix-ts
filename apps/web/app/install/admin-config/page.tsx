/**
 * SPEC-INSTALL-001 / Step 4: 관리자 계정 + 최종 설치 (REQ-INSTALL-014).
 *
 * 게이트 통과 시에만 폼 렌더. 시간대 옵션은 서버에서 미리 해석해 클라이언트
 * 컴포넌트로 전달합니다(`Intl.supportedValuesOf`는 서버/클라 양쪽에서 사용
 * 가능하지만, 일관성과 SSR 친화성을 위해 서버에서 결정).
 */
import { getWizardSession } from '@/lib/install/wizard-session';
import { requireWizardStep } from '@/lib/install/wizard-guards';

import { AdminConfigForm } from './admin-config-form';

export const dynamic = 'force-dynamic';

function listTimeZones(): string[] {
  // Intl.supportedValuesOf is available on Node 20+ — 본 모노레포는 22 LTS.
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    return intlAny.supportedValuesOf('timeZone');
  }
  // 폴백: 최소 셋.
  return ['UTC', 'Asia/Seoul', 'America/Los_Angeles'];
}

export default async function AdminConfigPage() {
  const session = await getWizardSession();
  requireWizardStep('admin', session);

  const timeZones = listTimeZones();
  const defaultTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">설치 4단계 — 관리자 계정</h1>
      <p className="mt-2 text-sm text-[rgb(var(--color-muted))]">
        관리자 정보와 사이트 운영 옵션을 입력하세요. 제출 시 데이터베이스에
        실제 변경이 적용됩니다.
      </p>

      <AdminConfigForm timeZones={timeZones} defaultTimeZone={defaultTimeZone} />
    </div>
  );
}
