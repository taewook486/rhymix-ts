/**
 * content 빌트인 위젯 — SPEC-WIDGET-001 Slice C
 *
 * 최근 게시글 목록을 표시한다.
 * 실제 DB 조회는 apps/web의 렌더 파이프라인이 items prop을 통해 주입한다.
 * packages/core는 Next.js/Prisma 직접 의존성 없이 순수 React 컴포넌트로 유지한다.
 */
import React from 'react'
import { z } from 'zod'
import type { WidgetDefinition } from '../../types'

// 위젯 props 스키마
// z.coerce.number()는 HTML 속성(문자열)을 숫자로 자동 변환한다
const contentSchema = z.object({
  /** 대상 미드 (특정 게시판 필터링, 선택적) */
  targetMid: z.string().optional(),
  /** 표시할 게시글 수 (1~30, HTML 속성에서 문자열 자동 변환) */
  listCount: z.coerce.number().min(1).max(30).default(5),
  /** 정렬 순서 */
  order: z.enum(['latest', 'popular']).default('latest'),
  /**
   * 렌더 파이프라인이 주입하는 게시글 목록.
   * 미주입 시 빈 상태 UI를 표시한다.
   */
  items: z
    .array(
      z.object({
        id: z.number(),
        title: z.string(),
        createdAt: z.string(),
        mid: z.string(),
      }),
    )
    .optional(),
})

type ContentProps = z.infer<typeof contentSchema>

/**
 * 콘텐츠(최근 글) 위젯 컴포넌트.
 *
 * - items 배열이 주입되면 목록을 렌더링한다.
 * - items가 없거나 빈 배열이면 빈 컨테이너를 렌더링한다.
 */
function ContentWidget({ targetMid, listCount, order, items }: ContentProps) {
  const displayItems = items ?? []

  return (
    <div
      data-widget="content"
      data-target-mid={targetMid}
      data-list-count={listCount}
      data-order={order}
    >
      {displayItems.length === 0 ? (
        <span className="widget-content-empty" />
      ) : (
        <ul className="widget-content-list">
          {displayItems.map((item) => (
            <li key={item.id} className="widget-content-item">
              <a href={`/${item.mid}/${item.id}`}>{item.title}</a>
              <time dateTime={item.createdAt}>{item.createdAt}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// @MX:ANCHOR: [AUTO] contentWidget — 빌트인 등록 배럴, 렌더 파이프라인에서 fan_in >= 3
// @MX:REASON: registerBuiltinWidgets, 렌더 파이프라인, 테스트에서 참조
export const contentWidget: WidgetDefinition<ContentProps> = {
  name: 'content',
  displayName: '콘텐츠 (최근 글)',
  description: '지정한 게시판의 최근 게시글 목록을 표시한다.',
  category: '콘텐츠',
  propsSchema: contentSchema,
  Component: ContentWidget,
  defaultProps: {
    listCount: 5,
    order: 'latest',
  },
}
