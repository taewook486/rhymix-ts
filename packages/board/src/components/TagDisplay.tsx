/**
 * TagDisplay — SPEC-TAG-001 (REQ-TAG-003)
 *
 * 게시물 상세 뷰 태그 표시 컴포넌트
 * 본문 하단에 태그 목록을 칩 형태로 표시하고, 클릭 시 /tag/{tagName}으로 이동
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-003
 */
import React from 'react';
import Link from 'next/link';

interface TagDisplayProps {
  /** 태그 목록 */
  tags: Array<{ id: number; name: string }>;
}

/**
 * REQ-TAG-003: 게시물 상세 뷰 태그 표시
 * - 본문 하단에 태그 목록을 칩 형태로 표시
 * - 클릭 시 /tag/{tagName}으로 이동
 */
export function TagDisplay({ tags }: TagDisplayProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700" data-testid="tag-display">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${encodeURIComponent(tag.name)}`}
            className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            data-testid={`tag-link-${tag.id}`}
          >
            <span className="mr-1">#</span>
            <span>{tag.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
