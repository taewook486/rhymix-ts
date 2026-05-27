// @vitest-environment jsdom
/**
 * Admin 위젯 페이지 단위 테스트 — SPEC-WIDGET-001 Slice D
 *
 * listWidgets, listWidgetInstances를 mock하여 렌더 결과를 검증한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'

// Next.js 모듈 mock
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('a', { href, ...rest }, children),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// @rhymix-ts/db mock
vi.mock('@rhymix-ts/db', () => ({ prisma: {} }))

// core 위젯 mock
vi.mock('@rhymix-ts/core/widgets', () => ({
  listWidgets: vi.fn(),
  listWidgetInstances: vi.fn(),
}))

import { listWidgets, listWidgetInstances } from '@rhymix-ts/core/widgets'

// mock 타입 캐스트
const mockListWidgets = listWidgets as ReturnType<typeof vi.fn>
const mockListWidgetInstances = listWidgetInstances as ReturnType<typeof vi.fn>

describe('AdminWidgetsPage — Slice D', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('D-PAGE-1: 등록된 위젯 정의 목록이 표시됨', async () => {
    mockListWidgets.mockReturnValue([
      { name: 'login_info', displayName: '로그인 정보', category: '인증', description: '로그인/로그아웃' },
      { name: 'content', displayName: '콘텐츠', category: '콘텐츠', description: '최근 글' },
    ])
    mockListWidgetInstances.mockResolvedValue([])

    const { default: Page } = await import('./page')
    const node = await (Page as () => Promise<React.ReactNode>)()
    const { container } = render(React.createElement(React.Fragment, null, node))

    expect(container.textContent).toContain('login_info')
    expect(container.textContent).toContain('로그인 정보')
    expect(container.textContent).toContain('content')
  })

  it('D-PAGE-2: 인스턴스 목록에 registered 배지가 표시됨', async () => {
    mockListWidgets.mockReturnValue([])
    const now = new Date()
    mockListWidgetInstances.mockResolvedValue([
      {
        id: 1,
        widgetName: 'login_info',
        label: '헤더 로그인',
        props: {},
        createdAt: now,
        updatedAt: now,
        registered: true,
      },
      {
        id: 2,
        widgetName: 'unknown_widget',
        label: '미등록 위젯',
        props: {},
        createdAt: now,
        updatedAt: now,
        registered: false,
      },
    ])

    const { default: Page } = await import('./page')
    const node = await (Page as () => Promise<React.ReactNode>)()
    const { container } = render(React.createElement(React.Fragment, null, node))

    // registered=true → '등록됨' 배지
    expect(container.textContent).toContain('등록됨')
    // registered=false → '미등록' 배지
    expect(container.textContent).toContain('미등록')
  })

  it('D-PAGE-3: 위젯 정의가 없을 때 안내 메시지 표시', async () => {
    mockListWidgets.mockReturnValue([])
    mockListWidgetInstances.mockResolvedValue([])

    const { default: Page } = await import('./page')
    const node = await (Page as () => Promise<React.ReactNode>)()
    const { container } = render(React.createElement(React.Fragment, null, node))

    expect(container.textContent).toContain('등록된 위젯이 없습니다')
  })

  it('D-PAGE-4: 코드 생성기 링크와 인스턴스 추가 링크 존재', async () => {
    mockListWidgets.mockReturnValue([])
    mockListWidgetInstances.mockResolvedValue([])

    const { default: Page } = await import('./page')
    const node = await (Page as () => Promise<React.ReactNode>)()
    const { container } = render(React.createElement(React.Fragment, null, node))

    const links = container.querySelectorAll('a')
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/admin/widgets/generator')
    expect(hrefs).toContain('/admin/widgets/instances/new')
  })
})
