/**
 * module.test.ts — SPEC-PAGE-001 Slice B
 *
 * pageModuleDefinition 통합 테스트.
 * routes.index 렌더링 + rx-widget pass-through 계약 (REQ-PAGE-008/051).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PrismaClient } from '@prisma/client'

// service 목 처리 (DOMPurify 의존성 격리)
vi.mock('./service.js', async () => {
  const actual = await vi.importActual<typeof import('./service')>('./service.js')
  return {
    ...actual,
    // sanitizePageBody 는 테스트에서 실제 구현 사용 (isomorphic-dompurify)
  }
})

/** 목 prisma 팩토리 */
function makePrisma(mcontent: string | null) {
  const instance = {
    id: 1,
    siteId: 1,
    moduleCode: 'page',
    mid: 'home',
    name: '홈페이지',
    mcontent,
    config: {
      id: 1,
      moduleInstanceId: 1,
      config: { pageType: 'CONTENT', mcontentFormat: 'HTML' },
      updatedAt: new Date(),
    },
  }

  return {
    moduleInstance: {
      findUnique: vi.fn().mockResolvedValue(instance),
    },
  } as unknown as PrismaClient
}

/** 목 인스턴스 팩토리 */
function makeInstance() {
  return {
    id: 1,
    siteId: 1,
    moduleCode: 'page',
    mid: 'home',
    name: '홈페이지',
    config: null,
  }
}

describe('pageModuleDefinition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('MOD-1: code 가 "page" 이다', async () => {
    const { pageModuleDefinition } = await import('./module.js')
    expect(pageModuleDefinition.code).toBe('page')
  })

  it('MOD-2: displayName 이 "페이지" 이다', async () => {
    const { pageModuleDefinition } = await import('./module.js')
    expect(pageModuleDefinition.displayName).toBe('페이지')
  })

  it('MOD-3: configSchema 가 기본값 CONTENT 를 파싱한다', async () => {
    const { pageModuleDefinition } = await import('./module.js')
    const config = pageModuleDefinition.configSchema.parse({})
    expect(config.pageType).toBe('CONTENT')
    expect(config.mcontentFormat).toBe('HTML')
  })

  it('MOD-4: routes.index 에서 목 prisma 로 PageBody 노드를 반환한다', async () => {
    // Arrange
    const prisma = makePrisma('<p>테스트 콘텐츠</p>')
    const instance = makeInstance()
    const { pageModuleDefinition } = await import('./module.js')

    // Act
    const node = await pageModuleDefinition.routes.index!({
      instance: instance as never,
      params: {},
      searchParams: {},
      prisma,
    })

    // Assert: 노드가 null/undefined 가 아님
    expect(node).not.toBeNull()
    const html = renderToStaticMarkup(node as React.ReactElement)
    expect(html).toContain('data-page-body="true"')
  })

  it('MOD-5: mcontent 가 있으면 렌더된 HTML 에 포함됨', async () => {
    // Arrange
    const prisma = makePrisma('<p>페이지 본문</p>')
    const instance = makeInstance()
    const { pageModuleDefinition } = await import('./module.js')

    // Act
    const node = await pageModuleDefinition.routes.index!({
      instance: instance as never,
      params: {},
      searchParams: {},
      prisma,
    })

    const html = renderToStaticMarkup(node as React.ReactElement)
    // Assert
    expect(html).toContain('페이지 본문')
  })

  it('MOD-6: mcontent 가 null 이면 빈 PageBody 를 반환한다 (오류 없음)', async () => {
    // Arrange
    const prisma = makePrisma(null)
    const instance = makeInstance()
    const { pageModuleDefinition } = await import('./module.js')

    // Act & Assert — 오류 발생 시 테스트 실패
    const node = await pageModuleDefinition.routes.index!({
      instance: instance as never,
      params: {},
      searchParams: {},
      prisma,
    })

    const html = renderToStaticMarkup(node as React.ReactElement)
    expect(html).toContain('data-page-empty="true"')
  })

  it('MOD-7: prisma 조회 실패해도 오류를 throw 하지 않고 빈 PageBody 반환', async () => {
    // Arrange
    const prisma = {
      moduleInstance: {
        findUnique: vi.fn().mockRejectedValue(new Error('DB 오류')),
      },
    } as unknown as PrismaClient
    const instance = makeInstance()
    const { pageModuleDefinition } = await import('./module.js')

    // Act & Assert
    const node = await pageModuleDefinition.routes.index!({
      instance: instance as never,
      params: {},
      searchParams: {},
      prisma,
    })

    const html = renderToStaticMarkup(node as React.ReactElement)
    expect(html).toContain('data-page-empty="true"')
  })

  it('MOD-8: rx-widget 토큰이 렌더된 HTML 에 pass-through 된다 (REQ-PAGE-008/051)', async () => {
    // Arrange
    const prisma = makePrisma('<rx-widget name="login_info" />')
    const instance = makeInstance()
    const { pageModuleDefinition } = await import('./module.js')

    // Act
    const node = await pageModuleDefinition.routes.index!({
      instance: instance as never,
      params: {},
      searchParams: {},
      prisma,
    })

    const html = renderToStaticMarkup(node as React.ReactElement)
    // Assert: rx-widget 엘리먼트가 살아남아야 한다
    expect(html).toContain('rx-widget')
    expect(html).toContain('login_info')
  })

  it('MOD-9: cacheTags 는 page:1 형태를 반환한다', async () => {
    const { pageModuleDefinition } = await import('./module.js')
    const tags = pageModuleDefinition.cacheTags!(1)
    expect(tags).toContain('page:1')
  })
})
