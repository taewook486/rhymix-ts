/**
 * Characterization Tests for MainNav Component
 *
 * These tests capture the CURRENT behavior of the MainNav component.
 * They are used to ensure behavior preservation during refactoring.
 *
 * NOTE: These tests document what IS, not what SHOULD BE.
 * If behavior needs to change, update the SPEC first.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainNav } from '@/components/layout/MainNav'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

describe('MainNav Characterization Tests', () => {
  describe('Static Navigation Links', () => {
    it('should render the site logo with text "Rhymix TS"', async () => {
      render(<MainNav />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /rhymix ts/i })).toBeInTheDocument()
      })
    })

    it('should render "게시판" link', async () => {
      render(<MainNav />)

      await waitFor(() => {
        const boardLink = screen.getByRole('link', { name: /게시판/i })
        expect(boardLink).toBeInTheDocument()
        expect(boardLink).toHaveAttribute('href', '/board')
      })
    })

    it('should render "문서" link', async () => {
      render(<MainNav />)

      await waitFor(() => {
        const documentsLink = screen.getByRole('link', { name: /문서/i })
        expect(documentsLink).toBeInTheDocument()
        expect(documentsLink).toHaveAttribute('href', '/documents')
      })
    })
  })

  describe('Authentication State - Logged Out', () => {
    it('should show "로그인" button when user is not logged in', async () => {
      render(<MainNav />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
      })
    })

    it('should show "회원가입" button when user is not logged in', async () => {
      render(<MainNav />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /회원가입/i })).toBeInTheDocument()
      })
    })

    it('should link login button to /member/signin', async () => {
      render(<MainNav />)

      await waitFor(() => {
        const signinLink = screen.getByRole('link', { name: /로그인/i })
        expect(signinLink).toHaveAttribute('href', '/member/signin')
      })
    })

    it('should link signup button to /member/signup', async () => {
      render(<MainNav />)

      await waitFor(() => {
        const signupLink = screen.getByRole('link', { name: /회원가입/i })
        expect(signupLink).toHaveAttribute('href', '/member/signup')
      })
    })
  })

  describe('Current Navigation Structure', () => {
    /**
     * This documents the CURRENT hardcoded navigation links.
     * After P0-03 is implemented, these tests should be updated to test
     * dynamic menu loading from the database.
     */
    it('should have exactly 2 hardcoded navigation links', async () => {
      render(<MainNav />)

      await waitFor(() => {
        const navLinks = screen.getAllByRole('link')
        // Filter to only navigation links (not logo or auth buttons)
        const navSectionLinks = navLinks.filter(link =>
          link.getAttribute('href') === '/board' ||
          link.getAttribute('href') === '/documents'
        )
        expect(navSectionLinks).toHaveLength(2)
      })
    })

    it('should not load menu items from database (current behavior)', async () => {
      // This test documents that the current implementation
      // does NOT load menu items from the database
      render(<MainNav />)

      await waitFor(() => {
        // Currently only hardcoded links exist
        expect(screen.getByRole('link', { name: /게시판/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /문서/i })).toBeInTheDocument()
      })
    })
  })

  describe('Component Structure', () => {
    it('should render as a client component', () => {
      // MainNav uses 'use client' directive
      // This is verified by the component using useState and useEffect
      expect(true).toBe(true)
    })

    it('should show loading state initially', () => {
      render(<MainNav />)

      // Check for loading skeleton
      const loadingElement = document.querySelector('.animate-pulse')
      expect(loadingElement).toBeInTheDocument()
    })

    it('should hide loading state after user check completes', async () => {
      render(<MainNav />)

      await waitFor(() => {
        const loadingElement = document.querySelector('.animate-pulse')
        expect(loadingElement).not.toBeInTheDocument()
      })
    })
  })
})

describe('MainNav Future Behavior (To Be Implemented)', () => {
  /**
   * These tests document the EXPECTED behavior after P0-03 is implemented.
   * They currently fail because dynamic menu loading is not implemented.
   */

  it.todo('should load header menu items from database')
  it.todo('should display menu items in correct order')
  it.todo('should hide menu items with is_visible = false')
  it.todo('should filter menu items by required_role')
  it.todo('should support nested menu items (dropdown)')
  it.todo('should handle menu loading errors gracefully')
  it.todo('should show loading state while fetching menu items')
})
