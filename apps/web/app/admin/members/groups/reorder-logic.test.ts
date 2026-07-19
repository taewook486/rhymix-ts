/**
 * 그룹 재배치 순수 로직 테스트 — SPEC-MEMBER-ADMIN-001 Slice C.
 *
 * DnD 이벤트 자체(pointer/keyboard sensor)는 dnd-kit 라이브러리가 검증하므로,
 * 이 프로젝트가 소유하는 "드래그 결과 → listOrder 재계산" 로직만 순수 함수로
 * 분리하여 테스트한다.
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-011, REQ-MADM-012, REQ-MADM-013
 */
import { describe, it, expect } from 'vitest';
import { computeReorder, type ReorderableGroup } from './reorder-logic';

const groups: ReorderableGroup[] = [
  { id: 1, title: 'A', listOrder: 0 },
  { id: 2, title: 'B', listOrder: 1 },
  { id: 3, title: 'C', listOrder: 2 },
];

describe('computeReorder', () => {
  it('AC-C2: C를 A 위로 드래그 → 순서가 C, A, B 가 된다', () => {
    const result = computeReorder(groups, 3, 1);

    expect(result.items.map((g) => g.id)).toEqual([3, 1, 2]);
    // listOrder 는 0부터 연속 재계산된다.
    expect(result.ops).toEqual([
      { id: 3, listOrder: 0 },
      { id: 1, listOrder: 1 },
      { id: 2, listOrder: 2 },
    ]);
  });

  it('activeId === overId 이면 변경 없음(no-op)', () => {
    const result = computeReorder(groups, 1, 1);

    expect(result.items.map((g) => g.id)).toEqual([1, 2, 3]);
    expect(result.ops).toEqual([]);
  });

  it('존재하지 않는 id 는 원본을 그대로 반환한다(방어적 가드)', () => {
    const result = computeReorder(groups, 99, 1);

    expect(result.items).toEqual(groups);
    expect(result.ops).toEqual([]);
  });
});
