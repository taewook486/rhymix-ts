// @vitest-environment jsdom
/**
 * 코드 생성기 페이지 단위 테스트 — SPEC-WIDGET-001 Slice D
 *
 * camelToKebab, propsToDataAttributes, generateToken 순수 함수를 검증한다.
 * React 컴포넌트 렌더 테스트도 포함한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { camelToKebab, propsToDataAttributes, generateToken } from './page'

// Next.js Link mock
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

// listWidgets mock
vi.mock('@rhymix-ts/core/widgets', () => ({
  listWidgets: vi.fn().mockReturnValue([
    {
      name: 'content',
      displayName: '콘텐츠 (최근 글)',
      propsSchema: { shape: { targetMid: {}, listCount: {}, order: {} } },
    },
  ]),
}))

describe('camelToKebab — Slice D', () => {
  it('D-GEN-1: camelCase → kebab-case 변환', () => {
    expect(camelToKebab('listCount')).toBe('list-count')
    expect(camelToKebab('targetMid')).toBe('target-mid')
    expect(camelToKebab('showProfileImage')).toBe('show-profile-image')
  })

  it('D-GEN-2: 이미 kebab-case인 경우 변환 없음', () => {
    expect(camelToKebab('order')).toBe('order')
    expect(camelToKebab('title')).toBe('title')
  })
})

describe('propsToDataAttributes — Slice D', () => {
  it('D-GEN-3: props 객체 → data-* 속성 문자열 변환', () => {
    const result = propsToDataAttributes({ listCount: '5', targetMid: 'notice' })
    expect(result).toContain('data-list-count="5"')
    expect(result).toContain('data-target-mid="notice"')
  })

  it('D-GEN-4: 빈 값 props는 제외됨', () => {
    const result = propsToDataAttributes({ listCount: '5', targetMid: '' })
    expect(result).toContain('data-list-count="5"')
    expect(result).not.toContain('data-target-mid')
  })
})

describe('generateToken — Slice D', () => {
  it('D-GEN-5: content 위젯 토큰 생성 (data-list-count, data-target-mid)', () => {
    const token = generateToken('content', { listCount: '5', targetMid: 'notice' })
    expect(token).toContain('name="content"')
    expect(token).toContain('data-list-count="5"')
    expect(token).toContain('data-target-mid="notice"')
  })

  it('D-GEN-6: props 없는 경우 단순 토큰 생성', () => {
    const token = generateToken('login_info', {})
    expect(token).toBe('<rx-widget name="login_info" />')
  })

  it('D-GEN-7: camelCase props → data-kebab-case 속성 변환', () => {
    const token = generateToken('content', { listCount: '5', targetMid: 'notice' })
    // camelCase가 kebab으로 변환되었는지 확인
    expect(token).not.toContain('data-listCount')
    expect(token).not.toContain('data-targetMid')
    expect(token).toContain('data-list-count')
    expect(token).toContain('data-target-mid')
  })
})

describe('WidgetGeneratorPage 컴포넌트 — Slice D', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('D-GEN-8: 위젯 선택 드롭다운이 렌더됨', async () => {
    const { default: Page } = await import('./page')
    const { container } = render(React.createElement(Page))
    const select = container.querySelector('select')
    expect(select).not.toBeNull()
    // content 위젯 옵션이 포함됨
    expect(container.textContent).toContain('콘텐츠 (최근 글)')
  })

  it('D-GEN-9: 위젯 선택 시 props 폼 필드가 표시됨', async () => {
    const { default: Page } = await import('./page')
    const { container } = render(React.createElement(Page))
    const select = container.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'content' } })
    // propsSchema.shape 기반 폼 필드
    expect(container.textContent).toContain('targetMid')
    expect(container.textContent).toContain('listCount')
  })
})
