/**
 * service.test.ts — SPEC-PAGE-001 Slice A
 *
 * loadPageContent / savePageContent / sanitizePageBody / parsePageConfig 단위 테스트.
 */
import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { loadPageContent, savePageContent, sanitizePageBody } from './service'
import { parsePageConfig } from './config'

// ---------- 목(mock) prisma 팩토리 ----------

/** 'page' 모듈 인스턴스 목 */
function makePageInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    siteId: 1,
    moduleCode: 'page',
    mid: 'home',
    name: '홈페이지',
    mcontent: '<p>안녕하세요</p>',
    config: {
      id: 1,
      moduleInstanceId: 1,
      config: { pageType: 'CONTENT', mcontentFormat: 'HTML' },
      updatedAt: new Date(),
    },
    ...overrides,
  }
}

/** findUnique 가 항상 null 을 반환하는 목 prisma */
function makePrismaNullInstance() {
  return {
    moduleInstance: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClient
}

/** findUnique 가 주어진 인스턴스를 반환하는 목 prisma */
function makePrismaWithInstance(instance: ReturnType<typeof makePageInstance>) {
  return {
    moduleInstance: {
      findUnique: vi.fn().mockResolvedValue(instance),
      update: vi.fn().mockResolvedValue(instance),
    },
    moduleConfig: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        moduleInstance: { update: vi.fn().mockResolvedValue(instance) },
        moduleConfig: { upsert: vi.fn().mockResolvedValue({}) },
      })
    }),
  } as unknown as PrismaClient
}

// ---------- loadPageContent ----------

describe('loadPageContent', () => {
  it('SVC-1: 인스턴스가 없으면 null 반환', async () => {
    // Arrange
    const prisma = makePrismaNullInstance()
    // Act
    const result = await loadPageContent(999, prisma)
    // Assert
    expect(result).toBeNull()
  })

  it('SVC-2: moduleCode 가 "page" 가 아니면 null 반환', async () => {
    // Arrange
    const instance = makePageInstance({ moduleCode: 'board' })
    const prisma = makePrismaWithInstance(instance)
    // Act
    const result = await loadPageContent(1, prisma)
    // Assert
    expect(result).toBeNull()
  })

  it('SVC-3: 유효한 page 인스턴스면 PageContent 반환', async () => {
    // Arrange
    const instance = makePageInstance()
    const prisma = makePrismaWithInstance(instance)
    // Act
    const result = await loadPageContent(1, prisma)
    // Assert
    expect(result).not.toBeNull()
    expect(result?.instanceId).toBe(1)
    expect(result?.mcontent).toBe('<p>안녕하세요</p>')
    expect(result?.pageType).toBe('CONTENT')
    expect(result?.mcontentFormat).toBe('HTML')
  })

  it('SVC-4: mcontent 가 null 인 인스턴스도 null mcontent 로 반환', async () => {
    // Arrange
    const instance = makePageInstance({ mcontent: null })
    const prisma = makePrismaWithInstance(instance)
    // Act
    const result = await loadPageContent(1, prisma)
    // Assert
    expect(result).not.toBeNull()
    expect(result?.mcontent).toBeNull()
  })

  it('SVC-5: DB 오류 발생 시 null 반환 (throw 하지 않음)', async () => {
    // Arrange
    const prisma = {
      moduleInstance: {
        findUnique: vi.fn().mockRejectedValue(new Error('DB 오류')),
      },
    } as unknown as PrismaClient
    // Act
    const result = await loadPageContent(1, prisma)
    // Assert
    expect(result).toBeNull()
  })
})

// ---------- savePageContent ----------

describe('savePageContent', () => {
  it('SVC-6: 정상 입력 시 PageContent 반환', async () => {
    // Arrange
    const instance = makePageInstance()
    const prisma = makePrismaWithInstance(instance)
    // Act
    const result = await savePageContent(
      { instanceId: 1, mcontent: '<p>새 내용</p>', pageType: 'CONTENT' },
      prisma,
    )
    // Assert
    expect(result.instanceId).toBe(1)
    expect(result.mcontent).toBe('<p>새 내용</p>')
    expect(result.pageType).toBe('CONTENT')
    expect(result.mcontentFormat).toBe('HTML')
  })

  it('SVC-7: $transaction 이 호출됨', async () => {
    // Arrange
    const instance = makePageInstance()
    const prisma = makePrismaWithInstance(instance)
    // Act
    await savePageContent(
      { instanceId: 1, mcontent: '<p>내용</p>', pageType: 'WIDGET' },
      prisma,
    )
    // Assert
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })
})

// ---------- sanitizePageBody ----------

describe('sanitizePageBody', () => {
  it('SVC-8: script 태그 제거', async () => {
    // Arrange
    const raw = '<p>텍스트</p><script>alert(1)</script>'
    // Act
    const result = await sanitizePageBody(raw)
    // Assert
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert(1)')
    expect(result).toContain('<p>텍스트</p>')
  })

  it('SVC-9: onclick 이벤트 핸들러 제거', async () => {
    // Arrange
    const raw = '<div onclick="evil()">클릭</div>'
    // Act
    const result = await sanitizePageBody(raw)
    // Assert
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('evil()')
    expect(result).toContain('클릭')
  })

  it('SVC-10: <rx-widget name="login_info" /> 보존 (REQ-PAGE-008)', async () => {
    // Arrange
    const raw = '<p>위젯:</p><rx-widget name="login_info" />'
    // Act
    const result = await sanitizePageBody(raw)
    // Assert
    expect(result).toContain('rx-widget')
    expect(result).toContain('name="login_info"')
  })

  it('SVC-11: <rx-widget name="content" data-list-count="5" /> 보존 (REQ-PAGE-008)', async () => {
    // Arrange
    const raw = '<rx-widget name="content" data-list-count="5" />'
    // Act
    const result = await sanitizePageBody(raw)
    // Assert
    expect(result).toContain('rx-widget')
    expect(result).toContain('name="content"')
    expect(result).toContain('data-list-count')
  })

  it('SVC-12: 표준 HTML 태그 보존', async () => {
    // Arrange
    const raw = '<h1>제목</h1><p>단락</p><strong>강조</strong>'
    // Act
    const result = await sanitizePageBody(raw)
    // Assert
    expect(result).toContain('<h1>제목</h1>')
    expect(result).toContain('<p>단락</p>')
    expect(result).toContain('<strong>강조</strong>')
  })
})

// ---------- parsePageConfig ----------

describe('parsePageConfig', () => {
  it('SVC-13: 유효한 입력 파싱 성공', () => {
    // Arrange
    const input = { pageType: 'WIDGET', mcontentFormat: 'HTML' }
    // Act
    const result = parsePageConfig(input)
    // Assert
    expect(result.pageType).toBe('WIDGET')
    expect(result.mcontentFormat).toBe('HTML')
  })

  it('SVC-14: 빈 객체는 기본값으로 파싱 성공', () => {
    // Act
    const result = parsePageConfig({})
    // Assert
    expect(result.pageType).toBe('CONTENT')
    expect(result.mcontentFormat).toBe('HTML')
  })

  it('SVC-15: 유효하지 않은 pageType 은 오류 발생', () => {
    // Arrange
    const input = { pageType: 'INVALID' }
    // Act & Assert
    expect(() => parsePageConfig(input)).toThrow()
  })
})
