// @vitest-environment jsdom
/**
 * Admin Layout 가드 테스트 (C-1, C-2).
 * RED 단계: layout.tsx 가 없으므로 두 테스트 모두 실패.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// --- Setup App Router mocks ---
import { setupAppRouterMocks } from '@rhymix-ts/test-utils';

setupAppRouterMocks();

// --- mocks ---
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: vi.fn(),
}))

// 2FA 헬퍼 mock — Slice I (REQ-ADMIN-023)
vi.mock('@/lib/auth/two-factor', () => ({
  isAdminTwoFactorRequired: vi.fn().mockResolvedValue(false),
  isSessionTwoFactorVerified: vi.fn().mockReturnValue(true),
}))

// layout.tsx가 next/headers의 headers()를 사용하므로 request scope 외부 오류 방지
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    set: vi.fn(),
    delete: vi.fn(),
    forEach: vi.fn(),
    toString: vi.fn(() => ''),
  })),
}))

// DB mock
vi.mock('@rhymix-ts/db', () => ({
  prisma: {},
}))

// admin 컴포넌트들 mock (layout 의존)
vi.mock('@/components/admin/AdminSidebar', () => ({
  AdminSidebar: () => React.createElement('nav', { 'data-testid': 'sidebar' }, '사이드바'),
}))

vi.mock('@/components/admin/AdminTopbar', () => ({
  AdminTopbar: ({ userName }: { userName: string }) =>
    React.createElement('header', { 'data-testid': 'topbar' }, `topbar:${userName}`),
}))

vi.mock('@rhymix-ts/ui/components', () => ({
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
}))

// AdminFooter는 layout-actions → trpc/server → appRouter 체인을 임포트해 hang 유발.
vi.mock('@/components/admin/AdminFooter', () => ({
  AdminFooter: () => React.createElement('footer', { 'data-testid': 'footer' }),
}))

// layout.tsx가 checkAdmin2FA를 직접 호출 (@/lib/auth/two-factor 가 아닌 @rhymix-ts/admin/security).
vi.mock('@rhymix-ts/admin/security', () => ({
  checkAdmin2FA: vi.fn().mockResolvedValue('pass'),
  getSiteAdminTwoFactorPolicy: vi.fn().mockResolvedValue('disabled'),
}))

import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { isAdminSession } from '@/lib/auth/admin-middleware'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>
const mockIsAdminSession = isAdminSession as unknown as ReturnType<typeof vi.fn>

describe('Admin Layout 가드', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-1: 비관리자 세션이면 /login?callbackUrl=/admin 으로 redirect 한다', async () => {
    // Arrange
    const nonAdminSession = { user: { id: 1, isAdmin: false } }
    mockAuth.mockResolvedValue(nonAdminSession)
    mockIsAdminSession.mockReturnValue(false)

    // Act — layout.tsx 를 동적 import 해 Server Component 를 실행
    const { default: AdminLayout } = await import('./layout')

    let redirectCalled = false
    let redirectUrl = ''
    mockRedirect.mockImplementation((url: string) => {
      redirectCalled = true
      redirectUrl = url
      throw new Error(`NEXT_REDIRECT:${url}`)
    })

    try {
      await AdminLayout({ children: React.createElement('div', null, '콘텐츠') })
    } catch (e) {
      // redirect 가 throw 하므로 catch 함
    }

    // Assert
    expect(mockIsAdminSession).toHaveBeenCalledWith(nonAdminSession)
    expect(redirectCalled).toBe(true)
    expect(redirectUrl).toBe('/login?callbackUrl=/admin')
  })

  it('C-2: 관리자 세션이면 redirect 없이 children 을 렌더한다', async () => {
    // Arrange
    const adminSession = { user: { id: 1, isAdmin: true } }
    mockAuth.mockResolvedValue(adminSession)
    mockIsAdminSession.mockReturnValue(true)

    // Act
    const { default: AdminLayout } = await import('./layout')
    const result = await AdminLayout({ children: React.createElement('div', { 'data-testid': 'children' }, '콘텐츠') })

    // render (Server Component 가 React element 를 반환)
    const { getByTestId, queryByTestId } = render(result as React.ReactElement)

    // Assert
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(getByTestId('children')).toBeTruthy()
  })
})
