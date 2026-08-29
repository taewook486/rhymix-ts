/**
 * rx-widget 코드 생성기 페이지 — SPEC-WIDGET-001 Slice D
 *
 * 등록된 위젯 중 하나를 선택하면 propsSchema에서 폼 필드를 파생하여
 * <rx-widget name="X" data-key="val" /> 토큰을 생성한다.
 *
 * SPEC-ADMIN-EXTRAS-001 REQ-064 추가:
 * - URL ?preset={id} 파라미터로 프리셋 로드 + 폼 프리필.
 * - "프리셋 저장" 버튼: label 입력 인라인 폼 → admin.widget.savePreset mutation.
 *
 * @MX:SPEC: SPEC-WIDGET-001 REQ-WIDGET-D-003, SPEC-ADMIN-EXTRAS-001 REQ-064
 */
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { listWidgets } from '@rhymix-ts/core/widgets'
import Link from 'next/link'
import { trpc } from '@/providers/TRPCProvider'
import { toast } from 'sonner'

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
  const searchParams = useSearchParams()
  const [selectedName, setSelectedName] = useState<string>('')
  const [propValues, setPropValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  // 프리셋 저장 인라인 폼 상태
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [presetLabel, setPresetLabel] = useState('')
  // 프리셋 로드 경고 (props 스키마 불일치)
  const [presetWarning, setPresetWarning] = useState<string | null>(null)

  // URL ?preset={id} 파라미터로 프리셋 자동 로드 (REQ-064)
  const presetIdParam = searchParams.get('preset')
  const presetId = presetIdParam ? parseInt(presetIdParam, 10) : null

  // 프리셋 목록 조회 (preset id가 있을 때만)
  const { data: presetsData } = trpc.admin.widget.listPresets.useQuery(
    {},
    { enabled: presetId !== null },
  )

  // 프리셋 데이터가 로드되면 폼을 한 번 프리필한다. 이후에는 사용자가 자유롭게
  // 수정하므로 파생값이 아니라 초기화다.
  useEffect(() => {
    if (!presetId || !presetsData) return
    const preset = presetsData.find((p) => p.id === presetId)
    if (!preset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPresetWarning(`프리셋 ID ${presetId}를 찾을 수 없습니다.`)
      return
    }
    // 위젯 선택
    setSelectedName(preset.widgetName)
    // props 프리필 — string 값으로 변환
    const propsObj = (preset.props ?? {}) as Record<string, unknown>
    const stringProps: Record<string, string> = {}
    for (const [k, v] of Object.entries(propsObj)) {
      stringProps[k] = String(v ?? '')
    }
    setPropValues(stringProps)
    setCopied(false)
    setPresetWarning(null)

    // 위젯 레지스트리에 해당 위젯이 있는지 확인 (REQ-062)
    const widgetDef = widgets.find((w) => w.name === preset.widgetName)
    if (!widgetDef) {
      setPresetWarning(`위젯 '${preset.widgetName}'이 현재 레지스트리에 등록되어 있지 않습니다.`)
      return
    }
    // propsSchema 검증 (Zod)
    const parseResult = widgetDef.propsSchema.safeParse(propsObj)
    if (!parseResult.success) {
      setPresetWarning(
        `프리셋 props가 현재 위젯 스키마와 일치하지 않습니다: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
      )
    }
  }, [presetId, presetsData, widgets])

  // 프리셋 저장 mutation
  const savePresetMutation = trpc.admin.widget.savePreset.useMutation({
    onSuccess: () => {
      toast.success('프리셋이 저장되었습니다.')
      setShowSaveForm(false)
      setPresetLabel('')
    },
    onError: (error) => {
      toast.error('프리셋 저장 실패', { description: error.message })
    },
  })

  // 선택된 위젯 정의
  const selectedWidget = widgets.find((w) => w.name === selectedName)

  // 위젯 선택 시 폼 초기화
  const handleSelectWidget = useCallback((name: string) => {
    setSelectedName(name)
    setPropValues({})
    setCopied(false)
    setShowSaveForm(false)
    setPresetWarning(null)
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

  // 프리셋 저장 제출
  const handleSavePreset = () => {
    if (!selectedName || !presetLabel.trim()) return
    savePresetMutation.mutate({
      widgetName: selectedName,
      label: presetLabel.trim(),
      props: propValues,
    })
  }

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

      {/* 프리셋 스키마 불일치 경고 (REQ-062) */}
      {presetWarning && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <span className="shrink-0">⚠</span>
          <span>{presetWarning}</span>
        </div>
      )}

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
            {selectedWidget && !showSaveForm && (
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                className="px-4 py-2 text-sm rounded-md bg-zinc-200 hover:bg-zinc-300 transition-colors"
              >
                프리셋 저장
              </button>
            )}
          </div>

          {/* 프리셋 저장 인라인 폼 */}
          {showSaveForm && (
            <div className="border border-zinc-200 rounded-md p-4 bg-zinc-50 space-y-3">
              <p className="text-xs font-semibold text-zinc-700">프리셋 레이블 입력</p>
              <input
                type="text"
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                placeholder="예: 공지사항 최신 5건"
                className="w-full border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSavePreset}
                  disabled={!presetLabel.trim() || savePresetMutation.isPending}
                  className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {savePresetMutation.isPending ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSaveForm(false); setPresetLabel('') }}
                  className="px-3 py-1.5 text-sm rounded-md bg-zinc-200 hover:bg-zinc-300 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

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
