// @vitest-environment jsdom
/**
 * FileManagementClient 상호작용 테스트 — SPEC-CONTENT-PARITY-001 M4
 * (REQ-CPAR-021 검색/타입 필터, REQ-CPAR-022 정렬, REQ-CPAR-023 선택 일괄 삭제).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockListQuery = vi.fn()
const mockOrphansQuery = vi.fn()
const mockPurgeMutateAsync = vi.fn()
const mockBulkDeleteMutate = vi.fn()
let bulkDeleteOnSuccess: (() => void) | undefined

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      file: {
        list: {
          useQuery: (input: unknown) => {
            mockListQuery(input)
            return { data: undefined, refetch: vi.fn() }
          },
        },
        listOrphans: {
          useQuery: (input: unknown) => {
            mockOrphansQuery(input)
            return { data: undefined }
          },
        },
        purgeOrphans: {
          useMutation: () => ({ mutateAsync: mockPurgeMutateAsync, isPending: false }),
        },
        bulkDelete: {
          useMutation: (opts?: { onSuccess?: () => void }) => {
            bulkDeleteOnSuccess = opts?.onSuccess
            return {
              mutate: (input: unknown) => {
                mockBulkDeleteMutate(input)
                bulkDeleteOnSuccess?.()
              },
              isPending: false,
            }
          },
        },
      },
    },
  },
}))

const initialFiles = {
  items: [
    {
      id: 1,
      sourceFilename: 'a.png',
      fileSize: BigInt(1024),
      downloadCount: 3,
      uploader: { id: 'u1', nickname: '홍길동' },
      document: null,
      regdate: new Date('2026-01-01'),
    },
    {
      id: 2,
      sourceFilename: 'b.png',
      fileSize: BigInt(2048),
      downloadCount: 1,
      uploader: null,
      document: null,
      regdate: new Date('2026-01-02'),
    },
  ],
  nextCursor: null,
  totalCount: 2,
}

const initialOrphans = { items: [], nextCursor: null }

describe('FileManagementClient (SPEC-CONTENT-PARITY-001 M4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('FILE-UI-1: 검색어 입력 시 admin.file.list 쿼리에 search 파라미터가 전달된다 (REQ-CPAR-021)', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    fireEvent.change(screen.getByLabelText('파일명 검색'), { target: { value: 'photo' } })

    expect(mockListQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'photo' }))
  })

  it('FILE-UI-2: 파일 타입 필터 선택 시 fileType 파라미터가 전달된다 (REQ-CPAR-021)', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    fireEvent.change(screen.getByLabelText('파일 타입'), { target: { value: 'image' } })

    expect(mockListQuery).toHaveBeenLastCalledWith(expect.objectContaining({ fileType: 'image' }))
  })

  it('FILE-UI-3: 정렬 기준 변경 시 sortBy 파라미터가 전달된다 (REQ-CPAR-022)', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    fireEvent.change(screen.getByLabelText('정렬'), { target: { value: 'size' } })

    expect(mockListQuery).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'size' }))
  })

  it('FILE-UI-4: 정렬 방향 토글 버튼 클릭 시 sortOrder가 반전된다 (REQ-CPAR-022)', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    expect(mockListQuery).toHaveBeenLastCalledWith(expect.objectContaining({ sortOrder: 'desc' }))

    fireEvent.click(screen.getByText('내림차순'))

    expect(mockListQuery).toHaveBeenLastCalledWith(expect.objectContaining({ sortOrder: 'asc' }))
  })

  it('FILE-UI-5: 전체 선택 체크박스는 모든 행을 선택한다', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    fireEvent.click(screen.getByLabelText('전체 선택'))

    expect(screen.getByLabelText('파일 1 선택')).toBeChecked()
    expect(screen.getByLabelText('파일 2 선택')).toBeChecked()
    expect(screen.getByText('선택 삭제 (2)')).toBeTruthy()
  })

  it('FILE-UI-6: 선택 삭제 버튼은 confirm 승인 후 bulkDelete를 선택된 fileIds로 호출한다 (REQ-CPAR-023)', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    fireEvent.click(screen.getByLabelText('파일 1 선택'))
    fireEvent.click(screen.getByText(/선택 삭제/))

    expect(window.confirm).toHaveBeenCalled()
    expect(mockBulkDeleteMutate).toHaveBeenCalledWith({ fileIds: [1] })
  })

  it('FILE-UI-7: 선택 항목이 없으면 선택 삭제 버튼이 렌더되지 않는다', async () => {
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    expect(screen.queryByText(/선택 삭제/)).toBeNull()
  })

  it('FILE-UI-8: 취소(confirm 거부) 시 bulkDelete가 호출되지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { FileManagementClient } = await import('./FileManagementClient')
    render(<FileManagementClient initialFiles={initialFiles} initialOrphans={initialOrphans} />)

    fireEvent.click(screen.getByLabelText('파일 1 선택'))
    fireEvent.click(screen.getByText(/선택 삭제/))

    expect(window.confirm).toHaveBeenCalled()
    expect(mockBulkDeleteMutate).not.toHaveBeenCalled()
  })
})
