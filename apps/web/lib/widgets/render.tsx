/**
 * rx-widget 렌더 파이프라인 — SPEC-WIDGET-001 Slice B
 *
 * HTML 문자열에서 <rx-widget ... /> 토큰을 파싱하고,
 * 정적 HTML 세그먼트를 살균하여 React 노드 배열로 변환한다.
 */
import React from 'react'
import { getWidget } from '@rhymix-ts/core/widgets'
import { validateWidgetProps } from '@rhymix-ts/core/widgets'
import type { WidgetRenderContext, WidgetToken } from '@rhymix-ts/core/widgets'
import { registerBuiltinWidgets } from '@rhymix-ts/core/widgets/builtin'
import { sanitizeHtmlSegment } from './sanitize'

// [app-rsc] 컨텍스트에서 위젯 등록 보장 — instrumentation 컨텍스트와 별도 싱글톤
// @MX:NOTE: [AUTO] render.tsx 로컬 등록 — Turbopack 멀티컨텍스트 모듈 격리 우회
registerBuiltinWidgets()

// ─── 토큰 파서 ───────────────────────────────────────────────────────────────

/**
 * kebab-case 문자열을 camelCase로 변환한다.
 * 예: "list-count" → "listCount"
 *
 * @param str - 변환할 kebab-case 문자열
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

// @MX:ANCHOR: [AUTO] parseWidgetTokens — renderBodyWithWidgets, 테스트, generator에서 fan_in >= 3
// @MX:REASON: Slice B 렌더 파이프라인의 진입점이자 Slice D 코드 생성기와 연동
/**
 * HTML 문자열에서 rx-widget 토큰을 모두 추출한다.
 *
 * 지원 형식:
 * - 자기 닫힘: <rx-widget name="X" data-key="val" />
 * - 쌍 태그:   <rx-widget name="X" data-key="val"></rx-widget>
 *
 * data-* 속성은 data- 접두사를 제거하고 kebab-case → camelCase 변환한다.
 * 예: data-list-count="5" → props.listCount = "5"
 *
 * @param html - 파싱할 HTML 문자열
 * @returns 파싱된 WidgetToken 배열
 */
export function parseWidgetTokens(html: string): WidgetToken[] {
  const tokens: WidgetToken[] = []

  // 자기 닫힘 형식: <rx-widget ... />
  // 쌍 태그 형식:   <rx-widget ...></rx-widget>
  const WIDGET_RE =
    /<rx-widget\s([^>]*?)\/?>(?:<\/rx-widget>)?/g

  let match: RegExpExecArray | null
  while ((match = WIDGET_RE.exec(html)) !== null) {
    const raw = match[0]!
    const attrsStr = match[1] ?? ''

    // name 속성 추출
    const nameMatch = /name="([^"]*)"/.exec(attrsStr)
    if (!nameMatch) continue
    const name = nameMatch[1]!

    // data-* 속성 추출 → camelCase 변환
    const props: Record<string, string> = {}
    const dataRe = /data-([a-z][a-z0-9-]*)="([^"]*)"/g
    let dataMatch: RegExpExecArray | null
    while ((dataMatch = dataRe.exec(attrsStr)) !== null) {
      const key = kebabToCamel(dataMatch[1]!)
      props[key] = dataMatch[2]!
    }

    tokens.push({ name, props, raw })
  }

  return tokens
}

// ─── 렌더 파이프라인 ─────────────────────────────────────────────────────────

/**
 * HTML 문자열을 토큰 위치 기준으로 분할하여 [정적, 토큰, 정적, ...] 배열로 반환한다.
 *
 * @param html - 원본 HTML 문자열
 * @param tokens - parseWidgetTokens 반환값
 * @returns 정적 세그먼트(string) | WidgetToken 인터리브 배열
 */
function splitByTokens(
  html: string,
  tokens: WidgetToken[],
): Array<string | WidgetToken> {
  const parts: Array<string | WidgetToken> = []
  let cursor = 0

  for (const token of tokens) {
    const tokenStart = html.indexOf(token.raw, cursor)
    if (tokenStart === -1) continue

    // 토큰 앞 정적 세그먼트
    if (tokenStart > cursor) {
      parts.push(html.slice(cursor, tokenStart))
    }
    parts.push(token)
    cursor = tokenStart + token.raw.length
  }

  // 마지막 정적 세그먼트
  if (cursor < html.length) {
    parts.push(html.slice(cursor))
  }

  return parts
}

// @MX:ANCHOR: [AUTO] renderBodyWithWidgets — 게시글/페이지 서버 렌더 진입점. fan_in >= 3
// @MX:REASON: 모든 본문 렌더(게시글, 페이지, 위젯 미리보기)에서 공통 호출
/**
 * HTML 본문을 파싱하여 rx-widget 토큰을 React 컴포넌트로 치환한다.
 *
 * 알고리즘:
 * 1. parseWidgetTokens로 토큰 목록 추출
 * 2. splitByTokens로 정적/토큰 인터리브 분할
 * 3. 정적 세그먼트: sanitizeHtmlSegment → <span dangerouslySetInnerHTML />
 * 4. 토큰: getWidget → validateWidgetProps → Component 렌더
 *    - 미등록: isAdmin=false → data-widget-empty, isAdmin=true → data-widget-error
 *    - props 불일치: isAdmin=false → data-widget-empty, isAdmin=true → data-widget-error
 *    - 컴포넌트 throw: try/catch로 격리, data-widget-error 반환
 * 5. React.Fragment로 노드 배열 반환
 *
 * @param html - 렌더할 HTML 본문
 * @param ctx - 렌더 컨텍스트 (isAdmin, user, prisma)
 */
export async function renderBodyWithWidgets(
  html: string,
  ctx: WidgetRenderContext,
): Promise<React.ReactNode> {
  const tokens = parseWidgetTokens(html)
  const parts = splitByTokens(html, tokens)

  const nodes: React.ReactNode[] = await Promise.all(
    parts.map(async (part, idx): Promise<React.ReactNode> => {
      // 정적 HTML 세그먼트
      if (typeof part === 'string') {
        if (!part) return null
        const clean = sanitizeHtmlSegment(part)
        return (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: clean }}
          />
        )
      }

      // rx-widget 토큰 처리
      const token = part
      const def = getWidget(token.name)

      // 미등록 위젯
      if (!def) {
        if (!ctx.isAdmin) {
          return <span key={idx} data-widget-empty={token.name} />
        }
        return (
          <span
            key={idx}
            data-widget-error={token.name}
            title="Unknown widget"
          >
            {`Unknown widget: ${token.name}`}
          </span>
        )
      }

      // props 검증
      const validation = validateWidgetProps(def, token.props)
      if (!validation.ok) {
        if (!ctx.isAdmin) {
          return <span key={idx} data-widget-empty={token.name} />
        }
        const errorSummary = validation.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')
        return (
          <span
            key={idx}
            data-widget-error={token.name}
            data-widget-reason="props"
          >
            {errorSummary}
          </span>
        )
      }

      // 컴포넌트 렌더 (격리된 try/catch)
      // React.createElement는 컴포넌트를 즉시 실행하지 않으므로,
      // 함수로 직접 호출하여 동기 throw를 잡는다.
      try {
        // resolveContextProps가 있으면 컨텍스트 파생 props를 토큰 props에 병합한다.
        // 컨텍스트 props(인증 상태 등)가 토큰 속성 기본값을 오버라이드한다.
        // DB 조회가 필요한 위젯(tag-cloud 등)을 위해 Promise 반환도 await 한다.
        const ctxProps = def.resolveContextProps
          ? await def.resolveContextProps(ctx, validation.props as Record<string, unknown>)
          : {}
        const fn = def.Component as (props: Record<string, unknown>) => React.ReactNode
        const finalProps = { ...(validation.props as Record<string, unknown>), ...ctxProps }
        const element = fn(finalProps)
        return <React.Fragment key={idx}>{element}</React.Fragment>
      } catch {
        return (
          <span
            key={idx}
            data-widget-error={token.name}
            data-widget-reason="render-error"
          />
        )
      }
    }),
  )

  return <>{nodes}</>
}
