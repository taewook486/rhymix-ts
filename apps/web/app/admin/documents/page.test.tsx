// @vitest-environment jsdom
/**
 * 문서 관리 페이지 배선 테스트 — SPEC-CONTENT-PARITY-001 M3 (AC-CPAR-006, AC-CPAR-008).
 *
 * 기계 검증: `grep -c "Dynamic board options" apps/web/app/admin/documents/page.tsx` → 0
 *           `grep -c "TODO: Server Action 연동 필요" apps/web/app/admin/documents/page.tsx` → 0
 * (이 테스트는 그 grep이 검증하지 못하는 "실제 필터/게시판 동적 옵션/IP 컬럼/신고 링크 렌더"를 확인한다)
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

const fakeDocuments = {
  items: [
    {
      id: 1,
      title: '테스트 문서',
      status: 'PUBLIC',
      nickName: '작성자A',
      ipAddress: '127.0.0.1',
      regdate: new Date('2026-08-01'),
      board: { mid: 'freeboard', name: '자유게시판' },
    },
    {
      id: 2,
      title: '임시 문서',
      status: 'TEMP',
      nickName: '작성자B',
      ipAddress: '10.0.0.5',
      regdate: new Date('2026-08-02'),
      board: { mid: 'freeboard', name: '자유게시판' },
    },
  ],
  nextCursor: null,
  total: 2,
}

const fakeBoards = [
  { id: 1, name: '자유게시판', moduleInstance: { mid: 'freeboard', moduleCode: 'board' } },
  { id: 2, name: '공지사항', moduleInstance: { mid: 'notice', moduleCode: 'board' } },
]

const mockListAcrossAllBoards = vi.fn().mockResolvedValue(fakeDocuments)
const mockBoardList = vi.fn().mockResolvedValue(fakeBoards)

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn().mockResolvedValue({
    admin: {
      document: {
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
      document: {
        bulkUpdate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        recoverTemp: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        deleteTemp: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}))

describe('AdminDocumentsPage (SPEC-CONTENT-PARITY-001 M3)', () => {
  it('M3-DOC-1: 게시판 select가 admin.board.list 결과로 동적 렌더된다 (AC-CPAR-006)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminDocumentsPage } = await import('./page')
    const result = await AdminDocumentsPage({ searchParams: Promise.resolve({}) })
    const { container } = render(result as React.ReactElement)

    const boardSelect = container.querySelector('#boardId-filter')
    expect(boardSelect).toBeTruthy()
    const optionLabels = Array.from(boardSelect?.querySelectorAll('option') ?? []).map(
      (opt) => opt.textContent,
    )
    expect(optionLabels).toContain('자유게시판')
    expect(optionLabels).toContain('공지사항')
  })

  it('M3-DOC-2: IP 컬럼이 렌더되고 신고 문서 링크가 존재한다 (AC-CPAR-008)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminDocumentsPage } = await import('./page')
    const result = await AdminDocumentsPage({ searchParams: Promise.resolve({}) })
    const { getByText, container } = render(result as React.ReactElement)

    expect(getByText('127.0.0.1')).toBeTruthy()
    const declaredLink = container.querySelector('a[href="/admin/documents/declared"]')
    expect(declaredLink).toBeTruthy()
  })

  it('M3-DOC-3: TEMP 문서에 복구/삭제 버튼이 클릭 가능한 상태로 렌더된다 (REQ-CPAR-012)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminDocumentsPage } = await import('./page')
    const result = await AdminDocumentsPage({ searchParams: Promise.resolve({}) })
    const { getAllByText } = render(result as React.ReactElement)

    const recoverButtons = getAllByText('복구')
    expect(recoverButtons.length).toBeGreaterThan(0)
    expect((recoverButtons[0] as HTMLButtonElement).disabled).toBe(false)
  })

  it('M3-DOC-4: listAcrossAllBoards 조회 시 searchParams(status/boardId/ip/search)가 전달된다 (AC-CPAR-006)', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 1, isAdmin: true },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { default: AdminDocumentsPage } = await import('./page')
    await AdminDocumentsPage({
      searchParams: Promise.resolve({
        status: 'PUBLIC',
        boardId: '1',
        ip: '127.0.0.1',
        search: 'foo',
      }),
    })

    expect(mockListAcrossAllBoards).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PUBLIC',
        moduleInstanceId: 1,
        ip: '127.0.0.1',
        search: 'foo',
      }),
    )
  })

  it('M3-DOC-5: 비관리자는 / 로 redirect 한다', async () => {
    const { auth } = await import('@/lib/auth/config')
    const { isAdminSession } = await import('@/lib/auth/admin-middleware')
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 2, isAdmin: false },
    })
    ;(isAdminSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { default: AdminDocumentsPage } = await import('./page')

    await expect(
      AdminDocumentsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow('NEXT_REDIRECT:/')
  })
})
