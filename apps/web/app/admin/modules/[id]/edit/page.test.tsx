// @vitest-environment jsdom
/**
 * ModuleEditPage 테스트 — SPEC-CONTENT-PARITY-001 M5 (REQ-CPAR-024).
 *
 * M5-PAGE-1: 인스턴스가 존재하면 ModuleEditForm 에 초기값을 전달한다.
 * M5-PAGE-2: instanceId 가 숫자가 아니면 notFound() 를 호출한다.
 * M5-PAGE-3: getById 가 실패(NOT_FOUND)하면 notFound() 를 호출한다.
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

// ModuleEditForm 을 test-friendly 목으로 교체
vi.mock('./_components/ModuleEditForm', () => ({
  ModuleEditForm: ({
    instanceId,
    initialTitle,
    initialBrowserTitle,
    initialDescription,
  }: {
    instanceId: number
    initialTitle: string
    initialBrowserTitle: string
    initialDescription: string
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'module-edit-form' },
      React.createElement('span', { 'data-testid': 'instance-id' }, String(instanceId)),
      React.createElement('span', { 'data-testid': 'initial-title' }, initialTitle),
      React.createElement('span', { 'data-testid': 'initial-browser-title' }, initialBrowserTitle),
      React.createElement('span', { 'data-testid': 'initial-description' }, initialDescription),
    ),
}))

import { notFound } from 'next/navigation'
import { getServerCaller } from '@/lib/trpc/server'

const mockNotFound = notFound as unknown as ReturnType<typeof vi.fn>
const mockGetServerCaller = getServerCaller as unknown as ReturnType<typeof vi.fn>

describe('ModuleEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('M5-PAGE-1: 인스턴스가 존재하면 초기값을 ModuleEditForm 에 전달한다', async () => {
    // Arrange
    const mockGetById = vi.fn().mockResolvedValue({
      id: 7,
      mid: 'notice',
      title: '공지사항',
      browserTitle: '브라우저 제목',
      description: '설명입니다',
      moduleCode: 'board',
    })
    mockGetServerCaller.mockResolvedValue({ admin: { module: { getById: mockGetById } } })

    const { default: ModuleEditPage } = await import('./page')
    const node = await ModuleEditPage({ params: Promise.resolve({ id: '7' }) })
    render(node as React.ReactElement)

    // Assert
    expect(mockGetById).toHaveBeenCalledWith({ instanceId: 7 })
    expect(screen.getByTestId('instance-id').textContent).toBe('7')
    expect(screen.getByTestId('initial-title').textContent).toBe('공지사항')
    expect(screen.getByTestId('initial-browser-title').textContent).toBe('브라우저 제목')
    expect(screen.getByTestId('initial-description').textContent).toBe('설명입니다')
  })

  it('M5-PAGE-2: id 가 숫자가 아니면 notFound() 를 호출한다', async () => {
    // Arrange
    const { default: ModuleEditPage } = await import('./page')

    // Act & Assert
    await expect(
      ModuleEditPage({ params: Promise.resolve({ id: 'abc' }) }),
    ).rejects.toThrow('NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('M5-PAGE-3: getById 가 실패하면 notFound() 를 호출한다', async () => {
    // Arrange
    const mockGetById = vi.fn().mockRejectedValue(new Error('NOT_FOUND'))
    mockGetServerCaller.mockResolvedValue({ admin: { module: { getById: mockGetById } } })

    const { default: ModuleEditPage } = await import('./page')

    // Act & Assert
    await expect(
      ModuleEditPage({ params: Promise.resolve({ id: '999' }) }),
    ).rejects.toThrow('NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })
})
