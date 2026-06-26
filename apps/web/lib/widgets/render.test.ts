// @vitest-environment jsdom
/**
 * render.tsx 단위 테스트 — SPEC-WIDGET-001 Slice B
 *
 * parseWidgetTokens와 renderBodyWithWidgets 동작을 검증한다.
 * Prisma mock은 최소한으로 구성한다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { z } from 'zod'
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { registerWidget, resetWidgetRegistry } from '@rhymix-ts/core/widgets'
import type { WidgetRenderContext } from '@rhymix-ts/core/widgets'
import { parseWidgetTokens, renderBodyWithWidgets } from './render'

// ─── mock 위젯 정의 ────────────────────────────────────────────────────────

function GoodWidget({ title }: { title: string }) {
  return React.createElement('div', { 'data-testid': 'good-widget' }, title)
}

function ThrowingWidget(_props: { x: string }) {
  throw new Error('렌더 중 예외 발생')
}

const goodDef = {
  name: 'good',
  displayName: '정상 위젯',
  propsSchema: z.object({ title: z.string() }),
  Component: GoodWidget,
}

const throwDef = {
  name: 'thrower',
  displayName: '예외 위젯',
  propsSchema: z.object({ x: z.string() }),
  Component: ThrowingWidget,
}

// Prisma mock (테스트에서 DB 호출 없음)
const fakePrisma = {} as unknown as import('@prisma/client').PrismaClient

// 컨텍스트 헬퍼
function makeCtx(isAdmin: boolean): WidgetRenderContext {
  return { isAdmin, prisma: fakePrisma }
}

// ─── parseWidgetTokens ────────────────────────────────────────────────────

describe('parseWidgetTokens — Slice B', () => {
  it('B-PARSE-1: 자기 닫힘 토큰 추출', () => {
    const tokens = parseWidgetTokens('<rx-widget name="good" />')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]!.name).toBe('good')
    expect(tokens[0]!.raw).toContain('rx-widget')
  })

  it('B-PARSE-2: 쌍 태그 형식 추출 (<rx-widget ...></rx-widget>)', () => {
    const tokens = parseWidgetTokens('<rx-widget name="good"></rx-widget>')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]!.name).toBe('good')
  })

  it('B-PARSE-3: 복수 토큰이 포함된 본문 → 배열 길이 일치', () => {
    const html = '<rx-widget name="good" /><p>중간</p><rx-widget name="thrower" data-x="val" />'
    const tokens = parseWidgetTokens(html)
    expect(tokens).toHaveLength(2)
    expect(tokens[0]!.name).toBe('good')
    expect(tokens[1]!.name).toBe('thrower')
  })

  it('B-PARSE-4: data-* 속성 → camelCase 변환 (data-list-count → listCount)', () => {
    const tokens = parseWidgetTokens(
      '<rx-widget name="good" data-list-count="5" data-target-mid="notice" />',
    )
    expect(tokens).toHaveLength(1)
    expect(tokens[0]!.props['listCount']).toBe('5')
    expect(tokens[0]!.props['targetMid']).toBe('notice')
  })

  it('B-PARSE-5: 토큰 없는 html → 빈 배열', () => {
    const tokens = parseWidgetTokens('<p>일반 html</p>')
    expect(tokens).toHaveLength(0)
  })

  it('B-PARSE-6: 정적 HTML 사이에 토큰이 끼어있을 때 raw 보존', () => {
    const html = '<p>앞</p><rx-widget name="good" data-title="hello" /><p>뒤</p>'
    const tokens = parseWidgetTokens(html)
    expect(tokens).toHaveLength(1)
    expect(tokens[0]!.props['title']).toBe('hello')
    // raw는 원본 토큰 문자열 포함
    expect(tokens[0]!.raw).toContain('rx-widget')
  })

  it('B-PARSE-7: name 속성 없는 태그 → 무시 (토큰 배열에 포함 안 됨)', () => {
    // name 속성 누락 → 파서가 skip
    const tokens = parseWidgetTokens('<rx-widget data-x="1" />')
    expect(tokens).toHaveLength(0)
  })
})

// ─── renderBodyWithWidgets ────────────────────────────────────────────────

describe('renderBodyWithWidgets — Slice B', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  afterEach(() => {
    cleanup()
  })

  it('B-RENDER-1: 미등록 위젯 + isAdmin=false → data-widget-empty', async () => {
    const node = await renderBodyWithWidgets(
      '<rx-widget name="ghost" />',
      makeCtx(false),
    )
    const { container } = render(React.createElement(React.Fragment, null, node))
    const el = container.querySelector('[data-widget-empty="ghost"]')
    expect(el).not.toBeNull()
  })

  it('B-RENDER-2: 미등록 위젯 + isAdmin=true → data-widget-error', async () => {
    const node = await renderBodyWithWidgets(
      '<rx-widget name="ghost" />',
      makeCtx(true),
    )
    const { container } = render(React.createElement(React.Fragment, null, node))
    const el = container.querySelector('[data-widget-error="ghost"]')
    expect(el).not.toBeNull()
  })

  it('B-RENDER-3: props 검증 실패 + isAdmin=true → data-widget-error + data-widget-reason="props"', async () => {
    registerWidget(goodDef)
    // title이 number → 검증 실패
    const node = await renderBodyWithWidgets(
      // data-title에 숫자 문자열이지만 Zod z.string()은 통과
      // 실제로 실패시키려면 schema와 다른 형식 전달 불가 (HTML 속성은 모두 string)
      // 따라서 props 없이 필수 필드 누락으로 테스트
      '<rx-widget name="good" />',
      makeCtx(true),
    )
    const { container } = render(React.createElement(React.Fragment, null, node))
    // title 없음 → props 검증 실패 (required 필드)
    const el = container.querySelector('[data-widget-error="good"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('data-widget-reason')).toBe('props')
  })

  it('B-RENDER-4: 유효 위젯 + 유효 props → 컴포넌트 렌더', async () => {
    registerWidget(goodDef)
    const node = await renderBodyWithWidgets(
      '<rx-widget name="good" data-title="안녕하세요" />',
      makeCtx(false),
    )
    const { getByTestId } = render(React.createElement(React.Fragment, null, node))
    const el = getByTestId('good-widget')
    expect(el.textContent).toBe('안녕하세요')
  })

  it('B-RENDER-5: 컴포넌트 throw → 격리된 data-widget-error + render-error, 나머지 정상', async () => {
    registerWidget(throwDef)
    registerWidget(goodDef)
    const html =
      '<rx-widget name="thrower" data-x="val" /><rx-widget name="good" data-title="계속" />'
    const node = await renderBodyWithWidgets(html, makeCtx(false))
    const { container, getByTestId } = render(
      React.createElement(React.Fragment, null, node),
    )
    // thrower → render-error
    const errEl = container.querySelector('[data-widget-reason="render-error"]')
    expect(errEl).not.toBeNull()
    // good → 정상 렌더
    expect(getByTestId('good-widget').textContent).toBe('계속')
  })

  it('B-RENDER-6: 정적 HTML 세그먼트가 살균되어 dangerouslySetInnerHTML로 렌더', async () => {
    const html = '<p>일반 본문</p><rx-widget name="good" data-title="X" /><p>마지막</p>'
    registerWidget(goodDef)
    const node = await renderBodyWithWidgets(html, makeCtx(false))
    const { container } = render(React.createElement(React.Fragment, null, node))
    // p 태그 두 개가 렌더되어야 함
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
  })

  it('B-RENDER-7: 토큰 없는 순수 HTML → 전체 살균 후 span으로 렌더', async () => {
    const node = await renderBodyWithWidgets('<p>Hello</p>', makeCtx(false))
    const { container } = render(React.createElement(React.Fragment, null, node))
    expect(container.textContent).toContain('Hello')
  })

  it('B-RENDER-8: script 태그 포함 HTML → 살균 후 제거됨', async () => {
    const node = await renderBodyWithWidgets(
      '<p>안전</p><script>alert(1)</script>',
      makeCtx(false),
    )
    const { container } = render(React.createElement(React.Fragment, null, node))
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('안전')
  })
})
