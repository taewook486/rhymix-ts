// @vitest-environment jsdom
/**
 * DocumentTableClient 상호작용 테스트 — SPEC-CONTENT-PARITY-001 M3
 * (AC-CPAR-007 일괄 작업 영속, AC-CPAR-008 TEMP 복구/삭제).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockBulkUpdateMutate = vi.fn()
const mockRecoverTempMutate = vi.fn()
const mockDeleteTempMutate = vi.fn()

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      document: {
        bulkUpdate: {
          useMutation: () => ({ mutate: mockBulkUpdateMutate, isPending: false }),
        },
        recoverTemp: {
          useMutation: () => ({ mutate: mockRecoverTempMutate, isPending: false }),
        },
        deleteTemp: {
          useMutation: () => ({ mutate: mockDeleteTempMutate, isPending: false }),
        },
      },
    },
  },
}))

const documents = {
  items: [
    {
      id: 1,
      title: '문서1',
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
  nextCursor: 'cursor-2',
  total: 2,
}

const boards = [{ id: 1, name: '자유게시판' }]

describe('DocumentTableClient (SPEC-CONTENT-PARITY-001 M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('DOC-TBL-1: 행 체크 후 일괄 작업 실행 시 bulkUpdate가 선택된 documentIds로 호출된다 (AC-CPAR-007)', async () => {
    const { DocumentTableClient } = await import('./DocumentTableClient')
    render(
      <DocumentTableClient documents={documents} boards={boards} searchParams={{}} />,
    )

    fireEvent.click(screen.getByLabelText('문서 1 선택'))
    fireEvent.click(screen.getByLabelText('일괄 작업'))
    // default action is '휴지통 이동' (trash)
    fireEvent.click(screen.getByText('실행'))
    // confirm dialog appears — click the confirm button inside it
    fireEvent.click(screen.getAllByText('실행')[screen.getAllByText('실행').length - 1]!)

    expect(mockBulkUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ documentIds: [1], action: 'trash' }),
    )
  })

  it('DOC-TBL-2: TEMP 문서 삭제 버튼은 confirm 승인 후 deleteTemp를 호출한다 (REQ-CPAR-012)', async () => {
    const { DocumentTableClient } = await import('./DocumentTableClient')
    render(
      <DocumentTableClient documents={documents} boards={boards} searchParams={{}} />,
    )

    const deleteButtons = screen.getAllByText('삭제')
    fireEvent.click(deleteButtons[0]!)

    expect(window.confirm).toHaveBeenCalled()
    expect(mockDeleteTempMutate).toHaveBeenCalledWith({ documentId: 2 })
  })

  it('DOC-TBL-3: TEMP 문서 복구 버튼은 confirm 없이 즉시 recoverTemp를 호출한다 (REQ-CPAR-012)', async () => {
    const { DocumentTableClient } = await import('./DocumentTableClient')
    render(
      <DocumentTableClient documents={documents} boards={boards} searchParams={{}} />,
    )

    fireEvent.click(screen.getByText('복구'))

    expect(mockRecoverTempMutate).toHaveBeenCalledWith({ documentId: 2 })
  })

  it('DOC-TBL-4: 더 보기 링크는 cursor 쿼리 파라미터를 포함한다 (REQ-CPAR-013)', async () => {
    const { DocumentTableClient } = await import('./DocumentTableClient')
    const { container } = render(
      <DocumentTableClient documents={documents} boards={boards} searchParams={{ status: 'PUBLIC' }} />,
    )

    const loadMoreLink = container.querySelector('a[href*="cursor=cursor-2"]')
    expect(loadMoreLink).toBeTruthy()
    expect(loadMoreLink?.getAttribute('href')).toContain('status=PUBLIC')
  })

  it('DOC-TBL-5: IP 링크는 ip 쿼리 파라미터로 필터링한다 (REQ-CPAR-014b)', async () => {
    const { DocumentTableClient } = await import('./DocumentTableClient')
    const { container } = render(
      <DocumentTableClient documents={documents} boards={boards} searchParams={{}} />,
    )

    const ipLink = container.querySelector('a[href*="ip=127.0.0.1"]')
    expect(ipLink).toBeTruthy()
  })
})
