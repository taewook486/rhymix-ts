'use client'
/**
 * Import Form Client Component — SPEC-ADMIN-EXTRAS-001 REQ-015, REQ-019.
 *
 * JSON 파일 업로드 → dryRun → 충돌 결정 → apply 흐름을 관리한다.
 *
 * @MX:ANCHOR: [AUTO] Import 워크플로우 단일 진입점 (dryRun → apply).
 * @MX:REASON: dryRun/apply 두 mutation이 상태를 공유하며, decisions 맵이
 *             두 단계 사이에 유지되어야 하므로 단일 컴포넌트로 관리한다.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-015, REQ-019
 */
import { useRef, useState } from 'react'
import { trpc } from '@/providers/TRPCProvider'
import { Button } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { Loader2, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface ImportFormProps {
  siteId: number
}

/** dryRun 응답에서 plan 항목 타입 */
interface PlanItem {
  exportKey: string
  action: 'create' | 'update' | 'skip' | 'error'
  reason?: string
  conflictDetails?: unknown
}

/** dryRun 응답 형태 (tRPC 반환 타입 미러) */
interface DryRunResult {
  summary: {
    create: number
    update: number
    skip: number
    error: number
  }
  conflicts: PlanItem[]
  plan: PlanItem[]
}

/** apply 응답 형태 */
interface ApplyResult {
  success: boolean
  applied: number
  skipped: number
  errors: string[]
}

/** 충돌 결정 — exportKey → 'overwrite' | 'skipConflict' */
type Decisions = Record<string, 'overwrite' | 'skipConflict'>

type Step = 'idle' | 'dry-run-done' | 'applying' | 'applied'

// @MX:WARN: [AUTO] 파일 파싱 실패 시 사용자에게 명확한 오류 메시지 필요.
// @MX:REASON: JSON 파싱 오류는 try/catch로만 감지 가능하며, 실패 시
//             무음 실패가 발생하면 빈 bundle이 서버로 전송될 수 있다.
function parseJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        resolve(JSON.parse(text))
      } catch {
        reject(new Error('JSON 파일을 파싱할 수 없습니다. 올바른 Export 파일인지 확인하세요.'))
      }
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsText(file)
  })
}

/** action별 색상 클래스 */
const actionColors: Record<string, string> = {
  create: 'text-green-700 bg-green-50 border-green-200',
  update: 'text-blue-700 bg-blue-50 border-blue-200',
  skip: 'text-zinc-500 bg-zinc-50 border-zinc-200',
  error: 'text-red-700 bg-red-50 border-red-200',
}

const actionLabels: Record<string, string> = {
  create: '생성',
  update: '업데이트',
  skip: '건너뜀',
  error: '오류',
}

export function ImportForm({ siteId }: ImportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedBundle, setParsedBundle] = useState<unknown>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null)
  const [decisions, setDecisions] = useState<Decisions>({})
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [step, setStep] = useState<Step>('idle')

  const dryRunMutation = trpc.admin.import.dryRun.useMutation({
    onSuccess: (data) => {
      const result = data as unknown as DryRunResult
      setDryRunResult(result)
      // 충돌 항목에 기본 결정값 'overwrite' 설정
      const initialDecisions: Decisions = {}
      result.conflicts?.forEach((item) => {
        initialDecisions[item.exportKey] = 'overwrite'
      })
      setDecisions(initialDecisions)
      setStep('dry-run-done')
    },
    onError: (error) => {
      toast.error('미리 보기 실패', { description: error.message })
    },
  })

  const applyMutation = trpc.admin.import.applyImport.useMutation({
    onSuccess: (data) => {
      const result = data as unknown as ApplyResult
      setApplyResult(result)
      setStep('applied')
      if (result.success) {
        toast.success('가져오기 완료', {
          description: `적용: ${result.applied}건, 건너뜀: ${result.skipped}건`,
        })
      } else {
        toast.error('가져오기 부분 실패', {
          description: `오류 ${result.errors.length}건 발생`,
        })
      }
    },
    onError: (error) => {
      toast.error('가져오기 실패', { description: error.message })
      setStep('dry-run-done')
    },
  })

  /** 파일 선택 핸들러 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setParsedBundle(null)
    setParseError(null)
    setDryRunResult(null)
    setApplyResult(null)
    setStep('idle')

    if (!file) return

    try {
      const bundle = await parseJsonFile(file)
      setParsedBundle(bundle)
    } catch (err) {
      setParseError((err as Error).message)
    }
  }

  /** 미리 보기(Dry Run) 실행 */
  const handleDryRun = () => {
    if (!parsedBundle) return
    dryRunMutation.mutate({
      bundle: parsedBundle,
      siteId,
      bundleSize: selectedFile?.size,
    })
  }

  /** 충돌 결정 변경 */
  const handleDecisionChange = (exportKey: string, value: 'overwrite' | 'skipConflict') => {
    setDecisions((prev) => ({ ...prev, [exportKey]: value }))
  }

  /** 적용 실행 */
  const handleApply = () => {
    if (!parsedBundle || !dryRunResult) return
    setStep('applying')
    applyMutation.mutate({
      bundle: parsedBundle,
      siteId,
      decisions,
    })
  }

  /** 초기화 */
  const handleReset = () => {
    setSelectedFile(null)
    setParsedBundle(null)
    setParseError(null)
    setDryRunResult(null)
    setApplyResult(null)
    setDecisions({})
    setStep('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isLoading = dryRunMutation.isPending || applyMutation.isPending
  // parseError를 string으로 명시적으로 캐스트하여 JSX 타입 추론 이슈 방지
  const parseErrorMsg: string | null = parseError

  return (
    <div className="space-y-6">
      {/* 파일 업로드 */}
      <div className="space-y-2">
        <label htmlFor="import-file" className="block text-sm font-medium text-zinc-700">
          JSON 파일 선택
        </label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isLoading}
            className="block w-full text-sm text-zinc-600
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border file:border-zinc-300
              file:text-sm file:font-medium
              file:bg-white file:text-zinc-700
              hover:file:bg-zinc-50
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {selectedFile && (
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        {/* 파싱 오류 */}
        {parseErrorMsg !== null ? (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{parseErrorMsg}</span>
          </div>
        ) : null}

        {/* 파싱 성공 */}
        {parsedBundle !== null && parseError === null ? (
          <div className="flex items-center gap-2 text-xs text-green-700">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>파일이 정상적으로 파싱되었습니다.</span>
          </div>
        ) : null}
      </div>

      {/* 미리 보기 버튼 */}
      {step === 'idle' && (
        <Button
          type="button"
          onClick={handleDryRun}
          disabled={!parsedBundle || isLoading}
          className="w-full sm:w-auto"
        >
          {dryRunMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              미리 보는 중...
            </>
          ) : (
            <>
              <Info className="mr-2 h-4 w-4" />
              미리 보기 (Dry Run)
            </>
          )}
        </Button>
      )}

      {/* Dry Run 결과 */}
      {dryRunResult && step !== 'applied' && (
        <div className="space-y-5">
          {/* 요약 */}
          <div>
            <h2 className="text-sm font-semibold mb-3">가져오기 미리 보기 결과</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '생성', count: dryRunResult.summary.create, color: 'text-green-700' },
                { label: '업데이트', count: dryRunResult.summary.update, color: 'text-blue-700' },
                { label: '건너뜀', count: dryRunResult.summary.skip, color: 'text-zinc-500' },
                { label: '오류', count: dryRunResult.summary.error, color: 'text-red-700' },
              ].map(({ label, count, color }) => (
                <div
                  key={label}
                  className="border border-zinc-200 rounded-md px-4 py-3 text-center"
                >
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs text-zinc-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 충돌 목록 */}
          {dryRunResult.conflicts && dryRunResult.conflicts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-amber-700">
                충돌 항목 ({dryRunResult.conflicts.length}건) — 각 항목에 대한 처리 방식을 선택하세요
              </h3>
              <div className="border border-amber-200 rounded-md overflow-hidden divide-y divide-amber-100">
                {dryRunResult.conflicts.map((item) => (
                  <div key={item.exportKey} className="flex items-center gap-4 px-4 py-3 bg-amber-50">
                    <span className="flex-1 font-mono text-xs text-zinc-700 break-all">
                      {item.exportKey}
                    </span>
                    <div className="flex gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name={`decision-${item.exportKey}`}
                          value="overwrite"
                          checked={decisions[item.exportKey] === 'overwrite'}
                          onChange={() => handleDecisionChange(item.exportKey, 'overwrite')}
                          className="accent-blue-600"
                        />
                        덮어쓰기
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name={`decision-${item.exportKey}`}
                          value="skipConflict"
                          checked={decisions[item.exportKey] === 'skipConflict'}
                          onChange={() => handleDecisionChange(item.exportKey, 'skipConflict')}
                          className="accent-zinc-500"
                        />
                        건너뛰기
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan 전체 목록 */}
          {dryRunResult.plan && dryRunResult.plan.length > 0 && (
            <details className="border border-zinc-200 rounded-md">
              <summary className="px-4 py-3 text-sm font-medium cursor-pointer select-none hover:bg-zinc-50">
                전체 실행 계획 ({dryRunResult.plan.length}건)
              </summary>
              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {dryRunResult.plan.map((item, idx) => (
                  <div
                    key={`${item.exportKey}-${idx}`}
                    className="flex items-center gap-3 px-4 py-2"
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium shrink-0 ${actionColors[item.action] ?? ''}`}
                    >
                      {actionLabels[item.action] ?? item.action}
                    </span>
                    <span className="font-mono text-xs text-zinc-600 break-all">
                      {item.exportKey}
                    </span>
                    {item.reason && (
                      <span className="text-xs text-zinc-400 truncate">{item.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* 적용 / 취소 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={handleApply}
              disabled={isLoading || dryRunResult.summary.error > 0}
              className="w-full sm:w-auto"
            >
              {step === 'applying' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  적용 중...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  적용
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              취소
            </Button>
          </div>

          {dryRunResult.summary.error > 0 && (
            <p className="text-xs text-red-600">
              오류 항목이 있어 적용할 수 없습니다. 파일을 확인하세요.
            </p>
          )}
        </div>
      )}

      {/* Apply 결과 */}
      {applyResult && step === 'applied' && (
        <div
          className={`space-y-3 p-4 rounded-md border ${applyResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
        >
          <div className="flex items-center gap-2">
            {applyResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-700" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-700" />
            )}
            <span className={`text-sm font-semibold ${applyResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {applyResult.success ? '가져오기 완료' : '가져오기 부분 실패'}
            </span>
          </div>
          <ul className="text-sm space-y-1 text-zinc-700">
            <li>적용: {applyResult.applied}건</li>
            <li>건너뜀: {applyResult.skipped}건</li>
            {applyResult.errors.length > 0 && (
              <li className="text-red-600">오류: {applyResult.errors.length}건</li>
            )}
          </ul>
          {applyResult.errors.length > 0 && (
            <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
              {applyResult.errors.map((err, i) => (
                <li key={i} className="font-mono">
                  {err}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" onClick={handleReset} className="mt-2">
            새 파일 가져오기
          </Button>
        </div>
      )}
    </div>
  )
}
