/**
 * 회원 그룹 생성 페이지 — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-041).
 *
 * Server Component. 그룹 생성 폼은 useActionState 바인딩을 위해 Client Component(forms.tsx)로 분리.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-041
 */
import Link from 'next/link'
import { CreateGroupForm } from '../forms';

export const dynamic = 'force-dynamic';

export default async function AdminMemberGroupNewPage() {
  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/members/groups" className="text-zinc-600 hover:text-zinc-900">
          ← 목록으로
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-4">회원 그룹 추가</h1>

      <CreateGroupForm />
    </div>
  );
}
