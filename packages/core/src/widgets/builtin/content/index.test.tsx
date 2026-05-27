// @vitest-environment jsdom
/**
 * content 빌트인 위젯 테스트 — SPEC-WIDGET-001 Slice C
 */
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { resetWidgetRegistry } from '../../registry'
import { validateWidgetProps } from '../../validate'
import { registerBuiltinWidgets, resetBuiltinWidgetsInit } from '../index'
import { contentWidget } from './index'

// 컴포넌트 편의 렌더 헬퍼
function renderContent(props: Record<string, unknown>) {
  const Component = contentWidget.Component as React.ComponentType<Record<string, unknown>>
  return render(React.createElement(Component, props))
}

describe('content 위젯 — Slice C', () => {
  beforeEach(() => {
    resetWidgetRegistry()
    resetBuiltinWidgetsInit()
  })

  it('C-CONTENT-1: items 배열 제공 → 목록 렌더링', () => {
    const { container } = renderContent({
      listCount: 3,
      order: 'latest',
      items: [
        { id: 1, title: '첫 번째 글', createdAt: '2025-01-01', mid: 'notice' },
        { id: 2, title: '두 번째 글', createdAt: '2025-01-02', mid: 'notice' },
      ],
    })
    const list = container.querySelector('.widget-content-list')
    expect(list).not.toBeNull()
    const items = container.querySelectorAll('.widget-content-item')
    expect(items).toHaveLength(2)
  })

  it('C-CONTENT-2: items=[] → 빈 상태 컨테이너 렌더링', () => {
    const { container } = renderContent({
      listCount: 5,
      order: 'latest',
      items: [],
    })
    const emptyEl = container.querySelector('.widget-content-empty')
    expect(emptyEl).not.toBeNull()
    const list = container.querySelector('.widget-content-list')
    expect(list).toBeNull()
  })

  it('C-CONTENT-3: items 미제공 → 빈 상태 컨테이너 렌더링 (기본값 처리)', () => {
    const { container } = renderContent({ listCount: 5, order: 'latest' })
    const emptyEl = container.querySelector('.widget-content-empty')
    expect(emptyEl).not.toBeNull()
  })

  it('C-CONTENT-4: propsSchema — listCount 문자열 → 숫자 coerce ("5" → 5)', () => {
    const result = validateWidgetProps(contentWidget, { listCount: '5' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.props.listCount).toBe(5)
    }
  })

  it('C-CONTENT-5: propsSchema — listCount 최대값 초과 (50 → 검증 실패)', () => {
    const result = validateWidgetProps(contentWidget, { listCount: 50 })
    expect(result.ok).toBe(false)
  })

  it('C-CONTENT-6: propsSchema — order 유효하지 않은 값 → 검증 실패', () => {
    const result = validateWidgetProps(contentWidget, { order: 'newest' })
    expect(result.ok).toBe(false)
  })

  it('C-CONTENT-7: 위젯 name이 "content"', () => {
    expect(contentWidget.name).toBe('content')
  })

  it('C-CONTENT-8: registerBuiltinWidgets — idempotent (두 번 호출해도 정상)', () => {
    expect(() => {
      registerBuiltinWidgets()
      registerBuiltinWidgets()
    }).not.toThrow()
  })

  it('C-CONTENT-9: defaultProps로 기본값 검증 성공 (listCount=5, order=latest)', () => {
    const result = validateWidgetProps(contentWidget, {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.props.listCount).toBe(5)
      expect(result.props.order).toBe('latest')
    }
  })
})
