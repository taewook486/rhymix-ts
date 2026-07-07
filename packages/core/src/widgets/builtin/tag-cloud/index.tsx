/**
 * tag-cloud 위젯 — SPEC-TAG-001 (REQ-TAG-005)
 *
 * 태그 클라우드 위젯
 * 태그 사용 빈도에 따라 폰트 크기를 비례하여 표시
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-005
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

// @MX:NOTE: [AUTO] 위젯 props 스키마 — Zod 런타임 검증
export const tagCloudWidgetPropsSchema = z.object({
  /** 표시 태그 수 (기본 30) */
  limit: z.number().int().min(1).max(100).default(30).optional(),
  /** 최소 폰트 크기 (px, 기본 12) */
  minFontSize: z.number().int().min(8).max(32).default(12).optional(),
  /** 최대 폰트 크기 (px, 기본 24) */
  maxFontSize: z.number().int().min(12).max(72).default(24).optional(),
  /** 정렬 순서 (count: 사용 빈도순, name: 이름순, random: 무작위) */
  sortBy: z.enum(['count', 'name', 'random']).default('count').optional(),
});

export type TagCloudWidgetProps = z.infer<typeof tagCloudWidgetPropsSchema>;

interface Tag {
  id: number;
  name: string;
  count: number;
}

/**
 * REQ-TAG-005: 태그 클라우드 위젯
 * - 태그 사용 빈도에 따라 폰트 크기를 비례하여 표시
 * - 위젯 설정: 표시 태그 수, 최소/최대 폰트 크기, 정렬 순서
 */
export function TagCloudWidget(props: TagCloudWidgetProps) {
  // @MX:NOTE: [AUTO] props 기본값 — Zod 스키마에서 추출
  const {
    limit = 30,
    minFontSize = 12,
    maxFontSize = 24,
    sortBy = 'count',
  } = props;

  // TODO: tRPC에서 태그 목록 가져오기
  // const { data: tags } = trpc.tag.listAll.useQuery();
  // 임시 더미 데이터
  const tags: Tag[] = [];

  if (tags.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded text-center text-gray-500">
        태그가 없습니다.
      </div>
    );
  }

  // 정렬 적용
  const sortedTags = [...tags].sort((a, b) => {
    if (sortBy === 'count') {
      return b.count - a.count; // 사용 빈도 내림차순
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ko'); // 이름 오름차순
    } else {
      return Math.random() - 0.5; // 무작위
    }
  });

  // 제한 개수만큼 자르기
  const limitedTags = sortedTags.slice(0, limit);

  // 폰트 크기 계산 (로그 스케일로 시각적 개선)
  const maxCount = Math.max(...limitedTags.map((t) => t.count));
  const minCount = Math.min(...limitedTags.map((t) => t.count));

  function getFontSize(count: number): number {
    if (maxCount === minCount) {
      return (minFontSize + maxFontSize) / 2;
    }
    // 로그 스케일로 크기 계산 (큰 값 간의 차이를 줄임)
    const logMax = Math.log(maxCount);
    const logMin = Math.log(minCount);
    const logCount = Math.log(count);
    const ratio = (logCount - logMin) / (logMax - logMin);
    return minFontSize + ratio * (maxFontSize - minFontSize);
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded" data-testid="tag-cloud-widget">
      <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        태그 클라우드
      </h3>
      <div className="flex flex-wrap gap-2">
        {limitedTags.map((tag) => {
          const fontSize = getFontSize(tag.count);
          return (
            <Link
              key={tag.id}
              href={`/tag/${encodeURIComponent(tag.name)}`}
              className="inline-block hover:underline transition-all"
              style={{
                fontSize: `${fontSize}px`,
                opacity: 0.7 + (tag.count / maxCount) * 0.3, // 빈도에 따른 투명도
              }}
              data-testid={`tag-cloud-link-${tag.id}`}
            >
              {tag.name}
            </Link>
          );
        })}
      </div>
      {tags.length > limit && (
        <div className="mt-3 text-xs text-gray-500 text-right">
          전체 {tags.length}개 중 {limit}개 표시
        </div>
      )}
    </div>
  );
}

// @MX:ANCHOR: [AUTO] tagCloudWidget — 빌트인 등록 배럴에서 fan_in >= 3
// @MX:REASON: registerBuiltinWidgets, 렌더 파이프라인, 테스트에서 참조
// @MX:SPEC: SPEC-TAG-001 REQ-TAG-005
export const tagCloudWidget: WidgetDefinition<TagCloudWidgetProps> = {
  name: 'tag-cloud',
  displayName: '태그 클라우드',
  description: '태그 사용 빈도에 따라 폰트 크기를 비례하여 표시하는 클라우드 위젯',
  propsSchema: tagCloudWidgetPropsSchema,
  Component: TagCloudWidget,
  defaultProps: {
    limit: 30,
    minFontSize: 12,
    maxFontSize: 24,
    sortBy: 'count',
  },
  category: 'content',
};
