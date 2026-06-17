/**
 * 회원 그룹 수정 페이지 — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-041).
 *
 * Server Component. 그룹 수정 폼은 useActionState 바인딩을 위해 Client Component(forms.tsx)로 분리.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-041
 */
import { getServerCaller } from '@/lib/trpc/server';
import { notFound } from 'next/navigation';
import { deleteGroupAction } from '../../actions';
import { EditGroupForm } from '../../forms';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminMemberGroupEditPage({ params }: PageProps) {
  const { id } = await params;
  const groupId = Number(id);

  if (isNaN(groupId)) {
    notFound();
  }

  const caller = await getServerCaller();
  const group = await caller.admin.group.get({ id: groupId });

  if (!group) {
    notFound();
  }

  const handleDelete = async () => {
    'use server';
    const result = await deleteGroupAction(groupId);
    if ('error' in result) {
      throw new Error(result.error);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <a href="/admin/members/groups" className="text-zinc-600 hover:text-zinc-900">
          ← 목록으로
        </a>
      </div>

      <h1 className="text-xl font-semibold mb-4">회원 그룹 수정</h1>

      <EditGroupForm group={group} />

      <div className="mt-8 pt-8 border-t border-zinc-200">
        <h2 className="text-lg font-medium mb-4">회원 수: {group._count.members}명</h2>
        <p className="text-sm text-zinc-600 mb-4">
          이 그룹을 삭제하려면 회원을 다른 그룹으로 이동해야 합니다.
        </p>
        <form action={handleDelete}>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            그룹 삭제
          </button>
        </form>
      </div>
    </div>
  );
}
