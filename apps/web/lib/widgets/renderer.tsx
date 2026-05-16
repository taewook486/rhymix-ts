/**
 * rx-widget 렌더러 — SPEC-ADMIN-001 Slice G
 *
 * HTML 문자열에서 rx-widget 토큰을 파싱하고 React로 렌더링한다.
 */
import React from 'react'
import { getWidget } from '@rhymix-ts/core/widgets'

/** 파싱된 토큰 유니온 타입 */
export type ParsedToken =
  | { type: 'text'; value: string }
  | { type: 'widget'; name: string; rawProps: string }

/**
 * HTML 문자열에서 rx-widget 태그를 파싱하여 토큰 배열로 변환한다.
 *
 * 지원 형식:
 * <rx-widget name="위젯명" props='{"key":"value"}' />
 */
export function parseWidgetTokens(html: string): ParsedToken[] {
  const WIDGET_RE = /<rx-widget\s+name="([^"]+)"\s+props='([^']*)'\s*\/>/g
  const tokens: ParsedToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = WIDGET_RE.exec(html)) !== null) {
    // 위젯 태그 앞의 텍스트 구간 추가
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: html.slice(lastIndex, match.index) })
    }
    tokens.push({ type: 'widget', name: match[1]!, rawProps: match[2]! })
    lastIndex = match.index + match[0].length
  }

  // 마지막 위젯 이후 텍스트 구간
  if (lastIndex < html.length) {
    tokens.push({ type: 'text', value: html.slice(lastIndex) })
  }

  return tokens
}

/**
 * 파싱된 토큰 배열을 React 노드로 변환한다.
 *
 * @param tokens - parseWidgetTokens 반환값
 * @param isAdmin - true이면 에러 정보를 data-widget-error 속성으로 노출
 */
export function renderWidgetContent(
  tokens: ParsedToken[],
  isAdmin = false,
): React.ReactNode {
  return tokens.map((token, i) => {
    // 일반 텍스트 토큰
    if (token.type === 'text') {
      return token.value
        ? <span key={i} dangerouslySetInnerHTML={{ __html: token.value }} />
        : null
    }

    // 미등록 위젯
    const def = getWidget(token.name)
    if (!def) {
      if (isAdmin) {
        return <span key={i} data-widget-error={`unknown:${token.name}`} />
      }
      return <span key={i} />
    }

    // props JSON 파싱
    let props: unknown
    try {
      props = JSON.parse(token.rawProps || '{}')
    } catch {
      if (isAdmin) {
        return <span key={i} data-widget-error={`invalid-json:${token.name}`} />
      }
      return <span key={i} />
    }

    // Zod 스키마 검증
    const parsed = def.propsSchema.safeParse(props)
    if (!parsed.success) {
      if (isAdmin) {
        return <span key={i} data-widget-error={`invalid-props:${token.name}`} />
      }
      return <span key={i} />
    }

    // 위젯 컴포넌트 렌더
    const Component = def.Component as React.ComponentType<Record<string, unknown>>
    return <Component key={i} {...(parsed.data as Record<string, unknown>)} />
  })
}

/**
 * HTML 문자열을 직접 파싱하여 React 노드로 변환하는 편의 래퍼.
 */
export function renderWidgetTokens(html: string, isAdmin = false): React.ReactNode {
  return renderWidgetContent(parseWidgetTokens(html), isAdmin)
}
