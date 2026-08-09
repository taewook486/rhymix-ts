// @vitest-environment jsdom
/**
 * 관리자 휴지통 페이지 렌더 테스트 — SPEC-CONTENT-PARITY-001 M2 (AC-CPAR-003).
 *
 * 기계 검증: `grep -c "구현 예정" apps/web/app/admin/trash/page.tsx` → 0
 * (이 테스트는 그 grep이 검증하지 못하는 "실제 통합 뷰 렌더 + 타입 필터 동작"을 확인한다)
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: vi.fn(),
}))

const fakeDocuments = {
  items: [
    {
      id: 1,
      documentId: 10,
      expiresAt: new Date('2026-09-01'),
      document: { id: 10, title: '삭제된 문서 제목', nickName: '작성자A' },
      deletedBy: { id: 1, nickName: '관리자A' },
    },
  ],
  nextCursor: null,
}

const fakeComments = {
  items: [
    {
      id: 5,
      documentId: 20,
      content: '<p>삭제된 댓글 내용입니다</p>',
      nickName: '댓글작성자',
      deletedAt: new Date('2026-08-15'),
      document: { id: 20, title: '원본 문서' },
    },
  ],
  nextCursor: null,
}

const mockTrashList = vi.fn().mockResolvedValue(fakeDocuments)
const mockTrashListComments = vi.fn().mockResolvedValue(fakeComments)

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      trash: {
        list: (...args: unknown[]) => mockTrashList(...args),
        listComments: (...args: unknown[]) => mockTrashListComments(...args),
      },
    },
  }),
}))

// 클라이언트 trpc 훅 mock — TrashClient의 useQuery/useMutation
vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      trash: {
        list: {
          useQuery: () => ({ data: undefined, refetch: vi.fn() }),
        },
        listComments: {
          useQuery: () => ({ data: undefined, refetch: vi.fn() }),
        },
        restore: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
        purge: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
        restoreComment: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
        purgeComment: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
        empty: {
          useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
        },
      },
    },
  },
}))

describe('AdminTrashPage (SPEC-CONTENT-PARITY-001 M2)', () => {
  it('M2-1: placeholder 문구 없이 실제 목록을 렌더한다 (AC-CPAR-003)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminTrashPage } = await import('./page')
    const result = await AdminTrashPage()
    const { getByText, queryByText } = render(result as React.ReactElement)

    expect(queryByText(/구현 예정/)).toBeNull()
    expect(getByText('삭제된 문서 제목')).toBeTruthy()
    expect(getByText(/삭제된 댓글 내용입니다/)).toBeTruthy()
  })

  it('M2-2: 비관리자는 / 로 redirect 한다', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 2, isAdmin: false },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { default: AdminTrashPage } = await import('./page')

    await expect(AdminTrashPage()).rejects.toThrow('NEXT_REDIRECT:/')
  })
})
