'use client'
/**
 * MenuItem 편집기 — SPEC-MENU-001 Slice A.
 *
 * 모든 persisted 필드 노출: title, url, icon, cssClass, description, openInNewWindow, expand, listOrder.
 * groupIds ACL (multi-select against MemberGroup).
 * 버튼 상태 JSON (normalBtn, hoverBtn, activeBtn).
 *
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-001~006
 */
import { useActionState, useTransition } from 'react'
import { Button, Input, Label, Textarea } from '@rhymix-ts/ui/components'
import { toast } from 'sonner'
import {
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  type ActionState,
} from '@/app/admin/menu/actions'

interface MenuItemRow {
  id: number
  menuId: number
  parentId: number | null
  title: string
  url: string | null
  listOrder: number
  icon: string | null
  cssClass: string | null
  description: string | null
  groupIds: number[]
  openInNewWindow: boolean
  expand: boolean
  normalBtn: unknown
  hoverBtn: unknown
  activeBtn: unknown
}

interface MenuItemEditorProps {
  menuId: number
  items: MenuItemRow[]
}

function DeleteMenuItemButton({ id, menuId }: { id: number; menuId: number }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('삭제하시겠습니까?')) return
    startTransition(async () => {
      const res = await deleteMenuItemAction(id, menuId)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('삭제되었습니다.')
      }
    })
  }

  return (
    <Button variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
      {pending ? '삭제 중…' : '삭제'}
    </Button>
  )
}

export function MenuItemEditor({ menuId, items }: MenuItemEditorProps) {
  const [createState, createAction, createPending] = useActionState<ActionState | null, FormData>(
    createMenuItemAction,
    null,
  )

  return (
    <div className="space-y-6">
      {/* 기존 아이템 목록 */}
      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 p-6 text-center text-sm text-zinc-500">
          등록된 메뉴 항목이 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} menuId={menuId} />
          ))}
        </div>
      )}

      {/* 새 MenuItem 추가 폼 */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">새 메뉴 항목 추가</h3>
        <form action={createAction} className="space-y-3 max-w-lg">
          <input type="hidden" name="menuId" value={menuId} />

          {createState?.error && (
            <p className="text-sm text-red-600">{createState.error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="new-title">이름</Label>
              <Input id="new-title" name="title" placeholder="항목 이름" required maxLength={200} />
              {createState?.fieldErrors?.title && (
                <p className="text-xs text-red-500">{createState.fieldErrors.title[0]}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-url">URL</Label>
              <Input id="new-url" name="url" placeholder="/path/to/page" />
            </div>
          </div>
          <div className="space-y-1 w-28">
            <Label htmlFor="new-listOrder">순서</Label>
            <Input id="new-listOrder" name="listOrder" type="number" defaultValue={0} />
          </div>

          <Button type="submit" size="sm" disabled={createPending}>
            {createPending ? '추가 중…' : '항목 추가'}
          </Button>
        </form>
      </div>
    </div>
  )
}

function MenuItemRow({ item, menuId }: { item: MenuItemRow; menuId: number }) {
  const [editState, editAction, editPending] = useActionState<ActionState | null, FormData>(
    updateMenuItemAction,
    null,
  )

  return (
    <div className="rounded border border-zinc-200 p-4 space-y-4">
      <form action={editAction} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="menuId" value={menuId} />

        {editState?.error && (
          <p className="text-sm text-red-600">{editState.error}</p>
        )}

        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`title-${item.id}`}>이름</Label>
            <Input
              id={`title-${item.id}`}
              name="title"
              defaultValue={item.title}
              placeholder="항목 이름"
              maxLength={200}
            />
            {editState?.fieldErrors?.title && (
              <p className="text-xs text-red-500">{editState.fieldErrors.title[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor={`url-${item.id}`}>URL</Label>
              {item.openInNewWindow && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  새 창
                </span>
              )}
            </div>
            <Input
              id={`url-${item.id}`}
              name="url"
              defaultValue={item.url ?? ''}
              placeholder="/path/to/page"
            />
            {editState?.fieldErrors?.url && (
              <p className="text-xs text-red-500">{editState.fieldErrors.url[0]}</p>
            )}
          </div>
        </div>

        {/* Icon and CSS Class */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`icon-${item.id}`}>아이콘</Label>
            <Input
              id={`icon-${item.id}`}
              name="icon"
              defaultValue={item.icon ?? ''}
              placeholder="icon-class"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`cssClass-${item.id}`}>CSS 클래스</Label>
            <Input
              id={`cssClass-${item.id}`}
              name="cssClass"
              defaultValue={item.cssClass ?? ''}
              placeholder="custom-class"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor={`description-${item.id}`}>설명</Label>
          <Textarea
            id={`description-${item.id}`}
            name="description"
            defaultValue={item.description ?? ''}
            placeholder="메뉴 항목 설명"
            rows={2}
          />
        </div>

        {/* Group IDs ACL - multi-select for MemberGroup */}
        <div className="space-y-1">
          <Label htmlFor={`groupIds-${item.id}`}>접근 그룹 (ACL)</Label>
          <Input
            id={`groupIds-${item.id}`}
            name="groupIds"
            defaultValue={item.groupIds.join(',')}
            placeholder="쉼표로 구분된 그룹 ID (예: 1,2,3)"
          />
          <p className="text-xs text-zinc-500">
            빈 값이면 전체 공개. 쉼표로 구분된 MemberGroup ID를 입력하세요.
          </p>
          {editState?.fieldErrors?.groupIds && (
            <p className="text-xs text-red-500">{editState.fieldErrors.groupIds[0]}</p>
          )}
        </div>

        {/* List Order */}
        <div className="space-y-1 w-32">
          <Label htmlFor={`listOrder-${item.id}`}>순서</Label>
          <Input
            id={`listOrder-${item.id}`}
            name="listOrder"
            type="number"
            defaultValue={item.listOrder}
          />
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="openInNewWindow"
              defaultChecked={item.openInNewWindow}
              className="h-4 w-4"
            />
            <span className="text-sm">새 창에서 열기</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="expand"
              defaultChecked={item.expand}
              className="h-4 w-4"
            />
            <span className="text-sm">펼쳐진 상태</span>
          </label>
        </div>

        {/* Button State JSONs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`normalBtn-${item.id}`}>버튼 상태 (일반)</Label>
            <Textarea
              id={`normalBtn-${item.id}`}
              name="normalBtn"
              defaultValue={typeof item.normalBtn === 'string' ? item.normalBtn : JSON.stringify(item.normalBtn ?? {}, null, 2)}
              placeholder='{"color": "..."}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`hoverBtn-${item.id}`}>버튼 상태 (호버)</Label>
            <Textarea
              id={`hoverBtn-${item.id}`}
              name="hoverBtn"
              defaultValue={typeof item.hoverBtn === 'string' ? item.hoverBtn : JSON.stringify(item.hoverBtn ?? {}, null, 2)}
              placeholder='{"color": "..."}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`activeBtn-${item.id}`}>버튼 상태 (활성)</Label>
            <Textarea
              id={`activeBtn-${item.id}`}
              name="activeBtn"
              defaultValue={typeof item.activeBtn === 'string' ? item.activeBtn : JSON.stringify(item.activeBtn ?? {}, null, 2)}
              placeholder='{"color": "..."}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={editPending}>
            {editPending ? '저장 중…' : '저장'}
          </Button>
          <DeleteMenuItemButton id={item.id} menuId={menuId} />
        </div>
      </form>
    </div>
  )
}
