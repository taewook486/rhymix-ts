/**
 * 가입 양식 편집 페이지 — SPEC-ADMIN-002 REQ-ADMIN2-054/055.
 *
 * Server Component. admin.settings.getJoinForm 로 현재 필드 목록 조회.
 * JoinFormEditor 클라이언트 컴포넌트로 필드 추가/순서 변경/제거 기능 제공.
 *
 * @MX:NOTE: [AUTO] Server Actions 사용 (actions.ts).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-054, REQ-ADMIN2-055
 */
import { getServerCaller } from '@/lib/trpc/server';
import { JoinFormEditor } from './JoinFormEditor';

export const dynamic = 'force-dynamic';

export default async function AdminJoinFormPage() {
  const caller = await getServerCaller();
  const joinFormSettings = await caller.admin.settings.getJoinForm();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">가입 양식 편집</h1>

      <JoinFormEditor initial={joinFormSettings.fields} />
    </div>
  );
}
