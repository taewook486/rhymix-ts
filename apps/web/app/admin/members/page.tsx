/**
 * 회원 관리 페이지 — SPEC-ADMIN-001 Slice E-5.
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-152).
 *
 * Server Component. admin.user.list 로 회원 목록 조회.
 * 검색, 상태 필터, 페이지네이션 지원.
 *
 * @MX:NOTE: [AUTO] 회원 상태 변경(suspend/deny/approve)은 클라이언트 컴포넌트에서
 *           admin.user.update tRPC mutation 으로 처리한다 (US-7).
 * @MX:SPEC: SPEC-ADMIN-001 US-7, SPEC-ADMIN-002 REQ-ADMIN2-152,
 *           SPEC-MEMBER-PARITY-001 REQ-MPAR-016~020
 */
import { getServerCaller } from '@/lib/trpc/server'
import Link from 'next/link'
import { MemberTable } from './components/MemberTable'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    searchTarget?: string
    searchQuery?: string
    status?: string
    filter?: string
    page?: string
    sortBy?: string
    sortOrder?: string
    groupId?: string
  }>
}


const FILTER_TABS = [
  { value: '', label: '전체' },
  { value: 'admin', label: '최고관리자' },
  { value: 'APPROVED', label: '승인' },
  { value: 'DENIED', label: '거부' },
  { value: 'UNAUTHED', label: '미인증' },
] as const

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
  const sortBy = sp.sortBy
  const sortOrder = sp.sortOrder || 'asc'
  const groupId = sp.groupId ? Number(sp.groupId) : undefined
  const caller = await getServerCaller()

  // 필터 탭 로직
  const activeFilter = sp.filter ?? ''
  const isFilterAdmin = activeFilter === 'admin'
  const statusFromFilter = activeFilter && activeFilter !== 'admin' ? activeFilter : sp.status

  // REQ-MADM-019: "기본 설정" 탭의 프로필사진 노출 토글을 실제로 반영한다.
  const [data, defaultSettings, memberGroups] = await Promise.all([
    caller.admin.user.list({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchTarget: sp.searchTarget ? (sp.searchTarget as any) : undefined,
      searchQuery: sp.searchQuery,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: statusFromFilter ? (statusFromFilter as any) : undefined,
      filterAdmin: isFilterAdmin ? true : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortBy: sortBy ? (sortBy as any) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortOrder: sortOrder ? (sortOrder as any) : undefined,
      groupId,
      page,
      pageSize: 50,
    }),
    caller.admin.settings.getDefault(),
    caller.admin.group.list(),
  ])
  const showProfilePhoto = defaultSettings.showProfilePhotoInList

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
                  ...(sp.searchTarget ? { searchTarget: sp.searchTarget } : {}),
                  ...(sp.searchQuery ? { searchQuery: sp.searchQuery } : {}),
                  ...(tab.value ? { filter: tab.value } : {}),
                  ...(sp.status ? { status: sp.status } : {}),
                  ...(sp.groupId ? { groupId: sp.groupId } : {}),
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
      <form className="flex gap-2 mb-4 flex-wrap">
        <select
          name="searchTarget"
          defaultValue={sp.searchTarget ?? ''}
          className="border border-zinc-300 rounded px-3 py-1 text-sm"
        >
          <option value="">전체</option>
          <option value="userId">아이디</option>
          <option value="emailAddress">이메일</option>
          <option value="nickName">닉네임</option>
          <option value="phoneNumber">전화번호</option>
          <option value="lastLoginAt">최근 로그인일시</option>
          <option value="description">관리자 메모</option>
        </select>
        <input
          name="searchQuery"
          defaultValue={sp.searchQuery ?? ''}
          placeholder="검색어 입력"
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
        <select
          name="groupId"
          defaultValue={sp.groupId ?? ''}
          className="border border-zinc-300 rounded px-3 py-1 text-sm"
        >
          <option value="">그룹전체</option>
          {memberGroups.map((group: { id: number; title: string }) => (
            <option key={group.id} value={group.id.toString()}>
              {group.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1 text-sm bg-zinc-800 text-white rounded hover:bg-zinc-700"
        >
          검색
        </button>
      </form>

      {/* 회원 목록 테이블 - M5: 체크박스 + bulk 삭제 */}
      <MemberTable
        users={data.users}
        total={data.total}
        showProfilePhoto={showProfilePhoto}
        searchParams={searchParams}
      />
    </div>
  )
}
