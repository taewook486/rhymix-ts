/**
 * 회원 직접 등록 페이지 — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-044, REQ-ADMIN2-045).
 *
 * Server Component. 관리자에 의한 회원 직접 등록 폼 (Server Actions).
 * 이메일 인증 우회, 비밀번호 해싱, 그룹 배정.
 * 비밀번호는 평문으로 저장되거나 로깅되지 않음 (REQ-ADMIN2-045).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-044, REQ-ADMIN2-045
 */
import Link from 'next/link'
import { getServerCaller } from '@/lib/trpc/server';
import { CreateMemberForm } from './CreateMemberForm';

export const dynamic = 'force-dynamic';

export default async function AdminMemberNewPage() {
  const caller = await getServerCaller();
  const groups = await caller.admin.group.list();

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/members" className="text-zinc-600 hover:text-zinc-900">
          ← 목록으로
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-4">회원 직접 등록</h1>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>참고:</strong> 이 페이지를 통해 등록된 회원은 이메일 인증 절차를
          거치지 않고 즉시 활성화됩니다. 비밀번호는 안전하게 해싱되어 저장되며 평문으로
          저장되거나 로그에 기록되지 않습니다.
        </p>
      </div>

      <CreateMemberForm groups={groups} />
    </div>
  );
}
