/**
 * 회원 그룹 관리 페이지 — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-040~042).
 *
 * Server Component. admin.group.list 로 그룹 목록 조회.
 * 그룹 생성/편집/삭제 기능 제공 (Server Actions).
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-040~042
 */
import { getServerCaller } from '@/lib/trpc/server';
import { deleteGroupAction } from './actions';
import { GroupReorderList } from './GroupReorderList';

export const dynamic = 'force-dynamic';

export default async function AdminMemberGroupsPage() {
  const caller = await getServerCaller();
  const groups = await caller.admin.group.list();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">회원 그룹 관리</h1>
        <a
          href="/admin/members/groups/new"
          className="px-4 py-2 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700"
        >
          그룹 추가
        </a>
      </div>

      {/* 순서 변경 (REQ-MADM-011~014) — 드래그앤드롭 / 키보드 재배치 */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-zinc-600 mb-2">순서 변경</h2>
        <GroupReorderList
          initialGroups={groups.map((g) => ({
            id: g.id,
            title: g.title,
            listOrder: g.listOrder,
            imageMark: g.imageMark,
            memberCount: g.memberCount,
            isDefault: g.isDefault,
          }))}
        />
      </div>

      {/* 그룹 목록 테이블 */}
      <div className="text-sm text-zinc-500 mb-2">총 {groups.length}개</div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            <th className="text-left px-3 py-2 font-medium">ID</th>
            <th className="text-left px-3 py-2 font-medium">이미지 마크</th>
            <th className="text-left px-3 py-2 font-medium">그룹명</th>
            <th className="text-left px-3 py-2 font-medium">설명</th>
            <th className="text-left px-3 py-2 font-medium">회원 수</th>
            <th className="text-left px-3 py-2 font-medium">기본 그룹</th>
            <th className="text-left px-3 py-2 font-medium">관리자</th>
            <th className="text-left px-3 py-2 font-medium">순서</th>
            <th className="text-left px-3 py-2 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              <td className="px-3 py-2 font-mono text-xs">{group.id}</td>
              <td className="px-3 py-2">
                {group.imageMark ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={group.imageMark} alt="" className="h-6 w-6 rounded object-cover" />
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2 font-medium">{group.title}</td>
              <td className="px-3 py-2 text-zinc-600 text-xs max-w-xs truncate">
                {group.description || '—'}
              </td>
              <td className="px-3 py-2">{group.memberCount}</td>
              <td className="px-3 py-2">
                {group.isDefault ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    기본
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2">{group.isAdmin ? '✓' : '—'}</td>
              <td className="px-3 py-2 text-zinc-400">{group.listOrder}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <a
                    href={`/admin/members/groups/${group.id}/edit`}
                    className="text-zinc-600 hover:text-zinc-900"
                  >
                    수정
                  </a>
                  <form
                    action={async () => {
                      'use server';
                      await deleteGroupAction(group.id);
                    }}
                  >
                    <button type="submit" className="text-red-600 hover:text-red-900">
                      삭제
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {groups.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-zinc-400">
                그룹이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
