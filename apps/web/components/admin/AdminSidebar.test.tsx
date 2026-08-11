// @vitest-environment jsdom
/**
 * AdminSidebar '콘텐츠' 섹션 구성 테스트 — SPEC-CONTENT-PARITY-001 M1.
 *
 * AC-CPAR-001: 파일(/admin/files), 휴지통(/admin/trash), 스팸필터 진입 링크가 존재하고
 * 레거시 순서(게시판→페이지→문서→댓글→파일→설문→스팸필터→휴지통)를 반영한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
}))

// 클라이언트 trpc 훅 mock (favorites 조회/삭제/정렬)
// 주의: useQuery가 매 렌더마다 새 배열 참조를 반환하면 AdminSidebar의
// useEffect([favoritesData]) 의존성이 매번 바뀌어 setFavorites → 재렌더 → ... 무한 루프에
// 빠진다(OOM 원인). 반드시 모듈 스코프 상수로 참조 안정성을 보장한다.
const EMPTY_FAVORITES: unknown[] = []

// SPEC-ADMIN-MENU-PARITY-001 AC-AMP-004(a) 전용 — 즐겨찾기 1건 mock.
// 위 EMPTY_FAVORITES와 동일한 이유로 모듈 스코프 상수로 고정(참조 안정성).
const ONE_FAVORITE: ReadonlyArray<{
  id: number
  label: string
  href: string
  icon: string | null
  listOrder: number
}> = [{ id: 1, label: '알림 설정', href: '/admin/settings/notification', icon: null, listOrder: 0 }]

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      favorite: {
        list: {
          useQuery: () => ({ data: EMPTY_FAVORITES }),
        },
        remove: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        reorder: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('AdminSidebar 콘텐츠 섹션 (SPEC-CONTENT-PARITY-001 M1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderSidebarHrefs(): Promise<string[]> {
    const { AdminSidebar } = await import('./AdminSidebar')
    const { container } = render(React.createElement(AdminSidebar))
    return Array.from(container.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    )
  }

  it('M1-1: 파일/휴지통/스팸필터 진입 링크가 존재한다 (REQ-CPAR-001~002)', async () => {
    const hrefs = await renderSidebarHrefs()

    expect(hrefs).toContain('/admin/files')
    expect(hrefs).toContain('/admin/trash')
    // 스팸필터는 허브+탭 확정안 — 사이드바 단일 링크는 첫 탭(ip)으로 연결 (design.md D-4)
    expect(hrefs).toContain('/admin/settings/spamfilter/ip')
  })

  it('M1-2: 레거시 콘텐츠 메뉴 순서를 반영한다 (게시판→페이지→문서→댓글→파일→설문→스팸필터→휴지통)', async () => {
    const hrefs = await renderSidebarHrefs()

    const legacyOrder = [
      '/admin/modules',
      '/admin/pages',
      '/admin/documents',
      '/admin/comments',
      '/admin/files',
      '/admin/polls',
      '/admin/settings/spamfilter/ip',
      '/admin/trash',
    ]

    const positions = legacyOrder.map((href) => hrefs.indexOf(href))
    // 전 항목 존재
    for (const [i, pos] of positions.entries()) {
      expect(pos, `${legacyOrder[i]} 링크가 없음`).toBeGreaterThanOrEqual(0)
    }
    // 상대 순서 유지
    for (let i = 1; i < positions.length; i += 1) {
      expect(
        positions[i]!,
        `${legacyOrder[i]}이(가) ${legacyOrder[i - 1]}보다 앞에 있음`,
      ).toBeGreaterThan(positions[i - 1]!)
    }
  })

  it('M1-3: 위젯 시스템 링크는 rhymix-ts 고유 항목으로 유지된다 (REQ-CPAR-001)', async () => {
    const hrefs = await renderSidebarHrefs()
    expect(hrefs).toContain('/admin/widgets')
  })
})

describe('AdminSidebar 관리자 메뉴 레거시 parity (SPEC-ADMIN-MENU-PARITY-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderSidebar() {
    const { AdminSidebar } = await import('./AdminSidebar')
    return render(React.createElement(AdminSidebar))
  }

  async function renderSidebarHrefs(): Promise<string[]> {
    const { container } = await renderSidebar()
    return Array.from(container.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    )
  }

  it('AC-AMP-001: 5개 그룹 헤더가 사이트 제작/편집→회원→콘텐츠→설정→고급 순서로 렌더된다', async () => {
    const { container } = await renderSidebar()
    const h3Texts = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent?.trim())

    const fixedGroups = ['사이트 제작/편집', '회원', '콘텐츠', '설정', '고급']
    const filtered = h3Texts.filter((t) => t && fixedGroups.includes(t))

    expect(filtered).toEqual(fixedGroups)
  })

  it('AC-AMP-002: "사이트 제작/편집" 그룹은 메뉴 편집·디자인 2개 링크만 포함한다', async () => {
    const { container } = await renderSidebar()
    const heading = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent?.trim() === '사이트 제작/편집',
    )
    expect(heading).toBeDefined()
    const list = heading!.parentElement!.querySelector('ul')
    const hrefs = Array.from(list!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(new Set(hrefs)).toEqual(new Set(['/admin/menu', '/admin/site/design']))
  })

  it('AC-AMP-003: "고급" 그룹은 지정된 5개 링크를 포함하고 위젯 시스템은 포함하지 않는다', async () => {
    const { container } = await renderSidebar()
    const heading = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent?.trim() === '고급',
    )
    expect(heading).toBeDefined()
    const list = heading!.parentElement!.querySelector('ul')
    const hrefs = Array.from(list!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(new Set(hrefs)).toEqual(
      new Set([
        '/admin/settings/export',
        '/admin/settings/import',
        '/admin/logs',
        '/admin/system',
        '/admin/system/cache',
      ]),
    )
    expect(hrefs).not.toContain('/admin/widgets')
  })

  it('AC-AMP-005: "설정" 그룹은 일반/알림/보안 설정 3개 링크만 포함한다', async () => {
    const { container } = await renderSidebar()
    const heading = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent?.trim() === '설정',
    )
    expect(heading).toBeDefined()
    const list = heading!.parentElement!.querySelector('ul')
    const hrefs = Array.from(list!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(new Set(hrefs)).toEqual(
      new Set([
        '/admin/settings/site',
        '/admin/settings/notification',
        '/admin/settings/security',
      ]),
    )
  })

  it('AC-AMP-008: 재배치 전/후 전체 href 집합이 동일하다 (추가/삭제 없음)', async () => {
    const hrefs = await renderSidebarHrefs()
    const expectedHrefs = new Set([
      '/admin',
      '/admin/menu',
      '/admin/site/design',
      '/admin/members',
      '/admin/members/groups',
      '/admin/members/new',
      '/admin/members/settings',
      '/admin/site/points',
      '/admin/modules',
      '/admin/widgets',
      '/admin/pages',
      '/admin/documents',
      '/admin/comments',
      '/admin/files',
      '/admin/polls',
      '/admin/settings/spamfilter/ip',
      '/admin/trash',
      '/admin/settings/site',
      '/admin/settings/notification',
      '/admin/settings/security',
      '/admin/settings/export',
      '/admin/settings/import',
      '/admin/logs',
      '/admin/system',
      '/admin/system/cache',
    ])
    expect(new Set(hrefs)).toEqual(expectedHrefs)
  })

  it('AC-AMP-004(b): 즐겨찾기가 0건이면 즐겨찾기 섹션을 렌더하지 않는다', async () => {
    const { container } = await renderSidebar()
    expect(container.textContent).not.toContain('즐겨찾기')
  })
})

describe('AdminSidebar 즐겨찾기 섹션 위치 (SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-004, favorites 1건 이상)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('AC-AMP-004(a): 즐겨찾기 헤더가 콘텐츠와 설정 헤더 사이에 렌더된다', async () => {
    vi.doMock('next/navigation', () => ({
      usePathname: vi.fn(() => '/admin'),
    }))
    vi.doMock('@/providers/TRPCProvider', () => ({
      trpc: {
        admin: {
          favorite: {
            list: {
              useQuery: () => ({ data: ONE_FAVORITE }),
            },
            remove: {
              useMutation: () => ({ mutate: vi.fn(), isPending: false }),
            },
            reorder: {
              useMutation: () => ({ mutate: vi.fn(), isPending: false }),
            },
          },
        },
      },
    }))
    vi.doMock('sonner', () => ({
      toast: { success: vi.fn(), error: vi.fn() },
    }))

    const { AdminSidebar } = await import('./AdminSidebar')
    const { container } = render(React.createElement(AdminSidebar))

    const h3Texts = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent?.trim() ?? '')
    const contentIdx = h3Texts.indexOf('콘텐츠')
    const favoritesIdx = h3Texts.findIndex((t) => t.includes('즐겨찾기'))
    const settingsIdx = h3Texts.indexOf('설정')

    expect(contentIdx).toBeGreaterThanOrEqual(0)
    expect(favoritesIdx).toBeGreaterThan(contentIdx)
    expect(settingsIdx).toBeGreaterThan(favoritesIdx)
  })
})
