/**
 * DismissButton 컴포넌트 — SPEC-INSTALL-003 REQ-INSTALL3-002.
 *
 * 온보딩 해제 버튼을 렌더링하는 Client Component.
 */
'use client';

import { dismissOnboardingFromForm } from '@/app/actions/onboarding';

export function DismissButton({ siteId }: { siteId: number }) {
  return (
    <form action={dismissOnboardingFromForm}>
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        이 안내 숨기기
      </button>
    </form>
  );
}
