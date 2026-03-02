/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberDialog } from '@/components/admin/AddMemberDialog'

// Mock fetch
global.fetch = jest.fn()

// Mock useRouter
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

// Mock useToast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock window.location.reload
const mockReload = jest.fn()
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
})

describe('AddMemberDialog - Characterization Tests (Existing Behavior)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('Initial State', () => {
    it('should render "Add Member" button', () => {
      render(<AddMemberDialog />)

      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument()
    })

    it('should not show dialog initially', () => {
      render(<AddMemberDialog />)

      expect(screen.queryByText('Add New Member')).not.toBeInTheDocument()
    })
  })

  describe('Opening Dialog', () => {
    it('should open dialog when clicking "Add Member" button', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
        expect(screen.getByText('Create a new user account. An invitation email will be sent to the user.')).toBeInTheDocument()
      })
    })

    it('should show all form fields when dialog opens', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/temporary password/i)).toBeInTheDocument()
      })
    })

    it('should have default role set to "user"', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/role/i)).toHaveValue('user')
      })
    })
  })

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: '입력 오류',
            description: '이메일을 입력해주세요.',
          })
        )
      })
    })

    it('should show error when display name is empty', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: '입력 오류',
            description: '표시 이름을 입력해주세요.',
          })
        )
      })
    })

    it('should show error when password is empty', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: '입력 오류',
            description: '비밀번호를 입력해주세요.',
          })
        )
      })
    })

    it('should show error when password is less than 6 characters', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, '12345')

      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: '입력 오류',
            description: '비밀번호는 최소 6자 이상이어야 합니다.',
          })
        )
      })
    })
  })

  describe('Role Selection', () => {
    it('should allow changing role to "admin"', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
      })

      const roleSelect = screen.getByLabelText(/role/i)
      fireEvent.click(roleSelect)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /admin/i })).toBeInTheDocument()
      })

      const adminOption = screen.getByRole('option', { name: /admin/i })
      fireEvent.click(adminOption)

      await waitFor(() => {
        expect(roleSelect).toHaveValue('admin')
      })
    })
  })

  describe('Successful Member Creation', () => {
    it('should call API with correct data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Member created successfully' }),
      })

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            display_name: 'Test User',
            role: 'user',
            password: 'password123',
          }),
        })
      })
    })

    it('should show success toast on successful creation', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Member created successfully' }),
      })

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '회원 추가 완료',
            description: 'Test User 님이 추가되었습니다.',
          })
        )
      })
    })

    it('should reset form and close dialog after successful creation', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Member created successfully' }),
      })

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Add New Member')).not.toBeInTheDocument()
      })

      // Verify form is reset
      addButton.click()
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toHaveValue('')
        expect(screen.getByLabelText(/display name/i)).toHaveValue('')
        expect(screen.getByLabelText(/temporary password/i)).toHaveValue('')
      })
    })

    it('should reload page after successful creation', async () => {
      jest.useFakeTimers()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Member created successfully' }),
      })

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Fast-forward time by 100ms
      jest.advanceTimersByTime(100)

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })
  })

  describe('Failed Member Creation', () => {
    it('should show error toast on API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Email already exists' }),
      })

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: '회원 추가 실패',
            description: 'Email already exists',
          })
        )
      })
    })

    it('should keep dialog open on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Creation failed' }),
      })

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
      })

      // Dialog should still be open
      expect(screen.getByText('Add New Member')).toBeInTheDocument()
    })
  })

  describe('Cancel Button', () => {
    it('should close dialog without submitting', async () => {
      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Add New Member')).not.toBeInTheDocument()
      })

      // Verify API was not called
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner during creation', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument()
      })
    })

    it('should disable all inputs during creation', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<AddMemberDialog />)

      const addButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Member')).toBeInTheDocument()
      })

      // Fill form
      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'test@example.com')

      const displayNameInput = screen.getByLabelText(/display name/i)
      await userEvent.type(displayNameInput, 'Test User')

      const passwordInput = screen.getByLabelText(/temporary password/i)
      await userEvent.type(passwordInput, 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toBeDisabled()
        expect(displayNameInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
      })
    })
  })
})
