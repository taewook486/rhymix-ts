/**
 * OperatorOnboarding 컴포넌트 — SPEC-INSTALL-003 Groups 1-4.
 *
 * 인증된 운영자에게만 표시되는 first-run 온보딩 표면입니다.
 *
 * 구성 요소:
 * - WelcomeHero: 설치 성공 환영 + /admin CTA
 * - OnboardingPanel: 5개의 가이드 링크
 * - 외부 링크: GitHub 저장소
 *
 * @MX:SPEC: SPEC-INSTALL-003 REQ-INSTALL3-001~006, REQ-INSTALL3-010~014, REQ-INSTALL3-020~023, REQ-INSTALL3-030~032
 */
import { cache } from 'react';
import { prisma } from '@rhymix-ts/db';
import { WelcomeHero } from './WelcomeHero';
import { OnboardingPanel } from './OnboardingPanel';
import { DismissButton } from './DismissButton';

export interface OperatorOnboardingProps {
  siteId: number;
}

/**
 * SiteSetting에서 온보딩 해제 상태를 읽어옵니다.
 * 요청 단위 메모이제이션으로 중복 쿼리를 방지합니다.
 *
 * export하는 이유: OperatorOnboarding 자체는 async Server Component라
 * RTL로 직접 렌더링할 수 없다("async/await is not yet supported in
 * Client Components" — Next.js RSC 런타임 밖에서는 불가능, SPEC-TEST-DEBT-001
 * NextJS-AppRouter 카테고리와 동일한 제약). 이 분기 로직만 분리해 일반
 * vitest 단위 테스트로 REQ-INSTALL3-002/003을 검증한다.
 */
export async function getOnboardingDismissed(siteId: number): Promise<boolean> {
  try {
    const setting = await prisma.siteSetting.findFirst({
      where: {
        siteId,
        key: 'operator_onboarding_dismissed',
      },
      select: {
        value: true,
      },
    });

    return setting?.value === true;
  } catch (error) {
    // DB 오류 시 안전하게 기본값 반환
    return false;
  }
}

const getCachedOnboardingDismissed = cache(getOnboardingDismissed);

/**
 * OperatorOnboarding Server Component.
 *
 * 인증된 운영자이고 온보딩이 해제되지 않은 경우에만 렌더링합니다.
 */
export async function OperatorOnboarding({ siteId }: OperatorOnboardingProps) {
  // 온보딩 해제 상태 확인
  const dismissed = await getCachedOnboardingDismissed(siteId);

  if (dismissed) {
    return null;
  }

  return (
    <div className="operator-onboarding">
      <WelcomeHero />
      <OnboardingPanel />

      <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          커뮤니티 및 리소스
        </h4>
        <a
          href="https://github.com/taewook486/rhymix-ts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          GitHub 저장소 보기 →
        </a>
      </div>

      <DismissButton siteId={siteId} />
    </div>
  );
}
