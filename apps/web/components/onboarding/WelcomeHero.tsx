/**
 * WelcomeHero 컴포넌트 — SPEC-INSTALL-003 REQ-INSTALL3-020, 021.
 *
 * 설치 성공을 알리는 환영 메시지와 /admin으로 향하는 CTA를 렌더링합니다.
 *
 * @MX:SPEC: SPEC-INSTALL-003 REQ-INSTALL3-020, REQ-INSTALL3-021
 */
import Link from 'next/link';

export function WelcomeHero() {
  return (
    <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm border border-blue-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          설치가 성공적으로 완료되었습니다!
        </h2>
        <p className="text-gray-700 mb-4">
          Rhymix-TS가 설치되었고 사이트를 구성할 준비가 되었습니다.
          아래 가이드를 따라 사이트 설정을 시작하세요.
        </p>
        <Link
          href="/admin"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          시작하기
        </Link>
      </div>
    </div>
  );
}
