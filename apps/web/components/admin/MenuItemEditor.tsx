'use client'
/**
 * MenuItem 1-depth 트리 편집기 — SPEC-ADMIN-001 Slice D.
 *
 * 텍스트 입력 기반 reorder (listOrder 숫자 직접 편집).
 *
 * @MX:TODO: [AUTO] Slice E 에서 드래그앤드롭(dnd-kit) 도입 예정.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 * @MX:PRIORITY: P1
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030, REQ-ADMIN-032, REQ-ADMIN-033
 */
import { useActionState, useTransition } from 'react'
import { Button, Input, Label } from '@rhymix-ts/ui/components'
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
      {/* 드래그앤드롭은 Slice E 에서 추가됩니다 */}
      <p className="text-sm text-zinc-500 italic">
        드래그앤드롭은 Slice E 에서 추가됩니다. 현재는 listOrder 숫자를 직접 편집하여 순서를 변경할 수 있습니다.
      </p>

      {/* 기존 아이템 목록 */}
      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 p-6 text-center text-sm text-zinc-500">
          등록된 메뉴 항목이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
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
    <div className="flex items-start gap-3 rounded border border-zinc-200 p-3">
      <div className="flex-1">
        <form action={editAction} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="menuId" value={menuId} />

          <Input
            name="title"
            defaultValue={item.title}
            className="w-40 h-7 text-sm"
            placeholder="이름"
          />
          <Input
            name="url"
            defaultValue={item.url ?? ''}
            className="w-48 h-7 text-sm"
            placeholder="URL"
          />
          <Input
            name="listOrder"
            type="number"
            defaultValue={item.listOrder}
            className="w-16 h-7 text-sm"
            placeholder="순서"
          />
          <Button type="submit" size="sm" variant="outline" disabled={editPending}>
            {editPending ? '저장 중…' : '저장'}
          </Button>
          {editState?.error && (
            <span className="text-xs text-red-500">{editState.error}</span>
          )}
        </form>
      </div>
      <DeleteMenuItemButton id={item.id} menuId={menuId} />
    </div>
  )
}
