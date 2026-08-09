// @vitest-environment jsdom
/**
 * CommentTableClient 상호작용 테스트 — SPEC-CONTENT-PARITY-001 M3
 * (AC-CPAR-010 일괄 삭제 영속).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockBulkDeleteMutate = vi.fn()

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      comment: {
        bulkDelete: {
          useMutation: () => ({ mutate: mockBulkDeleteMutate, isPending: false }),
        },
      },
    },
  },
}))

const comments = {
  items: [
    {
      id: 1,
      content: '댓글1',
      nickName: '작성자A',
      isSecret: false,
      regdate: new Date('2026-08-01'),
      document: { id: 10, title: '원본 문서', boardId: 1 },
    },
    {
      id: 2,
      content: '댓글2',
      nickName: '작성자B',
      isSecret: true,
      regdate: new Date('2026-08-02'),
      document: { id: 10, title: '원본 문서', boardId: 1 },
    },
  ],
  nextCursor: 'cursor-2',
  total: 2,
}

describe('CommentTableClient (SPEC-CONTENT-PARITY-001 M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CMT-TBL-1: 행 체크 후 일괄 삭제 확인 시 bulkDelete가 선택된 commentIds로 호출된다 (AC-CPAR-010)', async () => {
    const { CommentTableClient } = await import('./CommentTableClient')
    render(<CommentTableClient comments={comments} searchParams={{}} />)

    fireEvent.click(screen.getByLabelText('댓글 1 선택'))
    fireEvent.click(screen.getByLabelText('댓글 2 선택'))
    fireEvent.click(screen.getByText('일괄 삭제'))
    // confirm dialog appears — click "삭제" confirm button
    fireEvent.click(screen.getByText('삭제'))

    expect(mockBulkDeleteMutate).toHaveBeenCalledWith({ commentIds: [1, 2] })
  })

  it('CMT-TBL-2: 선택 0건 상태에서는 일괄 삭제 바가 렌더되지 않는다 (오류 없이 안내)', async () => {
    const { CommentTableClient } = await import('./CommentTableClient')
    render(<CommentTableClient comments={comments} searchParams={{}} />)

    expect(screen.queryByText('일괄 삭제')).toBeNull()
  })

  it('CMT-TBL-3: 더 보기 링크는 cursor 쿼리 파라미터를 포함한다 (REQ-CPAR-019)', async () => {
    const { CommentTableClient } = await import('./CommentTableClient')
    const { container } = render(
      <CommentTableClient comments={comments} searchParams={{ isSecret: 'true' }} />,
    )

    const loadMoreLink = container.querySelector('a[href*="cursor=cursor-2"]')
    expect(loadMoreLink).toBeTruthy()
    expect(loadMoreLink?.getAttribute('href')).toContain('isSecret=true')
  })

  it('CMT-TBL-4: 상태 컬럼에 공개/비밀 라벨을 표시한다 (AC-CPAR-009)', async () => {
    const { CommentTableClient } = await import('./CommentTableClient')
    render(<CommentTableClient comments={comments} searchParams={{}} />)

    expect(screen.getByText('공개')).toBeTruthy()
    expect(screen.getByText('비밀')).toBeTruthy()
  })
})
