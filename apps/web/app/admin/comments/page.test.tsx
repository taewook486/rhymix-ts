// @vitest-environment jsdom
/**
 * 댓글 관리 페이지 배선 테스트 — SPEC-CONTENT-PARITY-001 M3 (AC-CPAR-009, AC-CPAR-010).
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: vi.fn(),
}))

const fakeComments = {
  items: [
    {
      id: 1,
      content: '테스트 댓글',
      nickName: '작성자A',
      isSecret: false,
      regdate: new Date('2026-08-01'),
      document: { id: 10, title: '원본 문서', boardId: 1 },
    },
    {
      id: 2,
      content: '비밀 댓글',
      nickName: '작성자B',
      isSecret: true,
      regdate: new Date('2026-08-02'),
      document: { id: 10, title: '원본 문서', boardId: 1 },
    },
  ],
  nextCursor: null,
  total: 2,
}

const fakeBoards = [
  { id: 1, name: '자유게시판', moduleInstance: { mid: 'freeboard', moduleCode: 'board' } },
]

const mockListAcrossAllBoards = vi.fn().mockResolvedValue(fakeComments)
const mockBoardList = vi.fn().mockResolvedValue(fakeBoards)

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      comment: {
        listAcrossAllBoards: (...args: unknown[]) => mockListAcrossAllBoards(...args),
      },
      board: {
        list: (...args: unknown[]) => mockBoardList(...args),
      },
    },
  }),
}))

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      comment: {
        bulkDelete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}))

describe('AdminCommentsPage (SPEC-CONTENT-PARITY-001 M3)', () => {
  it('M3-CMT-1: 게시판 select가 admin.board.list 결과로 동적 렌더된다 (AC-CPAR-009)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminCommentsPage } = await import('./page')
    const result = await AdminCommentsPage({ searchParams: Promise.resolve({}) })
    const { getByText } = render(result as React.ReactElement)

    expect(getByText('자유게시판')).toBeTruthy()
  })

  it('M3-CMT-2: 신고 댓글 링크가 존재한다 (REQ-CPAR-020)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminCommentsPage } = await import('./page')
    const result = await AdminCommentsPage({ searchParams: Promise.resolve({}) })
    const { container } = render(result as React.ReactElement)

    const declaredLink = container.querySelector('a[href="/admin/comments/declared"]')
    expect(declaredLink).toBeTruthy()
  })

  it('M3-CMT-3: listAcrossAllBoards 조회 시 searchParams(boardId/isSecret/search)가 전달된다 (AC-CPAR-009)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminCommentsPage } = await import('./page')
    await AdminCommentsPage({
      searchParams: Promise.resolve({
        boardId: '1',
        isSecret: 'true',
        search: 'foo',
      }),
    })

    expect(mockListAcrossAllBoards).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleInstanceId: 1,
        isSecret: true,
        search: 'foo',
      }),
    )
  })

  it('M3-CMT-4: 비관리자는 / 로 redirect 한다', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 2, isAdmin: false },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { default: AdminCommentsPage } = await import('./page')

    await expect(
      AdminCommentsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow('NEXT_REDIRECT:/')
  })
})
