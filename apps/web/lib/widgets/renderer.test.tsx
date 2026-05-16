// @vitest-environment jsdom
/**
 * G-2: rx-widget 렌더러 단위 테스트 — TDD RED 페이즈
 * SPEC-ADMIN-001 Slice G
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import React from 'react'
import { render } from '@testing-library/react'
import { registerWidget, resetWidgetRegistry } from '@rhymix-ts/core/widgets'
import { parseWidgetTokens, renderWidgetContent } from './renderer'

// 테스트용 mock Hello 위젯
function Hello({ name }: { name: string }) {
  return React.createElement('div', { 'data-testid': 'hello-widget' }, name)
}

const mockHelloDef = {
  name: 'hello',
  displayName: 'Hello',
  propsSchema: z.object({ name: z.string() }),
  Component: Hello,
}

describe('parseWidgetTokens (Slice G-2)', () => {
  it('G-2-0: 토큰 없는 html → text 토큰만 반환', () => {
    const tokens = parseWidgetTokens('<p>안녕하세요</p>')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toEqual({ type: 'text', value: '<p>안녕하세요</p>' })
  })

  it('G-2-1: rx-widget 토큰 하나 파싱', () => {
    const html = `<rx-widget name="hello" props='{"name":"Alice"}' />`
    const tokens = parseWidgetTokens(html)
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toEqual({
      type: 'widget',
      name: 'hello',
      rawProps: '{"name":"Alice"}',
    })
  })

  it('G-2-2: 복수 토큰 + 텍스트 혼합 → 올바른 배열', () => {
    const html = `<p>앞</p><rx-widget name="hello" props='{"name":"Bob"}' /><p>뒤</p>`
    const tokens = parseWidgetTokens(html)
    expect(tokens).toHaveLength(3)
    expect(tokens[0]).toEqual({ type: 'text', value: '<p>앞</p>' })
    expect(tokens[1]).toEqual({
      type: 'widget',
      name: 'hello',
      rawProps: '{"name":"Bob"}',
    })
    expect(tokens[2]).toEqual({ type: 'text', value: '<p>뒤</p>' })
  })
})

describe('renderWidgetContent (Slice G-2)', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('G-2-3: 미등록 위젯 + isAdmin:false → 빈 span (data-widget-error 없음)', () => {
    const tokens = parseWidgetTokens(`<rx-widget name="unknown" props='{}' />`)
    const node = renderWidgetContent(tokens, false)
    const { container } = render(React.createElement(React.Fragment, null, node))
    const span = container.querySelector('span')
    expect(span).toBeTruthy()
    expect(span?.hasAttribute('data-widget-error')).toBe(false)
  })

  it('G-2-4: 미등록 위젯 + isAdmin:true → data-widget-error="unknown:NAME"', () => {
    const tokens = parseWidgetTokens(`<rx-widget name="ghost" props='{}' />`)
    const node = renderWidgetContent(tokens, true)
    const { container } = render(React.createElement(React.Fragment, null, node))
    const span = container.querySelector('[data-widget-error]')
    expect(span).toBeTruthy()
    expect(span?.getAttribute('data-widget-error')).toBe('unknown:ghost')
  })

  it('G-2-5: props 검증 실패 + isAdmin:true → data-widget-error="invalid-props:NAME"', () => {
    registerWidget(mockHelloDef)
    // name 필드가 number이어서 검증 실패
    const tokens = parseWidgetTokens(`<rx-widget name="hello" props='{"name":123}' />`)
    const node = renderWidgetContent(tokens, true)
    const { container } = render(React.createElement(React.Fragment, null, node))
    const span = container.querySelector('[data-widget-error]')
    expect(span).toBeTruthy()
    expect(span?.getAttribute('data-widget-error')).toBe('invalid-props:hello')
  })

  it('G-2-6: 유효 위젯 + 유효 props → Widget Component 렌더', () => {
    registerWidget(mockHelloDef)
    const tokens = parseWidgetTokens(`<rx-widget name="hello" props='{"name":"Alice"}' />`)
    const node = renderWidgetContent(tokens, false)
    const { getByTestId } = render(React.createElement(React.Fragment, null, node))
    const el = getByTestId('hello-widget')
    expect(el.textContent).toBe('Alice')
  })
})
