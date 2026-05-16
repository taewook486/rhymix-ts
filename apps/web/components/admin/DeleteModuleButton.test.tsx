// @vitest-environment jsdom
/**
 * DeleteModuleButton 컴포넌트 테스트 (C-8).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// --- mocks ---
vi.mock('@/app/admin/modules/actions', () => ({
  deleteModuleAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@rhymix-ts/ui/components', () => {
  // Dialog 상태를 간단히 tracked 하는 mock
  let dialogOpen = false
  const setDialogOpen = (v: boolean) => { dialogOpen = v }

  return {
    Button: ({ children, onClick, disabled, variant, size }: {
      children?: React.ReactNode
      onClick?: React.MouseEventHandler
      disabled?: boolean
      variant?: string
      size?: string
    }) =>
      React.createElement(
        'button',
        { onClick, disabled, 'data-variant': variant, 'data-size': size },
        children
      ),
    Dialog: ({ children, open, onOpenChange }: {
      children: React.ReactNode
      open?: boolean
      onOpenChange?: (v: boolean) => void
    }) => {
      // open 상태를 자식에게 context 없이 전달하기 위해 모든 자식을 렌더
      return React.createElement('div', { 'data-testid': 'dialog', 'data-open': String(open) }, children)
    },
    DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      React.createElement('div', { 'data-testid': 'dialog-trigger' }, children),
    DialogContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'dialog-content' }, children),
    DialogHeader: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'dialog-header' }, children),
    DialogTitle: ({ children }: { children: React.ReactNode }) =>
      React.createElement('h2', null, children),
    DialogFooter: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'dialog-footer' }, children),
  }
})

import { deleteModuleAction } from '@/app/admin/modules/actions'
import { toast } from 'sonner'

const mockDeleteModuleAction = deleteModuleAction as unknown as ReturnType<typeof vi.fn>
const mockToast = toast as unknown as { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> }

describe('DeleteModuleButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-8: deleteModuleAction 이 에러를 반환하면 toast.error 가 호출된다', async () => {
    // Arrange
    const errorMessage = 'this instance is the index module of domain D'
    mockDeleteModuleAction.mockResolvedValue({ error: errorMessage })

    const { DeleteModuleButton } = await import('./DeleteModuleButton')
    render(React.createElement(DeleteModuleButton, { instanceId: 1, mid: 'notice' }))

    // 다이얼로그 내부의 destructive "삭제" 버튼들 중 footer 안의 버튼 찾기
    // DialogFooter 내부에서 destructive 버튼 찾기
    const footer = screen.getByTestId('dialog-footer')
    const deleteButtons = footer.querySelectorAll('button[data-variant="destructive"]')
    expect(deleteButtons.length).toBeGreaterThan(0)

    const confirmButton = deleteButtons[0] as HTMLButtonElement

    // Act
    await act(async () => {
      fireEvent.click(confirmButton)
    })

    // Assert
    await waitFor(() => {
      expect(mockDeleteModuleAction).toHaveBeenCalledWith(1)
      expect(mockToast.error).toHaveBeenCalledWith(errorMessage)
    })
  })
})
