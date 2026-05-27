/**
 * config.ts — SPEC-PAGE-001 Slice A
 *
 * 페이지 모듈 설정 Zod 스키마 및 파싱 함수.
 */
import { z } from 'zod'

/**
 * 페이지 모듈 설정 스키마.
 *
 * @MX:ANCHOR [AUTO]: ModuleDefinition.configSchema 에서 참조. 설정 검증의 단일 진입점.
 * @MX:REASON: pageModule, savePageContent, admin edit action 등 3곳 이상에서 사용.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-002
 */
export const pageConfigSchema = z.object({
  pageType: z.enum(['CONTENT', 'WIDGET', 'ARTICLE']).default('CONTENT'),
  mcontentFormat: z.literal('HTML').default('HTML'),
})

export type PageConfig = z.infer<typeof pageConfigSchema>

export const defaultPageConfig: PageConfig = pageConfigSchema.parse({})

/**
 * 알 수 없는 입력에서 PageConfig 를 파싱한다.
 * 유효하지 않은 필드는 기본값으로 대체되지 않고 오류를 던진다.
 *
 * @MX:NOTE [AUTO]: ModuleConfig.config (Json) 역직렬화 시 사용.
 */
export function parsePageConfig(raw: unknown): PageConfig {
  return pageConfigSchema.parse(raw)
}
