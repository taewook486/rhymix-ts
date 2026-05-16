// @vitest-environment jsdom
/**
 * 모듈 인스턴스 목록 페이지 테스트 (C-3, C-4).
 * RED 단계: page.tsx 가 없으므로 두 테스트 모두 실패.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// --- mocks ---
vi.mock('@/lib/trpc/server', () => ({
  getServerCaller: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}))

// ModuleTable 을 실제 대신 spy-able 컴포넌트로 mock
vi.mock('@/components/admin/ModuleTable', () => ({
  ModuleTable: ({ instances }: { instances: unknown[] }) =>
    React.createElement(
      'table',
      { 'data-testid': 'module-table' },
      instances.length === 0
        ? React.createElement('tbody', null,
            React.createElement('tr', null,
              React.createElement('td', null, '등록된 모듈 인스턴스가 없습니다')
            )
          )
        : React.createElement('tbody', null,
            (instances as Array<{ id: number; mid: string; moduleCode: string; name: string }>).map((inst) =>
              React.createElement('tr', { key: inst.id, 'data-testid': `row-${inst.id}` },
                React.createElement('td', null, inst.mid),
                React.createElement('td', null, inst.moduleCode),
                React.createElement('td', null, inst.name)
              )
            )
          )
    ),
}))

vi.mock('@rhymix-ts/ui/components', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

import { getServerCaller } from '@/lib/trpc/server'

const mockGetServerCaller = getServerCaller as ReturnType<typeof vi.fn>

describe('ModulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C-3: list 결과가 있으면 테이블에 mid, moduleCode, name 이 렌더된다', async () => {
    // Arrange
    const instances = [
      { id: 1, mid: 'notice', moduleCode: 'board', name: 'Notice', createdAt: new Date() },
    ]
    const mockCaller = {
      admin: {
        module: {
          list: vi.fn().mockResolvedValue(instances),
        },
      },
    }
    mockGetServerCaller.mockResolvedValue(mockCaller)

    // Act
    const { default: ModulesPage } = await import('./page')
    const result = await ModulesPage()
    const { getByText } = render(result as React.ReactElement)

    // Assert
    expect(getByText('notice')).toBeTruthy()
    expect(getByText('board')).toBeTruthy()
    expect(getByText('Notice')).toBeTruthy()
  })

  it('C-4: list 결과가 빈 배열이면 "등록된 모듈 인스턴스가 없습니다" 가 표시된다', async () => {
    // Arrange
    const mockCaller = {
      admin: {
        module: {
          list: vi.fn().mockResolvedValue([]),
        },
      },
    }
    mockGetServerCaller.mockResolvedValue(mockCaller)

    // Act
    const { default: ModulesPage } = await import('./page')
    const result = await ModulesPage()
    const { getByText } = render(result as React.ReactElement)

    // Assert
    expect(getByText('등록된 모듈 인스턴스가 없습니다')).toBeTruthy()
  })
})
