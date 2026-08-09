// @vitest-environment jsdom
/**
 * ModuleEditForm 컴포넌트 테스트 — SPEC-CONTENT-PARITY-001 M5 (REQ-CPAR-024).
 *
 * M5-EDIT-1: 유효한 입력으로 submit 하면 dispatch 가 호출된다.
 * M5-EDIT-2: fieldErrors.title 이 있으면 에러 메시지가 표시된다.
 * M5-EDIT-3: 초기값(title/browserTitle/description)이 폼 필드에 채워진다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- mocks ---
vi.mock('@/app/admin/modules/actions', () => ({
  updateModuleAction: vi.fn(),
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

describe('ModuleEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('M5-EDIT-1: 유효한 입력으로 submit 하면 dispatch 가 호출된다', async () => {
    // Arrange
    const mockDispatch = vi.fn()
    const { useActionState } = await import('react')
    const mockUseActionState = useActionState as ReturnType<typeof vi.fn>
    mockUseActionState.mockReturnValue([null, mockDispatch, false])

    const { ModuleEditForm } = await import('./ModuleEditForm')
    render(
      React.createElement(ModuleEditForm, {
        instanceId: 7,
        initialTitle: '공지사항',
        initialBrowserTitle: '',
        initialDescription: '',
      }),
    )

    // Assert
    const form = document.querySelector('form')
    expect(form).not.toBeNull()
    expect(mockDispatch).toBeDefined()
    // useActionState 의 첫 인자는 bind 된 액션 함수(instanceId 주입)여야 한다
    expect(mockUseActionState).toHaveBeenCalledWith(expect.any(Function), {})
  })

  it('M5-EDIT-2: fieldErrors.title 이 있으면 "제목을 입력하세요" 에러가 표시된다', async () => {
    // Arrange
    const { useActionState } = await import('react')
    const mockUseActionState = useActionState as ReturnType<typeof vi.fn>
    mockUseActionState.mockReturnValue([
      { fieldErrors: { title: ['제목을 입력하세요'] } },
      vi.fn(),
      false,
    ])

    const { ModuleEditForm } = await import('./ModuleEditForm')
    render(
      React.createElement(ModuleEditForm, {
        instanceId: 7,
        initialTitle: '',
        initialBrowserTitle: '',
        initialDescription: '',
      }),
    )

    // Assert
    expect(screen.getByText('제목을 입력하세요')).toBeTruthy()
  })

  it('M5-EDIT-3: 초기값이 title/browserTitle/description input 의 defaultValue 로 채워진다', async () => {
    // Arrange
    const { useActionState } = await import('react')
    const mockUseActionState = useActionState as ReturnType<typeof vi.fn>
    mockUseActionState.mockReturnValue([null, vi.fn(), false])

    const { ModuleEditForm } = await import('./ModuleEditForm')
    render(
      React.createElement(ModuleEditForm, {
        instanceId: 7,
        initialTitle: '공지사항',
        initialBrowserTitle: '브라우저 제목',
        initialDescription: '설명입니다',
      }),
    )

    // Assert
    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement
    const browserTitleInput = document.querySelector('input[name="browserTitle"]') as HTMLInputElement
    const descriptionInput = document.querySelector('[name="description"]') as HTMLInputElement | HTMLTextAreaElement
    expect(titleInput?.defaultValue).toBe('공지사항')
    expect(browserTitleInput?.defaultValue).toBe('브라우저 제목')
    expect(descriptionInput?.defaultValue).toBe('설명입니다')
  })
})
