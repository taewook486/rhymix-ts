/**
 * OnboardingPanel 컴포넌트 — SPEC-INSTALL-003 REQ-INSTALL3-010, 011.
 *
 * 운영자를 위한 5개의 가이드 링크를 렌더링합니다.
 * 모든 링크는 실제하는 /admin 라우트로 연결됩니다.
 *
 * @MX:SPEC: SPEC-INSTALL-003 REQ-INSTALL3-010, REQ-INSTALL3-011
 */
import Link from 'next/link';

const ONBOARDING_LINKS = [
  {
    href: '/admin/settings/site',
    label: '사이트 제목/일반 설정',
    description: '사이트 이름, 언어, 시간대 등 기본 설정을 변경합니다.',
  },
  {
    href: '/admin/menu',
    label: '메뉴 편집',
    description: '내비게이션 메뉴 구조를 편집하고 관리합니다.',
  },
  {
    href: '/admin/site/design',
    label: '디자인/레이아웃 변경',
    description: '사이트 레이아웃과 디자인을 설정합니다.',
  },
  {
    href: '/admin/modules',
    label: '모듈 관리',
    description: '설치된 모듈을 활성화/비활성화하고 설정을 관리합니다.',
  },
  {
    href: '/admin/domains',
    label: '홈페이지(인덱스 모듈) 변경',
    description: '홈페이지에 표시할 인덱스 모듈을 설정합니다.',
  },
] as const;

export function OnboardingPanel() {
  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        사이트 구성 가이드
      </h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ONBOARDING_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">{link.label}</div>
            <div className="text-sm text-gray-600">{link.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
