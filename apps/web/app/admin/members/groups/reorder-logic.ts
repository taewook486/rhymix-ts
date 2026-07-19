/**
 * 그룹 재배치 순수 로직 — SPEC-MEMBER-ADMIN-001 Slice C.
 *
 * DnD 드래그 결과(activeId 를 overId 위치로 이동)를 새 배열 + 서버에 보낼
 * listOrder 갱신 오퍼레이션 목록으로 변환한다. DnD 이벤트 자체는 다루지 않는다
 * (dnd-kit 라이브러리 책임).
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-011, REQ-MADM-012, REQ-MADM-013
 */

export interface ReorderableGroup {
  id: number;
  title: string;
  listOrder: number;
}

export interface ReorderOp {
  id: number;
  listOrder: number;
}

export interface ReorderResult<T extends ReorderableGroup> {
  items: T[];
  ops: ReorderOp[];
}

/**
 * `activeId` 항목을 `overId` 항목의 위치로 이동시킨 새 배열과, 변경된 listOrder를
 * 서버에 반영하기 위한 오퍼레이션 목록을 계산한다.
 *
 * - activeId === overId 이거나 둘 중 하나가 목록에 없으면 no-op(원본 그대로, ops: []).
 * - 이동 후 전체 항목의 listOrder를 0부터 연속으로 재계산한다.
 */
export function computeReorder<T extends ReorderableGroup>(
  items: T[],
  activeId: number,
  overId: number,
): ReorderResult<T> {
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);

  if (activeId === overId || oldIndex === -1 || newIndex === -1) {
    return { items, ops: [] };
  }

  const next = [...items];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved as T);

  const reindexed = next.map((item, index) => ({ ...item, listOrder: index }));
  const ops: ReorderOp[] = reindexed.map((item) => ({ id: item.id, listOrder: item.listOrder }));

  return { items: reindexed, ops };
}
