// @vitest-environment jsdom
/**
 * 스팸필터 공유 탭 레이아웃 테스트 — SPEC-CONTENT-PARITY-001 M1.
 *
 * AC-CPAR-002: 5개 설정 화면 + 검토 큐(/admin/spam-review)가 공통 내비게이션으로
 * 상호 이동 가능하다 (허브+탭 확정안, design.md D-4).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin/settings/spamfilter/ip'),
}))

describe('스팸필터 허브 탭 레이아웃 (SPEC-CONTENT-PARITY-001 M1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('M1-4: 5개 설정 탭 + 검토 큐 링크를 모두 렌더한다 (REQ-CPAR-002)', async () => {
    const { default: SpamfilterLayout } = await import('./layout')
    const result = await SpamfilterLayout({
      children: React.createElement('div', { 'data-testid': 'child' }, '내용'),
    })

    const { container, getByTestId } = render(result as React.ReactElement)
    const hrefs = Array.from(container.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    )

    expect(hrefs).toContain('/admin/settings/spamfilter/ip')
    expect(hrefs).toContain('/admin/settings/spamfilter/words')
    expect(hrefs).toContain('/admin/settings/spamfilter/block')
    expect(hrefs).toContain('/admin/settings/spamfilter/captcha')
    expect(hrefs).toContain('/admin/settings/spamfilter/url')
    // 검토 큐는 세그먼트가 달라 레이아웃 중첩이 불가 — 외부 링크로 탭 목록에 포함
    expect(hrefs).toContain('/admin/spam-review')

    // children 렌더 확인 (기존 5화면 로직 래핑만 — PRESERVE)
    expect(getByTestId('child')).toBeTruthy()
  })
})
