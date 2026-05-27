/**
 * module.ts — SPEC-PAGE-001 Slice B
 *
 * 페이지 모듈 정의 (ModuleDefinition<PageConfig>).
 * registerModule 로 등록되어 [mid]/page.tsx 에서 라우팅된다.
 *
 * @MX:ANCHOR [AUTO]: 페이지 모듈의 단일 진입점.
 * @MX:REASON: register.ts, [mid]/page.tsx, admin edit page 등 3개 이상의 호출 지점이 이 정의를 참조.
 * @MX:SPEC: SPEC-PAGE-001 REQ-PAGE-001
 */
import React from 'react'
import type { ModuleDefinition } from '@rhymix-ts/core/modules'
import type { z } from 'zod'
import { pageConfigSchema, defaultPageConfig, type PageConfig } from './config'
import { loadPageContent } from './service'
import { PageBody } from './components/PageBody'
import type { ModuleRoutePageProps } from '@rhymix-ts/core/modules'

/**
 * 페이지 인덱스 라우트 핸들러.
 * ModuleInstance 에서 mcontent 를 로드해 PageBody 로 렌더링.
 */
async function pageIndexRoute(props: ModuleRoutePageProps): Promise<React.ReactNode> {
  const { instance, prisma } = props
  const content = await loadPageContent(instance.id, prisma)
  return React.createElement(PageBody, { mcontent: content?.mcontent ?? null })
}

/**
 * 페이지 모듈 정의.
 */
export const pageModuleDefinition: ModuleDefinition<PageConfig> = {
  code: 'page',
  displayName: '페이지',
  description: '정적 HTML 콘텐츠와 위젯을 조합한 페이지 모듈',
  configSchema: pageConfigSchema as z.ZodType<PageConfig>,
  defaultConfig: defaultPageConfig,
  routes: {
    index: pageIndexRoute,
  },
  cacheTags: (instanceId) => [`page:${instanceId}`],
}
