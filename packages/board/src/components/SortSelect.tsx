/**
 * SortSelect — SPEC-BOARD-UI-001 REQ-BUI-005
 *
 * 게시판 목록 정렬 드롭다운. 서버 컴포넌트(index-page.tsx)가 계산한 옵션별 URL을
 * 그대로 받아, 선택 시 해당 URL로 이동한다 (RSC 경계 — 순수 서버 컴포넌트는
 * onChange를 가질 수 없어 이 부분만 클라이언트 컴포넌트로 분리).
 *
 * @MX:SPEC: SPEC-BOARD-UI-001 REQ-BUI-005, AC-BUI-005
 */
'use client';

import { useRouter } from 'next/navigation';

interface SortOption {
  value: string;
  label: string;
  href: string;
}

interface SortSelectProps {
  options: SortOption[];
  value: string;
}

export function SortSelect({ options, value }: SortSelectProps) {
  const router = useRouter();

  return (
    <select
      name="sort"
      data-testid="sort-select"
      value={value}
      onChange={(e) => {
        const target = options.find((o) => o.value === e.target.value);
        if (target) {
          router.push(target.href);
        }
      }}
      className="border rounded px-2 py-1"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
