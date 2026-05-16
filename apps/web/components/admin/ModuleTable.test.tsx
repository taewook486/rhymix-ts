// @vitest-environment jsdom
/**
 * ModuleTable 컴포넌트 테스트 (C-7).
 * RED 단계: ModuleTable.tsx 가 없으므로 테스트 실패.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- mocks ---
vi.mock('@rhymix-ts/ui/components', () => ({
  Table: ({ children }: React.PropsWithChildren) => React.createElement('table', null, children),
  TableHeader: ({ children }: React.PropsWithChildren) => React.createElement('thead', null, children),
  TableBody: ({ children }: React.PropsWithChildren) => React.createElement('tbody', null, children),
  TableRow: ({ children }: React.PropsWithChildren) => React.createElement('tr', null, children),
  TableHead: ({ children }: React.PropsWithChildren) => React.createElement('th', null, children),
  TableCell: ({ children }: React.PropsWithChildren) => React.createElement('td', null, children),
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', props, children),
}))

vi.mock('./DeleteModuleButton', () => ({
  DeleteModuleButton: ({ instanceId, mid }: { instanceId: number; mid: string }) =>
    React.createElement('button', { 'data-testid': `delete-${instanceId}` }, `삭제:${mid}`),
}))

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
