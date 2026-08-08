/**
 * 회원 관리 페이지 — SPEC-ADMIN-001 Slice E-5.
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-152).
 *
 * Server Component. admin.user.list 로 회원 목록 조회.
 * 검색, 상태 필터, 페이지네이션 지원.
 *
 * @MX:NOTE: [AUTO] 회원 상태 변경(suspend/deny/approve)은 클라이언트 컴포넌트에서
 *           admin.user.update tRPC mutation 으로 처리한다 (US-7).
 * @MX:SPEC: SPEC-ADMIN-001 US-7, SPEC-ADMIN-002 REQ-ADMIN2-152
 */
import { getServerCaller } from '@/lib/trpc/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    filter?: string
    page?: string
    sortBy?: string
    sortOrder?: string
  }>
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: '승인',
  UNAUTHED: '미인증',
  SUSPENDED: '정지',
  DENIED: '차단',
  DELETED: '삭제',
}

const FILTER_TABS = [
  { value: '', label: '전체' },
  { value: 'admin', label: '최고관리자' },
  { value: 'APPROVED', label: '승인' },
  { value: 'DENIED', label: '거부' },
  { value: 'UNAUTHED', label: '미인증' },
] as const

export default async function AdminMembersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = sp.page ? Number(sp.page) : 1
  const sortBy = sp.sortBy
  const sortOrder = sp.sortOrder || 'asc'
  const caller = await getServerCaller()

  // 필터 탭 로직
  const activeFilter = sp.filter ?? ''
  const isFilterAdmin = activeFilter === 'admin'
  const statusFromFilter = activeFilter && activeFilter !== 'admin' ? activeFilter : sp.status

  // REQ-MADM-019: "기본 설정" 탭의 프로필사진 노출 토글을 실제로 반영한다.
  const [data, defaultSettings] = await Promise.all([
    caller.admin.user.list({
      q: sp.q ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: statusFromFilter ? (statusFromFilter as any) : undefined,
      filterAdmin: isFilterAdmin ? true : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortBy: sortBy ? (sortBy as any) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortOrder: sortOrder ? (sortOrder as any) : undefined,
      page,
      pageSize: 50,
    }),
    caller.admin.settings.getDefault(),
  ])
  const showProfilePhoto = defaultSettings.showProfilePhotoInList

  // 정렬 가능한 컬럼 정의
  const sortableColumns = {
    userId: 'ID',
    nickName: '닉네임',
    emailAddress: '이메일',
    createdAt: '가입일',
    lastLoginAt: '최근 로그인',
  } as const

  // 정렬 링크 생성 헬퍼
  const createSortLink = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams({
      ...(sp.q ? { q: sp.q } : {}),
      ...(sp.filter ? { filter: sp.filter } : {}),
      ...(sp.status ? { status: sp.status } : {}),
      ...(page ? { page: page.toString() } : {}),
      sortBy: column,
      sortOrder: newSortOrder,
    })
    return `?${params.toString()}`
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">회원 관리</h1>

      {/* 상태 필터 탭 */}
      <div className="border-b border-zinc-200 mb-4">
        <nav className="-mb-px flex gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value
            const href = isActive
              ? undefined // 현재 탭이면 링크 없음
              : `?${new URLSearchParams({
                  ...(sp.q ? { q: sp.q } : {}),
                  ...(tab.value ? { filter: tab.value } : {}),
                  ...(sp.page ? { page: sp.page } : {}),
                }).toString()}`

            return isActive ? (
              <span
                key={tab.value}
                className="px-4 py-2 text-sm font-medium border-b-2 border-zinc-800 text-zinc-900"
              >
                {tab.label}
              </span>
            ) : (
              <Link
                key={tab.value}
                href={href ?? ''}
                className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-600 hover:text-zinc-900"
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

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
            {showProfilePhoto && <th className="text-left px-3 py-2 font-medium">프로필</th>}
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('userId')}
                className="hover:underline group"
              >
                ID
                {sortBy === 'userId' && (
                  <span className="ml-1 text-zinc-600">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('nickName')}
                className="hover:underline group"
              >
                닉네임
                {sortBy === 'nickName' && (
                  <span className="ml-1 text-zinc-600">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('emailAddress')}
                className="hover:underline group"
              >
                이메일
                {sortBy === 'emailAddress' && (
                  <span className="ml-1 text-zinc-600">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">상태</th>
            <th className="text-left px-3 py-2 font-medium">관리자</th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('lastLoginAt')}
                className="hover:underline group"
              >
                최근 로그인
                {sortBy === 'lastLoginAt' && (
                  <span className="ml-1 text-zinc-600">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('createdAt')}
                className="hover:underline group"
              >
                가입일
                {sortBy === 'createdAt' && (
                  <span className="ml-1 text-zinc-600">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user) => (
            <tr key={user.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              {showProfilePhoto && (
                <td className="px-3 py-2">
                  {/* 프로필 사진 원본 컬럼(User.profileImage 등)이 아직 없어 닉네임
                      첫 글자 기반 아바타로 대체 표시한다 — REQ-MADM-019는 노출
                      토글의 실제 반영을 요구할 뿐, 신규 이미지 업로드 기능을
                      요구하지 않는다(§5 범위 밖 원칙 준용). */}
                  <span
                    data-testid="member-avatar"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700"
                    aria-hidden
                  >
                    {(user.nickName || user.userId).slice(0, 1).toUpperCase()}
                  </span>
                </td>
              )}
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
              <td className="px-3 py-2 text-zinc-400">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '—'}
              </td>
            </tr>
          ))}
          {data.users.length === 0 && (
            <tr>
              <td colSpan={showProfilePhoto ? 8 : 7} className="px-3 py-8 text-center text-zinc-400">
                회원이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
