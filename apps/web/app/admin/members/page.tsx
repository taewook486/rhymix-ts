/**
 * 회원 관리 페이지 — SPEC-ADMIN-001 Slice E-5.
 *
 * Server Component. admin.user.list 로 회원 목록 조회.
 * 검색, 상태 필터, 페이지네이션 지원.
 *
 * @MX:NOTE: [AUTO] 회원 상태 변경(suspend/deny/approve)은 클라이언트 컴포넌트에서
 *           admin.user.update tRPC mutation 으로 처리한다 (US-7).
 * @MX:SPEC: SPEC-ADMIN-001 US-7
 */
import { getServerCaller } from '@/lib/trpc/server'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    page?: string
  }>
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: '승인',
  UNAUTHED: '미인증',
  SUSPENDED: '정지',
  DENIED: '차단',
  DELETED: '삭제',
}

export default async function AdminMembersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = sp.page ? Number(sp.page) : 1
  const caller = await getServerCaller()

  const data = await caller.admin.user.list({
    q: sp.q ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (sp.status as any) ?? undefined,
    page,
    pageSize: 50,
  })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">회원 관리</h1>

      {/* 검색 / 필터 */}
      <form className="flex gap-2 mb-4">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="ID, 이메일, 닉네임 검색"
          className="border border-zinc-300 rounded px-3 py-1 text-sm flex-1 max-w-xs"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="border border-zinc-300 rounded px-3 py-1 text-sm"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700"
        >
          검색
        </button>
      </form>

      {/* 회원 목록 테이블 */}
      <div className="text-sm text-zinc-500 mb-2">총 {data.total}명</div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            <th className="text-left px-3 py-2 font-medium">ID</th>
            <th className="text-left px-3 py-2 font-medium">닉네임</th>
            <th className="text-left px-3 py-2 font-medium">이메일</th>
            <th className="text-left px-3 py-2 font-medium">상태</th>
            <th className="text-left px-3 py-2 font-medium">관리자</th>
            <th className="text-left px-3 py-2 font-medium">최근 로그인</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user) => (
            <tr key={user.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              <td className="px-3 py-2 font-mono text-xs">{user.userId}</td>
              <td className="px-3 py-2">{user.nickName}</td>
              <td className="px-3 py-2 text-zinc-600">{user.emailAddress}</td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  user.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-800' :
                  user.status === 'DENIED' ? 'bg-red-100 text-red-800' :
                  'bg-zinc-100 text-zinc-600'
                }`}>
                  {STATUS_LABELS[user.status] ?? user.status}
                </span>
              </td>
              <td className="px-3 py-2">{user.isAdmin ? '✓' : '—'}</td>
              <td className="px-3 py-2 text-zinc-400">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR') : '—'}
              </td>
            </tr>
          ))}
          {data.users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
                회원이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
