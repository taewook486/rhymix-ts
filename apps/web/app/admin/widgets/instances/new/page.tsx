/**
 * 위젯 인스턴스 생성 페이지 — SPEC-WIDGET-001 Slice D
 * @MX:SPEC: SPEC-WIDGET-001 REQ-WIDGET-D-002
 */
'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { listWidgets } from '@rhymix-ts/core/widgets'
import { createWidgetInstanceAction } from '../../actions'

export default function NewWidgetInstancePage() {
  const widgets = listWidgets()
  const [widgetName, setWidgetName] = useState('')
  const [label, setLabel] = useState('')
  const [propsJson, setPropsJson] = useState('{}')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let parsedProps: unknown
    try {
      parsedProps = JSON.parse(propsJson)
    } catch {
      setError('Props JSON 형식이 올바르지 않습니다.')
      return
    }

    startTransition(async () => {
      const result = await createWidgetInstanceAction(widgetName, label, parsedProps)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2 text-sm">
        <Link href="/admin/widgets" className="text-zinc-500 hover:text-zinc-900">
          위젯 시스템
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-medium">인스턴스 추가</span>
      </header>

      <h1 className="text-2xl font-bold">위젯 인스턴스 추가</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="widgetName" className="block text-sm font-medium mb-1">
            위젯 선택
          </label>
          <select
            id="widgetName"
            value={widgetName}
            onChange={(e) => setWidgetName(e.target.value)}
            required
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— 위젯을 선택하세요 —</option>
            {widgets.map((w) => (
              <option key={w.name} value={w.name}>
                {w.displayName} ({w.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="label" className="block text-sm font-medium mb-1">
            레이블
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            placeholder="인스턴스 구분용 레이블"
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="propsJson" className="block text-sm font-medium mb-1">
            Props (JSON)
          </label>
          <textarea
            id="propsJson"
            value={propsJson}
            onChange={(e) => setPropsJson(e.target.value)}
            rows={6}
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          <Link
            href="/admin/widgets"
            className="px-4 py-2 text-sm rounded-md border border-zinc-300 hover:bg-zinc-50"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  )
}
