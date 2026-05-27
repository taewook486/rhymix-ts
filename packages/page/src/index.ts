/**
 * index.ts — SPEC-PAGE-001
 *
 * @rhymix-ts/page 패키지 공개 API 배럴.
 *
 * @MX:ANCHOR [AUTO]: 패키지 단일 진입점.
 * @MX:REASON: apps/web, register.ts, [mid]/page.tsx 등 3개 이상 소비 지점.
 */

// 모듈 정의
export { pageModuleDefinition } from './module'

// 타입
export type { PageContent, PageType } from './types'

// 설정
export { pageConfigSchema, defaultPageConfig, parsePageConfig } from './config'
export type { PageConfig } from './config'

// 서비스 함수
export { loadPageContent, savePageContent, sanitizePageBody } from './service'

// 컴포넌트
export { PageBody } from './components/PageBody'
