// @vitest-environment jsdom
/**
 * SPEC-LEGACY-PARITY-001 M4 — MenuItemDnDTree 특성화 테스트 (감사 D4/D1).
 *
 * M4 가 이 컴포넌트의 행 액션 영역에 복제 버튼을 추가하기 **전에**, 지금
 * 건드리려는 두 행동 경로를 고정한다 (구현보다 특성화가 먼저):
 *
 *   1. 자식 lazy load 계약 — 펼침 토글 → admin.menuItem.list.fetch({menuId,
 *      parentId}) → 부모 바로 뒤 depth+1 로 삽입, 접기 → 자손 제거
 *   2. DnD 형제 reorder payload 계약 — 드래그 완료 → 같은 부모의 형제 전체를
 *      화면 순서로 index 재부여한 ops [{id, parentId, listOrder}] 를
 *      admin.menuItem.reorder.mutateAsync({menuId, items}) 로 전송
 *
 * jsdom 제약: PointerSensor 는 jsdom PointerEvent 로 구동할 수 없어 KeyboardSensor
 * 로 드래그를 구동한다. closestCenter/sortableKeyboardCoordinates 는 항목 사각형을
 * 재는데 jsdom 의 getBoundingClientRect 는 전부 0 이라 항목 구분이 안 되므로,
 * 행(li) 순서 기반 사각형으로 스텁한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ---------------------------------------------------------------------------
// 모듈 mock — 컴포넌트가 쓰는 3면만 (TRPCProvider / next/navigation / sonner)
// ---------------------------------------------------------------------------

const mockReorderMutateAsync = vi.fn()
const mockDuplicateMutateAsync = vi.fn()
const mockListFetch = vi.fn()
const mockRouterRefresh = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()
const toastInfo = vi.fn()

vi.mock('@/providers/TRPCProvider', () => ({
  trpc: {
    admin: {
      menuItem: {
        reorder: {
          useMutation: () => ({ mutateAsync: (...a: unknown[]) => mockReorderMutateAsync(...a) }),
        },
        duplicate: {
          useMutation: () => ({ mutateAsync: (...a: unknown[]) => mockDuplicateMutateAsync(...a) }),
        },
        list: { fetch: (...a: unknown[]) => mockListFetch(...a) },
      },
    },
    useUtils: () => ({
      admin: { menuItem: { list: { fetch: (...a: unknown[]) => mockListFetch(...a) } } },
    }),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    info: (...a: unknown[]) => toastInfo(...a),
  },
}))

// ---------------------------------------------------------------------------
// jsdom 폴리필 — @dnd-kit 측정 경로
// ---------------------------------------------------------------------------

// dnd-kit 측정 유틸이 참조할 수 있는 ResizeObserver 스텁 (jsdom 미구현)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// 행(li) 순서 기반 사각형: i번째 행 = top i*44, 높이 40 — 항목 간 거리가
// 달라야 closestCenter 가 ArrowDown 이동 시 다음 항목을 고를 수 있다.
let restoreRects: (() => void) | null = null

function stubRowRects(): void {
  const original = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const li = this.closest('li')
    if (li && li.parentElement) {
      const rows = Array.from(li.parentElement.children)
      const idx = rows.indexOf(li)
      if (idx >= 0) {
        const top = idx * 44
        return {
          x: 0, y: top, top, left: 0, width: 300, height: 40,
          right: 300, bottom: top + 40, toJSON: () => ({}),
        } as DOMRect
      }
    }
    return original.call(this)
  }
  restoreRects = () => {
    Element.prototype.getBoundingClientRect = original
  }
}

// ---------------------------------------------------------------------------
// 픽스처
// ---------------------------------------------------------------------------

interface Row {
  id: number
  title: string
  parentId: number | null
  listOrder: number
}

const topLevelRows: Row[] = [
  { id: 1, title: '항목1', parentId: null, listOrder: 0 },
  { id: 2, title: '항목2', parentId: null, listOrder: 1 },
  { id: 3, title: '항목3', parentId: null, listOrder: 2 },
]

async function renderTree(items: Row[]) {
  const { MenuItemDnDTree } = await import('./MenuItemDnDTree')
  render(React.createElement(MenuItemDnDTree, { menuId: 1, initialItems: items }))
}

/** 화면에 보이는 행 제목 순서 (ul > li 의 텍스트에서 제목만 추출) */
function rowTitles(): (string | null)[] {
  return Array.from(document.querySelectorAll('ul > li')).map((li) => {
    const span = li.querySelector('span.flex-1')
    return span?.textContent ?? null
  })
}

// ---------------------------------------------------------------------------
// 특성화 1 — 자식 lazy load 계약
// ---------------------------------------------------------------------------

describe('MenuItemDnDTree 특성화 — 자식 lazy load (M4 착수 전 고정)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubRowRects()
  })
  afterEach(() => {
    restoreRects?.()
    restoreRects = null
  })

  it('펼침 → list.fetch({menuId, parentId}) 후 부모 바로 뒤에 자식 렌더, 접기 → 제거', async () => {
    mockListFetch.mockResolvedValueOnce([
      { id: 11, title: '자식1', parentId: 1, listOrder: 0 },
      { id: 12, title: '자식2', parentId: 1, listOrder: 1 },
    ])
    await renderTree([{ id: 1, title: '루트', parentId: null, listOrder: 0 }])

    // 펼침 토글 클릭 → lazy load
    fireEvent.click(screen.getByRole('button', { name: '자식 펼치기' }))

    await waitFor(() => {
      expect(mockListFetch).toHaveBeenCalledWith({ menuId: 1, parentId: 1 })
    })
    await waitFor(() => {
      expect(rowTitles()).toEqual(['루트', '자식1', '자식2'])
    })

    // 접기 토글 → 자손 제거 (lazy load 와 정확히 반대 경로)
    fireEvent.click(screen.getByRole('button', { name: '자식 접기' }))
    await waitFor(() => {
      expect(rowTitles()).toEqual(['루트'])
    })
  })
})

// ---------------------------------------------------------------------------
// 특성화 2 — DnD 형제 reorder payload 계약
// ---------------------------------------------------------------------------

describe('MenuItemDnDTree 특성화 — 형제 reorder payload (M4 착수 전 고정)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubRowRects()
  })
  afterEach(() => {
    restoreRects?.()
    restoreRects = null
  })

  it('형제 드래그 완료 → 형제 전체 재색인 ops 를 reorder 로 전송 + router.refresh', async () => {
    mockReorderMutateAsync.mockResolvedValueOnce({ updated: 3 })
    await renderTree(topLevelRows)

    expect(rowTitles()).toEqual(['항목1', '항목2', '항목3'])

    // KeyboardSensor 드래그: 항목1 그립에서 Space(시작) → ArrowDown(한 칸 아래) → Space(완료).
    // 시작 직후 센서는 setTimeout(0) 으로 document keydown 리스너를 붙이므로(코어 소스
    // KeyboardSensor.attach), 이동/완료 키는 매크로태스크 경계 뒤에 보낸다.
    const firstRow = document.querySelectorAll('ul > li')[0]!
    const grip = firstRow.querySelector('button')!
    grip.focus()
    fireEvent.keyDown(grip, { key: ' ', code: 'Space' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.keyDown(document.body, { key: 'ArrowDown', code: 'ArrowDown' })
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' })

    // 화면 순서 [항목1,항목2,항목3] → 항목1 을 한 칸 내리면 [항목2,항목1,항목3].
    // payload 계약: 같은 부모의 형제 전체를 index(0..) 재부여한 op 배열
    await waitFor(() => {
      expect(mockReorderMutateAsync).toHaveBeenCalledTimes(1)
    })
    expect(mockReorderMutateAsync).toHaveBeenCalledWith({
      menuId: 1,
      items: [
        { id: 2, parentId: null, listOrder: 0 },
        { id: 1, parentId: null, listOrder: 1 },
        { id: 3, parentId: null, listOrder: 2 },
      ],
    })
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled()
    })
    expect(toastSuccess).toHaveBeenCalledWith('순서가 변경되었습니다')
    expect(toastError).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// M4 — 항목 복제 버튼 (AC-SITE-001 UI 배선)
//
// 행 액션 영역의 복제 버튼 클릭 → admin.menuItem.duplicate.mutateAsync({id})
// → 반환된 새 루트 id 행을 원본 서브트리 뒤에 삽입 + router.refresh + 토스트.
// 서브트리 재귀 복사·listOrder 무충돌은 라우터 단위 테스트(menu-item.test.ts
// M4-1)가 담당하고, 여기는 UI 배선만 고정한다.
// ---------------------------------------------------------------------------

describe('MenuItemDnDTree — M4 항목 복제 버튼', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubRowRects()
  })
  afterEach(() => {
    restoreRects?.()
    restoreRects = null
  })

  it('복제 클릭 → duplicate({id}) 전송, 새 루트 행을 원본 뒤에 삽입 + refresh + 토스트', async () => {
    mockDuplicateMutateAsync.mockResolvedValueOnce({ id: 90, created: 2 })
    await renderTree(topLevelRows)

    // 항목2(두 번째 행)의 복제 버튼
    const duplicateButtons = screen.getAllByRole('button', { name: '복제' })
    expect(duplicateButtons).toHaveLength(3)
    fireEvent.click(duplicateButtons[1]!)

    await waitFor(() => {
      expect(mockDuplicateMutateAsync).toHaveBeenCalledTimes(1)
    })
    expect(mockDuplicateMutateAsync).toHaveBeenCalledWith({ id: 2 })

    // 새 루트 행(id 90)이 항목2 뒤(원본 서브트리 끝)에 삽입된다
    await waitFor(() => {
      expect(rowTitles()).toEqual(['항목1', '항목2', '항목2', '항목3'])
    })
    const thirdRow = document.querySelectorAll('ul > li')[2]!
    expect(thirdRow.textContent).toContain('ID: 90')

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled()
    })
    expect(toastSuccess).toHaveBeenCalledWith('항목이 복제되었습니다')
    expect(toastError).not.toHaveBeenCalled()
  })
})
