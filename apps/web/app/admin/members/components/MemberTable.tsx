'use client'
/**
 * 회원 목록 테이블 컴포넌트 — SPEC-MEMBER-PARITY-001 M5.
 *
 * 체크박스, bulk 삭제 기능을 담당하는 Client Component.
 * Server Component인 page.tsx에서 사용된다.
 *
 * @MX:NOTE: [AUTO] 체크박스 상태는 현재 페이지만 유지 (REQ-MPAR-016).
 *           페이지네이션 간 상태 유지是不 필요(AP-MP-002 참조).
 * @MX:SPEC: SPEC-MEMBER-PARITY-001 REQ-MPAR-016~020
 */
import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/providers/TRPCProvider'
import { toast } from 'sonner'

interface User {
  id: number
  userId: string
  nickName: string
  emailAddress: string
  status: string
  isAdmin: boolean
  lastLoginAt: Date | null
  createdAt: Date | null
}

interface MemberTableProps {
  users: User[]
  total: number
  showProfilePhoto: boolean
  searchParams: Record<string, string | string[] | undefined>
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: '승인',
  UNAUTHED: '미인증',
  SUSPENDED: '정지',
  DENIED: '차단',
  DELETED: '삭제',
}

const sortableColumns = {
  userId: 'ID',
  nickName: '닉네임',
  emailAddress: '이메일',
  createdAt: '가입일',
  lastLoginAt: '최근 로그인',
} as const

export function MemberTable({ users, total, showProfilePhoto, searchParams }: MemberTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

  const bulkDeleteMutation = trpc.admin.user.bulk.useMutation({
    onSuccess: () => {
      toast.success('선택한 회원을 삭제했습니다.')
      setSelectedIds(new Set())
      // 페이지 새로고침
      window.location.reload()
    },
    onError: (error) => {
      toast.error('삭제 실패', { description: error.message })
    },
  })

  // 현재 페이지 전체 선택/해제
  const currentVisibleIds = new Set(users.map(u => u.id))
  const allSelected = currentVisibleIds.size > 0 && currentVisibleIds.size === selectedIds.size &&
                      [...currentVisibleIds].every(id => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(currentVisibleIds)
    }
  }

  const toggleRow = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = () => {
    setIsConfirmDialogOpen(true)
  }

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate({
      ids: Array.from(selectedIds),
      action: 'delete',
    })
    setIsConfirmDialogOpen(false)
  }

  // 정렬 링크 생성 헬퍼
  const createSortLink = (column: string) => {
    const sortBy = searchParams.sortBy
    const sortOrder = searchParams.sortOrder || 'asc'
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc'

    // 쿼리 파라미터가 배열이면 첫 값만 사용 (Next.js App Router 다중값 처리)
    const normalize = (value: string | string[] | undefined): string | undefined => {
      if (Array.isArray(value)) return value[0]
      return value
    }

    const params = new URLSearchParams()
    const searchTarget = normalize(searchParams.searchTarget)
    const searchQuery = normalize(searchParams.searchQuery)
    const filter = normalize(searchParams.filter)
    const status = normalize(searchParams.status)
    const groupId = normalize(searchParams.groupId)
    const page = normalize(searchParams.page)

    if (searchTarget) params.set('searchTarget', searchTarget)
    if (searchQuery) params.set('searchQuery', searchQuery)
    if (filter) params.set('filter', filter)
    if (status) params.set('status', status)
    if (groupId) params.set('groupId', groupId)
    if (page) params.set('page', page)
    params.set('sortBy', column)
    params.set('sortOrder', newSortOrder)

    return `?${params.toString()}`
  }

  return (
    <>
      {/* Bulk 삭제 버튼 */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm text-zinc-600">
            {selectedIds.size}명 선택됨
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            선택 삭제
          </button>
        </div>
      )}

      {/* 회원 목록 테이블 */}
      <div className="text-sm text-zinc-500 mb-2">총 {total}명</div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            {/* 체크박스 헤더 */}
            <th className="text-left px-3 py-2 font-medium w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4"
                aria-label="전체 선택"
              />
            </th>
            {showProfilePhoto && <th className="text-left px-3 py-2 font-medium">프로필</th>}
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('userId')}
                className="hover:underline group"
              >
                ID
                {searchParams.sortBy === 'userId' && (
                  <span className="ml-1 text-zinc-600">
                    {searchParams.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!searchParams.sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('nickName')}
                className="hover:underline group"
              >
                닉네임
                {searchParams.sortBy === 'nickName' && (
                  <span className="ml-1 text-zinc-600">
                    {searchParams.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!searchParams.sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('emailAddress')}
                className="hover:underline group"
              >
                이메일
                {searchParams.sortBy === 'emailAddress' && (
                  <span className="ml-1 text-zinc-600">
                    {searchParams.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!searchParams.sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
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
                {searchParams.sortBy === 'lastLoginAt' && (
                  <span className="ml-1 text-zinc-600">
                    {searchParams.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!searchParams.sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
            <th className="text-left px-3 py-2 font-medium">
              <Link
                href={createSortLink('createdAt')}
                className="hover:underline group"
              >
                가입일
                {searchParams.sortBy === 'createdAt' && (
                  <span className="ml-1 text-zinc-600">
                    {searchParams.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {!searchParams.sortBy && <span className="ml-1 text-zinc-300 opacity-0 group-hover:opacity-50">↕</span>}
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-zinc-200 hover:bg-zinc-50">
              {/* 체크박스 */}
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(user.id)}
                  onChange={() => toggleRow(user.id)}
                  className="h-4 w-4"
                  aria-label={`${user.userId} 선택`}
                />
              </td>
              {showProfilePhoto && (
                <td className="px-3 py-2">
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
          {users.length === 0 && (
            <tr>
              <td colSpan={showProfilePhoto ? 9 : 8} className="px-3 py-8 text-center text-zinc-400">
                회원이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 확인 다이얼로그 */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">회원 삭제 확인</h3>
            <p className="text-sm text-zinc-600 mb-6">
              {selectedIds.size}명의 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300"
              >
                {bulkDeleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
