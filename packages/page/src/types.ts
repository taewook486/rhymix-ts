/**
 * types.ts — SPEC-PAGE-001 Slice A + SPEC-ADMIN-002 Slice 3D.
 *
 * 페이지 모듈 핵심 타입 정의.
 * REQ-ADMIN2-028: 모바일 콘텐츠 지원 추가.
 */

/** 페이지 렌더링 방식 */
export type PageType = 'CONTENT' | 'WIDGET' | 'ARTICLE'

/**
 * 페이지 모듈 인스턴스의 본문 콘텐츠.
 *
 * @MX:NOTE [AUTO]: mcontent 는 ModuleInstance.mcontent 컬럼에서 직접 로드.
 *           mcontentMobile 는 ModuleConfig.config.mcontentMobile 에서 로드 (REQ-ADMIN2-028).
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-001 + SPEC-ADMIN-002 REQ-ADMIN2-028
 */
export interface PageContent {
  instanceId: number
  mcontent: string | null
  mcontentMobile?: string | null // 모바일 전용 콘텐츠 (REQ-ADMIN2-028)
  pageType: PageType
  mcontentFormat: 'HTML'
}
