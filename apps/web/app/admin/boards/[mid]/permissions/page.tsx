/**
 * apps/web/app/admin/boards/[mid]/permissions/page.tsx
 * SPEC-BOARD-CRUD-001 REQ-BOARD-070~076
 * 게시판 권한 매트릭스 관리자 페이지.
 */
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import type { BoardAction } from '@rhymix-ts/board';
import { BackButton } from '@/app/admin/_components/BackButton';

interface PermissionsPageProps {
  params: Promise<{ mid: string }>;
}

const BOARD_ACTIONS: BoardAction[] = [
  'list',
  'view',
  'write_document',
  'write_comment',
  'vote_log_view',
  'update_view',
  'consultation_read',
];

export default async function PermissionsPage({ params }: PermissionsPageProps) {
  const { mid } = await params;

  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) notFound();

  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect('/login?callbackUrl=/admin/boards/[mid]/permissions');
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) notFound();

  const board = await prisma.board.findUnique({
    where: { moduleInstanceId: instance.id },
  });
  if (!board) notFound();

  // 권한 매트릭스 로드
  const permissions = board.permissions as Record<string, number[]> | null | undefined;
  const memberGroups = await prisma.memberGroup.findMany({
    where: { siteId },
    orderBy: { listOrder: 'asc' },
  });

  // 항상 포함될 기본 그룹: 0 (게스트), 1 (회원)
  const allGroups = [
    { srl: 0, title: '게스트' },
    { srl: 1, title: '회원' },
    ...memberGroups.map((g) => ({ srl: g.id, title: g.title })),
  ];

  // 현재 권한 상태 가져오기
  const getPermissionValue = (action: BoardAction, groupSrl: number): boolean => {
    const allowed = permissions?.[action] ?? [];
    return allowed.includes(groupSrl);
  };

  // TypeScript 클로저 narrowing 을 위해 board.id 를 미리 추출
  const boardId = board.id;

  // Server Action: 권한 업데이트
  async function updatePermissions(formData: FormData) {
    'use server';

    const newPermissions: Record<string, number[]> = {};

    for (const action of BOARD_ACTIONS) {
      const allowed: number[] = [];
      for (const group of allGroups) {
        const key = `${action}-${group.srl}`;
        if (formData.get(key) === 'on') {
          allowed.push(group.srl);
        }
      }
      newPermissions[action] = allowed;
    }

    await prisma.board.update({
      where: { id: boardId },
      data: { permissions: newPermissions },
    });

    redirect(`/admin/boards/${mid}/permissions`);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{instance.name} — 권한 관리</h1>
        <p className="text-sm text-zinc-500 mt-1">
          각 그룹별 게시판 권한을 설정합니다.
        </p>
      </header>

      <form action={updatePermissions}>
        <div className="border border-zinc-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium">권한</th>
                {allGroups.map((group) => (
                  <th key={group.srl} className="text-center px-4 py-2 font-medium">
                    {group.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BOARD_ACTIONS.map((action) => (
                <tr key={action} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-2 font-medium">{action}</td>
                  {allGroups.map((group) => (
                    <td key={group.srl} className="text-center px-4 py-2">
                      <input
                        type="checkbox"
                        name={`${action}-${group.srl}`}
                        defaultChecked={getPermissionValue(action, group.srl)}
                        className="w-4 h-4"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            저장
          </button>
          <BackButton />
        </div>
      </form>
    </section>
  );
}
