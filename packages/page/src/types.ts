/**
 * types.ts — SPEC-PAGE-001 Slice A
 *
 * 페이지 모듈 핵심 타입 정의.
 */

/** 페이지 렌더링 방식 */
export type PageType = 'CONTENT' | 'WIDGET' | 'ARTICLE'

/**
 * 페이지 모듈 인스턴스의 본문 콘텐츠.
 *
 * @MX:NOTE [AUTO]: mcontent 는 ModuleInstance.mcontent 컬럼에서 직접 로드.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-001
 */
export interface PageContent {
  instanceId: number
  mcontent: string | null
  pageType: PageType
  mcontentFormat: 'HTML'
}
