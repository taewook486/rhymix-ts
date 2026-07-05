/**
 * 약관 관리 페이지 — SPEC-CAPTCHA-001 REQ-CAPTCHA-002.
 *
 * Server Component. admin.terms.list 로 약관 목록 조회.
 * TermsEditor 클라이언트 컴포넌트로 CRUD 기능 제공.
 *
 * @MX:NOTE: [AUTO] Server Actions 사용 (actions.ts).
 * @MX:SPEC: SPEC-CAPTCHA-001 REQ-CAPTCHA-002, AC-CAPTCHA-006
 */
import { getServerCaller } from '@/lib/trpc/server';
import { TermsEditor } from './TermsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminTermsPage() {
  // TODO: Replace with actual API call when backend is ready
  // const caller = await getServerCaller();
  // const terms = await caller.admin.terms.list();

  // Mock data for now
  const terms = [
    {
      id: 1,
      type: 'terms' as const,
      title: '이용약관',
      content: '본 약관은 서비스 이용 조건을 규정합니다.',
      required: true,
      active: true,
    },
    {
      id: 2,
      type: 'privacy' as const,
      title: '개인정보 처리방침',
      content: '개인정보 수집 및 이용에 대한 안내입니다.',
      required: true,
      active: true,
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">약관 관리</h1>

      <TermsEditor initialTerms={terms} />
    </div>
  );
}
