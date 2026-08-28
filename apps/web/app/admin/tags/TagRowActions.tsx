'use client'
/**
 * 태그 행 작업(이름 변경 / 병합 / 삭제) — SPEC-TAG-001 REQ-TAG-006.
 *
 * 이전에는 서버 컴포넌트 안에 onClick 이 있어 페이지 전체가 렌더에 실패했고
 * (태그가 1건이라도 있으면 500), 핸들러 내용도 alert('구현 예정') 스텁이었다.
 * 도메인 함수(@rhymix-ts/tag)는 이미 있으므로 여기서 Server Action 으로 잇는다.
 */
import { useActionState } from 'react'
import {
  renameTagAction,
  mergeTagsAction,
  deleteTagAction,
  type TagActionState,
} from './actions'

const initialState: TagActionState = {}

export interface TagOption {
  id: number
  name: string
}

interface TagRowActionsProps {
  tag: TagOption
  /** 병합 대상 후보 — 자기 자신은 제외해서 넘긴다 */
  mergeTargets: TagOption[]
}

const BTN = 'px-2 py-1 text-sm rounded disabled:opacity-50'

export function TagRowActions({ tag, mergeTargets }: TagRowActionsProps) {
  const [renameState, renameDispatch, renaming] = useActionState<TagActionState, FormData>(
    renameTagAction,
    initialState,
  )
  const [mergeState, mergeDispatch, merging] = useActionState<TagActionState, FormData>(
    mergeTagsAction,
    initialState,
  )
  const [deleteState, deleteDispatch, deleting] = useActionState<TagActionState, FormData>(
    deleteTagAction,
    initialState,
  )

  const message =
    renameState?.error ?? mergeState?.error ?? deleteState?.error ??
    renameState?.success ?? mergeState?.success ?? deleteState?.success

  const isError = Boolean(renameState?.error ?? mergeState?.error ?? deleteState?.error)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {/* 이름 변경 */}
        <form action={renameDispatch} className="flex items-center gap-1">
          <input type="hidden" name="tagId" value={tag.id} />
          <label className="sr-only" htmlFor={`rename-${tag.id}`}>
            새 태그 이름
          </label>
          <input
            id={`rename-${tag.id}`}
            name="newName"
            defaultValue={tag.name}
            maxLength={50}
            className="w-32 px-2 py-1 text-sm border border-zinc-300 rounded"
          />
          <button
            type="submit"
            disabled={renaming}
            className={`${BTN} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`}
          >
            {renaming ? '변경 중…' : '이름 변경'}
          </button>
        </form>

        {/* 병합 */}
        {mergeTargets.length > 0 && (
          <form action={mergeDispatch} className="flex items-center gap-1">
            <input type="hidden" name="sourceTagId" value={tag.id} />
            <label className="sr-only" htmlFor={`merge-${tag.id}`}>
              병합 대상 태그
            </label>
            <select
              id={`merge-${tag.id}`}
              name="targetTagId"
              defaultValue=""
              className="px-2 py-1 text-sm border border-zinc-300 rounded"
            >
              <option value="">병합 대상…</option>
              {mergeTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={merging}
              className={`${BTN} bg-purple-100 text-purple-800 hover:bg-purple-200`}
            >
              {merging ? '병합 중…' : '병합'}
            </button>
          </form>
        )}

        {/* 삭제 */}
        <form
          action={deleteDispatch}
          onSubmit={(e) => {
            if (
              !confirm(
                `태그 "${tag.name}"을(를) 삭제하시겠습니까?\n연결된 모든 게시물에서 이 태그가 제거됩니다.`,
              )
            ) {
              e.preventDefault()
            }
          }}
        >
          <input type="hidden" name="tagId" value={tag.id} />
          <button
            type="submit"
            disabled={deleting}
            className={`${BTN} bg-red-100 text-red-800 hover:bg-red-200`}
          >
            {deleting ? '삭제 중…' : '삭제'}
          </button>
        </form>
      </div>

      {message && (
        <p
          role={isError ? 'alert' : 'status'}
          className={`text-xs ${isError ? 'text-red-600' : 'text-green-600'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
