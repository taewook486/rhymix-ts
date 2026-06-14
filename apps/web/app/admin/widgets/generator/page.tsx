/**
 * rx-widget 코드 생성기 페이지 — SPEC-WIDGET-001 Slice D
 *
 * 등록된 위젯 중 하나를 선택하면 propsSchema에서 폼 필드를 파생하여
 * <rx-widget name="X" data-key="val" /> 토큰을 생성한다.
 * @MX:SPEC: SPEC-WIDGET-001 REQ-WIDGET-D-003
 */
'use client'

import React, { useState, useCallback } from 'react'
import { listWidgets } from '@rhymix-ts/core/widgets'
import Link from 'next/link'

/**
 * camelCase 문자열을 kebab-case로 변환한다.
 * 예: "listCount" → "list-count"
 * 이 함수는 parseWidgetTokens의 역방향 변환이다.
 *
 * @param str - 변환할 camelCase 문자열
 */
export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`)
}

/**
 * props 객체를 data-* HTML 속성 문자열로 변환한다.
 * 빈 값은 포함하지 않는다.
 *
 * @param props - 키-값 쌍
 */
export function propsToDataAttributes(props: Record<string, string>): string {
  return Object.entries(props)
    .filter(([, v]) => v.trim() !== '')
    .map(([k, v]) => `data-${camelToKebab(k)}="${v}"`)
    .join(' ')
}

/**
 * rx-widget 토큰 문자열을 생성한다.
 *
 * @param widgetName - 위젯 이름
 * @param props - 키-값 쌍
 */
export function generateToken(widgetName: string, props: Record<string, string>): string {
  const attrs = propsToDataAttributes(props)
  if (attrs) {
    return `<rx-widget name="${widgetName}" ${attrs} />`
  }
  return `<rx-widget name="${widgetName}" />`
}

export default function WidgetGeneratorPage() {
  const widgets = listWidgets()
  const [selectedName, setSelectedName] = useState<string>('')
  const [propValues, setPropValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  // 선택된 위젯 정의
  const selectedWidget = widgets.find((w) => w.name === selectedName)

  // 위젯 선택 시 폼 초기화
  const handleSelectWidget = useCallback((name: string) => {
    setSelectedName(name)
    setPropValues({})
    setCopied(false)
  }, [])

  // prop 값 변경
  const handlePropChange = useCallback((key: string, value: string) => {
    setPropValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  // 생성된 토큰
  const token = selectedName ? generateToken(selectedName, propValues) : ''

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [token])

  // propsSchema에서 필드 이름 목록 추출 (Zod ZodObject 기준)
  type ZodObjectShape = { shape: Record<string, unknown> }
  const propsFields = selectedWidget
    ? Object.keys((selectedWidget.propsSchema as unknown as ZodObjectShape).shape ?? {})
    : []

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2 text-sm">
        <Link href="/admin/widgets" className="text-zinc-500 hover:text-zinc-900">
          위젯 시스템
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-medium">코드 생성기</span>
      </header>

      <div>
        <h1 className="text-2xl font-bold">rx-widget 코드 생성기</h1>
        <p className="text-sm text-zinc-500 mt-1">
          위젯을 선택하고 속성을 입력하면 삽입 가능한 토큰 코드를 생성합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 위젯 선택 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="widget-select" className="block text-sm font-medium mb-1">
              위젯 선택
            </label>
            <select
              id="widget-select"
              value={selectedName}
              onChange={(e) => handleSelectWidget(e.target.value)}
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— 위젯을 선택하세요 —</option>
              {widgets.map((w) => (
                <option key={w.name} value={w.name}>
                  {w.displayName} ({w.name})
                </option>
              ))}
            </select>
          </div>

          {/* Props 폼 */}
          {selectedWidget && propsFields.length > 0 && (
            <div className="space-y-3 border border-zinc-200 rounded-md p-4 bg-zinc-50">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                속성 설정
              </p>
              {propsFields.map((field) => (
                <div key={field}>
                  <label
                    htmlFor={`prop-${field}`}
                    className="block text-xs font-medium text-zinc-600 mb-1"
                  >
                    {field}
                    <span className="ml-1 text-zinc-400 font-mono">
                      → data-{camelToKebab(field)}
                    </span>
                  </label>
                  <input
                    id={`prop-${field}`}
                    type="text"
                    value={propValues[field] ?? ''}
                    onChange={(e) => handlePropChange(field, e.target.value)}
                    placeholder={`${field} 값 입력`}
                    className="w-full border border-zinc-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 생성된 토큰 */}
        <div className="space-y-3">
          <p className="text-sm font-medium">생성된 토큰</p>
          <div className="border border-zinc-200 rounded-md bg-zinc-900 text-green-400 font-mono text-xs p-4 min-h-[80px] whitespace-pre-wrap break-all">
            {token || (
              <span className="text-zinc-500 italic">위젯을 선택하면 토큰이 생성됩니다.</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!token}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? '복사됨!' : '클립보드 복사'}
            </button>
            {selectedWidget && (
              <button
                type="button"
                onClick={() => {
                  // TODO: 프리셋 저장 다이얼로그 오픈
                  // label 입력 + icon picker
                  console.log('프리셋 저장:', { widgetName: selectedName, props: propValues })
                }}
                className="px-4 py-2 text-sm rounded-md bg-zinc-200 hover:bg-zinc-300 transition-colors"
              >
                프리셋 저장
              </button>
            )}
          </div>

          {selectedWidget && (
            <div className="border border-zinc-200 rounded-md p-3 bg-white text-xs space-y-1">
              <p className="font-medium text-zinc-700">사용 예시</p>
              <p className="text-zinc-500">
                게시글 또는 페이지 본문 HTML에 위 토큰을 붙여넣으면 위젯이 렌더링됩니다.
              </p>
              <p className="font-mono text-blue-700 bg-blue-50 p-2 rounded">
                {'<rx-widget name="content" data-list-count="5" data-target-mid="notice" />'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
