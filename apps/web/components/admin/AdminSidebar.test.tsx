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
