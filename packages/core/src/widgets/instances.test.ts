/**
 * instances.ts 단위 테스트 — SPEC-WIDGET-001 Slice A
 *
 * Prisma 클라이언트를 Mock으로 대체하여 CRUD 동작을 검증한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import type { WidgetInstance } from '@prisma/client'
import {
  listWidgetInstances,
  createWidgetInstance,
  updateWidgetInstance,
  deleteWidgetInstance,
} from './instances'
import { registerWidget, resetWidgetRegistry } from './registry'
import type { WidgetDefinition } from './types'

// 테스트용 위젯 정의
const testDef: WidgetDefinition<{ title: string; count: number }> = {
  name: 'test_widget',
  displayName: '테스트 위젯',
  propsSchema: z.object({ title: z.string(), count: z.number().default(1) }),
  Component: (() => null) as unknown as (props: { title: string; count: number }) => unknown,
  defaultProps: { count: 1 },
}

// Prisma Mock 팩토리
function makePrismaMock(overrides: Record<string, unknown> = {}) {
  const now = new Date()
  const baseInstance: WidgetInstance = {
    id: 1,
    widgetName: 'test_widget',
    label: '테스트 레이블',
    props: { title: '안녕', count: 1 },
    createdAt: now,
    updatedAt: now,
  }

  return {
    widgetInstance: {
      findMany: vi.fn().mockResolvedValue([baseInstance]),
      findUniqueOrThrow: vi.fn().mockResolvedValue(baseInstance),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseInstance, ...data })
      ),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...baseInstance, ...data })
      ),
      delete: vi.fn().mockResolvedValue(baseInstance),
    },
    ...overrides,
  } as unknown as import('@prisma/client').PrismaClient
}

describe('listWidgetInstances — Slice A', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('A-INST-1: 등록된 widgetName → registered: true', async () => {
    registerWidget(testDef)
    const prisma = makePrismaMock()
    const result = await listWidgetInstances(prisma)
    expect(result).toHaveLength(1)
    expect(result[0]!.registered).toBe(true)
  })

  it('A-INST-2: 미등록 widgetName → registered: false', async () => {
    // testDef를 등록하지 않음
    const prisma = makePrismaMock()
    const result = await listWidgetInstances(prisma)
    expect(result).toHaveLength(1)
    expect(result[0]!.registered).toBe(false)
  })

  it('A-INST-3: 빈 목록 → 빈 배열 반환', async () => {
    const prisma = {
      widgetInstance: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as import('@prisma/client').PrismaClient
    const result = await listWidgetInstances(prisma)
    expect(result).toHaveLength(0)
  })
})

describe('createWidgetInstance — Slice A', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('A-INST-4: 유효 props → DB에 저장 후 반환', async () => {
    registerWidget(testDef)
    const prisma = makePrismaMock()
    const result = await createWidgetInstance(
      { widgetName: 'test_widget', label: '새 인스턴스', props: { title: '제목', count: 3 } },
      prisma,
    )
    expect(result).toBeDefined()
    expect(prisma.widgetInstance.create).toHaveBeenCalledOnce()
  })

  it('A-INST-5: 미등록 위젯 → Error throw', async () => {
    const prisma = makePrismaMock()
    await expect(
      createWidgetInstance(
        { widgetName: 'unknown_widget', label: '레이블', props: {} },
        prisma,
      ),
    ).rejects.toThrow()
  })

  it('A-INST-6: 유효하지 않은 props → Error throw (저장 안 됨)', async () => {
    registerWidget(testDef)
    const prisma = makePrismaMock()
    // title이 필수인데 누락 (defaultProps도 없음)
    await expect(
      createWidgetInstance(
        { widgetName: 'test_widget', label: '레이블', props: { count: 5 } },
        prisma,
      ),
    ).rejects.toThrow()
    // create가 호출되지 않아야 함
    expect(prisma.widgetInstance.create).not.toHaveBeenCalled()
  })
})

describe('updateWidgetInstance — Slice A', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('A-INST-7: label 변경 → 검증 없이 업데이트', async () => {
    registerWidget(testDef)
    const prisma = makePrismaMock()
    const result = await updateWidgetInstance(1, { label: '수정된 레이블' }, prisma)
    expect(result).toBeDefined()
    expect(prisma.widgetInstance.update).toHaveBeenCalledOnce()
  })

  it('A-INST-8: props 변경 + 유효 → 업데이트', async () => {
    registerWidget(testDef)
    const prisma = makePrismaMock()
    const result = await updateWidgetInstance(
      1,
      { props: { title: '새 제목', count: 2 } },
      prisma,
    )
    expect(result).toBeDefined()
  })

  it('A-INST-9: props 변경 + 유효하지 않음 → Error throw, update 미호출', async () => {
    registerWidget(testDef)
    const prisma = makePrismaMock()
    // title에 number 전달 → 검증 실패
    await expect(
      updateWidgetInstance(1, { props: { title: 999, count: 2 } }, prisma),
    ).rejects.toThrow()
    expect(prisma.widgetInstance.update).not.toHaveBeenCalled()
  })
})

describe('deleteWidgetInstance — Slice A', () => {
  it('A-INST-10: 존재하는 ID → delete 호출', async () => {
    const prisma = makePrismaMock()
    await deleteWidgetInstance(1, prisma)
    expect(prisma.widgetInstance.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
