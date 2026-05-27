/**
 * 위젯 인스턴스 수정 폼 컴포넌트 — SPEC-WIDGET-001 Slice D
 *
 * Client Component: 서버 액션을 호출하여 인스턴스를 수정/삭제한다.
 */
'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  updateWidgetInstanceAction,
  deleteWidgetInstanceAction,
} from '../../../actions'

interface Props {
  id: number
  initialLabel: string
  initialProps: string
}

export function WidgetInstanceEditForm({ id, initialLabel, initialProps }: Props) {
  const [label, setLabel] = useState(initialLabel)
  const [propsJson, setPropsJson] = useState(initialProps)
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
      const result = await updateWidgetInstanceAction(id, label, parsedProps)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  function handleDelete() {
    if (!confirm('이 인스턴스를 삭제하시겠습니까?')) return
    startTransition(async () => {
      const result = await deleteWidgetInstanceAction(id)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
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
          rows={8}
          className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-between items-center">
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-md text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40"
        >
          삭제
        </button>
      </div>
    </form>
  )
}
