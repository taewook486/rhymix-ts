// @vitest-environment jsdom
/**
 * ModuleTable 컴포넌트 테스트 (C-7 + Slice I-5).
 * C-7: 기존 테스트 — DeleteModuleButton 렌더링
 * I-5: 체크박스 + 액션바 + bulkDeleteModulesAction 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

// --- mocks ---
vi.mock('@rhymix-ts/ui/components', () => ({
  Table: ({ children }: React.PropsWithChildren) => React.createElement('table', null, children),
  TableHeader: ({ children }: React.PropsWithChildren) => React.createElement('thead', null, children),
  TableBody: ({ children }: React.PropsWithChildren) => React.createElement('tbody', null, children),
  TableRow: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement> & React.PropsWithChildren) =>
    React.createElement('tr', props, children),
  TableHead: ({ children }: React.PropsWithChildren) => React.createElement('th', null, children),
  TableCell: ({ children }: React.PropsWithChildren) => React.createElement('td', null, children),
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', props, children),
  Checkbox: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (v: boolean) => void } & React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', {
      type: 'checkbox',
      checked: checked ?? false,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked),
      ...props,
    }),
}))

vi.mock('./DeleteModuleButton', () => ({
  DeleteModuleButton: ({ instanceId, mid }: { instanceId: number; mid: string }) =>
    React.createElement('button', { 'data-testid': `delete-${instanceId}` }, `삭제:${mid}`),
}))

const mockBulkDeleteModulesAction = vi.fn()

vi.mock('@/lib/admin/module-actions', () => ({
  bulkDeleteModulesAction: (...args: unknown[]) => mockBulkDeleteModulesAction(...args),
}))

afterEach(() => {
  cleanup()
})

describe('ModuleTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-7: instances 배열을 받으면 각 행에 DeleteModuleButton 이 렌더된다', async () => {
    // Arrange
    const instances = [
      { id: 1, mid: 'notice', moduleCode: 'board', name: 'Notice', createdAt: new Date() },
    ]

    const { ModuleTable } = await import('./ModuleTable')
    render(React.createElement(ModuleTable, { instances, siteId: 1 }))

    // Assert — 삭제 버튼이 렌더됨
    const deleteButton = screen.getByTestId('delete-1')
    expect(deleteButton).toBeTruthy()
    // mid 가 표시됨
    expect(screen.getByText('notice')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Slice I-5: 체크박스 + 액션바 테스트 (REQ-ADMIN-090)
// ---------------------------------------------------------------------------

describe('ModuleTable 체크박스 + 일괄 작업 (Slice I-5 — REQ-ADMIN-090)', () => {
  const instances = [
    { id: 1, mid: 'notice', moduleCode: 'board', name: 'Notice', createdAt: new Date() },
    { id: 2, mid: 'gallery', moduleCode: 'gallery', name: 'Gallery', createdAt: new Date() },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockBulkDeleteModulesAction.mockResolvedValue({ deleted: 1, failed: [] })
  })

  it('I-5-1: 행 체크박스 토글 시 선택 상태가 반영된다', async () => {
    const { ModuleTable } = await import('./ModuleTable')
    render(React.createElement(ModuleTable, { instances, siteId: 1 }))

    // 첫 번째 행의 체크박스 찾기 (data-testid=row-checkbox-1)
    const rowCheckbox = screen.getByTestId('row-checkbox-1')
    expect(rowCheckbox).toBeTruthy()
    expect((rowCheckbox as HTMLInputElement).checked).toBe(false)

    // 체크박스 클릭
    fireEvent.click(rowCheckbox)
    expect((rowCheckbox as HTMLInputElement).checked).toBe(true)
  })

  it('I-5-2: 헤더 체크박스 → 모든 행 선택/해제', async () => {
    const { ModuleTable } = await import('./ModuleTable')
    render(React.createElement(ModuleTable, { instances, siteId: 1 }))

    const headerCheckbox = screen.getByTestId('header-checkbox')
    expect(headerCheckbox).toBeTruthy()

    // 헤더 체크박스 클릭 → 전체 선택
    fireEvent.click(headerCheckbox)

    const rowCheckbox1 = screen.getByTestId('row-checkbox-1')
    const rowCheckbox2 = screen.getByTestId('row-checkbox-2')
    expect((rowCheckbox1 as HTMLInputElement).checked).toBe(true)
    expect((rowCheckbox2 as HTMLInputElement).checked).toBe(true)
  })

  it('I-5-3: 0개 선택 시 액션바 비표시', async () => {
    const { ModuleTable } = await import('./ModuleTable')
    render(React.createElement(ModuleTable, { instances, siteId: 1 }))

    // 아무것도 선택 안 한 상태
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull()
  })

  it('I-5-4: 1개 이상 선택 시 액션바 표시 + 선택 삭제 버튼 클릭 → action 호출', async () => {
    // window.confirm mock
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { ModuleTable } = await import('./ModuleTable')
    render(React.createElement(ModuleTable, { instances, siteId: 1 }))

    // 첫 번째 행 선택
    const rowCheckbox1 = screen.getByTestId('row-checkbox-1')
    fireEvent.click(rowCheckbox1)

    // 액션바 표시
    const actionBar = screen.getByTestId('bulk-action-bar')
    expect(actionBar).toBeTruthy()
    expect(actionBar.textContent).toContain('1')

    // 선택 삭제 버튼 클릭
    const deleteBtn = screen.getByTestId('bulk-delete-btn')
    fireEvent.click(deleteBtn)

    // action 이 호출됨
    expect(mockBulkDeleteModulesAction).toHaveBeenCalledWith([1])
  })
})
