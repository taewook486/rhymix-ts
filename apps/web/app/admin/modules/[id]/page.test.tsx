// @vitest-environment jsdom
/**
 * ModuleDetailPage 테스트 — SPEC-CONTENT-PARITY-001 M5 (REQ-CPAR-025).
 *
 * M5-DETAIL-1: board 타입 모듈이면 per-board 관리 링크(분류/확장변수/권한/피드)가 노출된다.
 * M5-DETAIL-2: board 가 아닌 타입(page)이면 per-board 관리 링크가 노출되지 않는다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn(),
}))

vi.mock('@/lib/admin/site-context', () => ({
  getCurrentSiteId: vi.fn().mockResolvedValue(1),
}))

vi.mock('@rhymix-ts/ui/components', () => ({
  Button: ({ children, asChild, ...props }: React.PropsWithChildren<{ asChild?: boolean } & React.HTMLAttributes<HTMLElement>>) =>
    asChild ? React.createElement(React.Fragment, null, children) : React.createElement('button', props, children),
}))

import { getServerCaller } from '@/lib/trpc/server'

const mockGetServerCaller = getServerCaller as unknown as ReturnType<typeof vi.fn>

describe('ModuleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('M5-DETAIL-1: board 타입 모듈이면 per-board 관리 링크 4종이 노출된다 (REQ-CPAR-025)', async () => {
    // Arrange
    const mockGetById = vi.fn().mockResolvedValue({
      id: 7,
      mid: 'notice',
      title: '공지사항',
      browserTitle: null,
      moduleCode: 'board',
      moduleName: 'board',
      layoutId: null,
      mobileLayoutId: null,
      skin: null,
      mobileSkin: null,
      menuId: null,
      category: null,
      config: null,
      extraVars: null,
      rssEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockGetServerCaller.mockResolvedValue({ admin: { module: { getById: mockGetById } } })

    const { default: ModuleDetailPage } = await import('./page')
    const node = await ModuleDetailPage({ params: Promise.resolve({ id: '7' }) })
    render(node as React.ReactElement)

    // Assert — per-board 관리 화면 4종 링크
    expect(screen.getByRole('link', { name: /분류/ }).getAttribute('href')).toBe(
      '/admin/boards/notice/categories',
    )
    expect(screen.getByRole('link', { name: /확장.*변수/ }).getAttribute('href')).toBe(
      '/admin/boards/notice/extra-keys',
    )
    expect(screen.getByRole('link', { name: /권한/ }).getAttribute('href')).toBe(
      '/admin/boards/notice/permissions',
    )
    expect(screen.getByRole('link', { name: /피드/ }).getAttribute('href')).toBe(
      '/admin/boards/notice/feed',
    )
  })

  it('M5-DETAIL-2: board 타입이 아니면 per-board 관리 링크가 노출되지 않는다 (REQ-CPAR-025 Edge)', async () => {
    // Arrange
    const mockGetById = vi.fn().mockResolvedValue({
      id: 8,
      mid: 'about',
      title: '소개',
      browserTitle: null,
      moduleCode: 'page',
      moduleName: 'page',
      layoutId: null,
      mobileLayoutId: null,
      skin: null,
      mobileSkin: null,
      menuId: null,
      category: null,
      config: null,
      extraVars: null,
      rssEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockGetServerCaller.mockResolvedValue({ admin: { module: { getById: mockGetById } } })

    const { default: ModuleDetailPage } = await import('./page')
    const node = await ModuleDetailPage({ params: Promise.resolve({ id: '8' }) })
    render(node as React.ReactElement)

    // Assert
    expect(screen.queryByRole('link', { name: /분류/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /확장.*변수/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /권한/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /피드/ })).toBeNull()
  })
})
