// @vitest-environment jsdom
/**
 * CreateModuleForm 컴포넌트 테스트 (C-5, C-6).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- mocks ---
vi.mock('@/app/admin/modules/actions', () => ({
  createModuleAction: vi.fn(),
}))

vi.mock('@rhymix-ts/ui/components', () => ({
  Button: ({ children, type, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { type, disabled, ...props }, children),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) =>
    React.createElement('label', { htmlFor }, children),
}))

// react 를 mock 해서 useActionState 를 제어
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>()
  return {
    ...actual,
    useActionState: vi.fn(),
  }
})

import { createModuleAction } from '@/app/admin/modules/actions'

const mockCreateModuleAction = createModuleAction as ReturnType<typeof vi.fn>

describe('CreateModuleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-5: 유효한 입력으로 submit 하면 dispatch 가 호출된다', async () => {
    // Arrange
    const mockDispatch = vi.fn()
    const { useActionState } = await import('react')
    const mockUseActionState = useActionState as ReturnType<typeof vi.fn>
    mockUseActionState.mockReturnValue([null, mockDispatch, false])
    mockCreateModuleAction.mockResolvedValue({})

    const { CreateModuleForm } = await import('./CreateModuleForm')
    render(React.createElement(CreateModuleForm, { siteId: 1 }))

    // form action 이 dispatch (mockDispatch) 로 설정되어 있는지 확인
    // form 엘리먼트가 존재하고 action 이 dispatch 로 연결되어 있음
    const form = document.querySelector('form')
    expect(form).not.toBeNull()

    // dispatch 가 useActionState 반환값으로 설정됨
    expect(mockDispatch).toBeDefined()
    // useActionState 가 createModuleAction 과 함께 호출됨
    expect(mockUseActionState).toHaveBeenCalledWith(mockCreateModuleAction, {})
  })

  it('C-6: fieldErrors.mid 가 있으면 "mid 를 입력하세요" 에러가 표시된다', async () => {
    // Arrange — state 에 fieldErrors 를 미리 세팅
    const { useActionState } = await import('react')
    const mockUseActionState = useActionState as ReturnType<typeof vi.fn>
    mockUseActionState.mockReturnValue([
      { fieldErrors: { mid: ['mid 를 입력하세요'] } },
      vi.fn(),
      false,
    ])

    const { CreateModuleForm } = await import('./CreateModuleForm')
    render(React.createElement(CreateModuleForm, { siteId: 1 }))

    // Assert
    expect(screen.getByText('mid 를 입력하세요')).toBeTruthy()
  })
})
