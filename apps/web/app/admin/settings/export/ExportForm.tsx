'use client'
/**
 * Export Form Client Component — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * 체크박스 선택 + export mutation + Blob 다운로드.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-EXPORT-001~010
 */
import { useState } from 'react'
import { trpc } from '@/providers/TRPCProvider'
import { Button } from '@rhymix-ts/ui/components'
import { Checkbox, Label, Textarea } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import { Loader2, Download } from 'lucide-react'

interface ExportFormProps {
  siteId: number
}

interface ExportInput {
  siteId: number
  menu: boolean
  moduleInstances: boolean
  documents: { include: boolean; mids?: string[] }
  comments: { include: boolean; mids?: string[] }
  siteSettings: boolean
  minify: boolean
}

export function ExportForm({ siteId }: ExportFormProps) {
  const [input, setInput] = useState<ExportInput>({
    siteId,
    menu: true,
    moduleInstances: true,
    documents: { include: false, mids: [] },
    comments: { include: false, mids: [] },
    siteSettings: true,
    minify: false,
  })

  const [documentMidsText, setDocumentMidsText] = useState('')
  const [commentMidsText, setCommentMidsText] = useState('')

  const exportMutation = trpc.admin.export.create.useMutation({
    onSuccess: (data) => {
      // Blob 생성 및 다운로드
      const blob = new Blob([JSON.stringify(data, null, input.minify ? 0 : 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
      a.download = `rhymix-export-${siteId}-${timestamp}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('내보내기 완료', {
        description: `${data.metadata.entityCounts.menus}개 메뉴, ${data.metadata.entityCounts.moduleInstances}개 모듈이 포함되었습니다.`,
      })
    },
    onError: (error) => {
      toast.error('내보내기 실패', {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // mids 텍스트를 배열로 변환
    const documentMids = documentMidsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const commentMids = commentMidsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const finalInput: ExportInput = {
      ...input,
      documents: {
        include: input.documents.include,
        mids: documentMids.length > 0 ? documentMids : undefined,
      },
      comments: {
        include: input.comments.include,
        mids: commentMids.length > 0 ? commentMids : undefined,
      },
    }

    exportMutation.mutate(finalInput)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 메뉴 트리 */}
      <div className="flex items-center space-x-3">
        <Checkbox
          id="menu"
          checked={input.menu}
          onCheckedChange={(checked) => setInput({ ...input, menu: checked as boolean })}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="menu" className="cursor-pointer">
            메뉴 트리
          </Label>
          <p className="text-xs text-zinc-500">사이트 메뉴 구조를 포함합니다</p>
        </div>
      </div>

      {/* 모듈 인스턴스 */}
      <div className="flex items-center space-x-3">
        <Checkbox
          id="moduleInstances"
          checked={input.moduleInstances}
          onCheckedChange={(checked) =>
            setInput({ ...input, moduleInstances: checked as boolean })
          }
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="moduleInstances" className="cursor-pointer">
            모듈 인스턴스
          </Label>
          <p className="text-xs text-zinc-500">게시판 등 모듈 설정을 포함합니다</p>
        </div>
      </div>

      {/* 문서 */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="documents"
            checked={input.documents.include}
            onCheckedChange={(checked) =>
              setInput({ ...input, documents: { ...input.documents, include: checked as boolean } })
            }
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="documents" className="cursor-pointer">
              문서
            </Label>
            <p className="text-xs text-zinc-500">게시글 등 문서 데이터를 포함합니다</p>
          </div>
        </div>
        {input.documents.include && (
          <div className="ml-7">
            <Label htmlFor="documentMids" className="text-sm">
              특정 모듈 mid (선택사항, 한 줄당 하나씩)
            </Label>
            <Textarea
              id="documentMids"
              placeholder="notice&#10;freeboard&#10;qna"
              value={documentMidsText}
              onChange={(e) => setDocumentMidsText(e.target.value)}
              className="mt-2 h-24"
            />
            <p className="text-xs text-zinc-500 mt-1">
              비워두면 모든 모듈의 문서를 포함합니다
            </p>
          </div>
        )}
      </div>

      {/* 댓글 */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="comments"
            checked={input.comments.include}
            onCheckedChange={(checked) =>
              setInput({ ...input, comments: { ...input.comments, include: checked as boolean } })
            }
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="comments" className="cursor-pointer">
              댓글
            </Label>
            <p className="text-xs text-zinc-500">댓글 데이터를 포함합니다</p>
          </div>
        </div>
        {input.comments.include && (
          <div className="ml-7">
            <Label htmlFor="commentMids" className="text-sm">
              특정 모듈 mid (선택사항, 한 줄당 하나씩)
            </Label>
            <Textarea
              id="commentMids"
              placeholder="notice&#10;freeboard&#10;qna"
              value={commentMidsText}
              onChange={(e) => setCommentMidsText(e.target.value)}
              className="mt-2 h-24"
            />
            <p className="text-xs text-zinc-500 mt-1">
              비워두면 모든 모듈의 댓글을 포함합니다
            </p>
          </div>
        )}
      </div>

      {/* 사이트 설정 */}
      <div className="flex items-center space-x-3">
        <Checkbox
          id="siteSettings"
          checked={input.siteSettings}
          onCheckedChange={(checked) =>
            setInput({ ...input, siteSettings: checked as boolean })
          }
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="siteSettings" className="cursor-pointer">
            사이트 설정
          </Label>
          <p className="text-xs text-zinc-500">사이트 기본 설정을 포함합니다</p>
        </div>
      </div>

      {/* 압축 (minify) */}
      <div className="flex items-center space-x-3">
        <Checkbox
          id="minify"
          checked={input.minify}
          onCheckedChange={(checked) => setInput({ ...input, minify: checked as boolean })}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="minify" className="cursor-pointer">
            압축 (minify)
          </Label>
          <p className="text-xs text-zinc-500">JSON을 압축하여 파일 크기를 줄입니다</p>
        </div>
      </div>

      {/* Export 버튼 */}
      <div className="pt-4">
        <Button type="submit" disabled={exportMutation.isPending} className="w-full sm:w-auto">
          {exportMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              내보내는 중...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              내보내기
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
