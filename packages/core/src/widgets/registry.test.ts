/**
 * G-1: WidgetRegistry 단위 테스트 — TDD RED 페이즈
 * SPEC-ADMIN-001 Slice G
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  registerWidget,
  getWidget,
  listWidgets,
  resetWidgetRegistry,
} from './registry'
import type { WidgetDefinition } from './types'

// 테스트용 mock 위젯 정의 (React import 없이 WidgetComponent 타입 사용)
const mockDef: WidgetDefinition<{ x: number }> = {
  name: 'test',
  displayName: 'Test',
  propsSchema: z.object({ x: z.number() }),
  Component: (() => null) as unknown as (props: { x: number }) => unknown,
}

describe('WidgetRegistry (Slice G-1)', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('G-1-1: registerWidget → getWidget 반환', () => {
    registerWidget(mockDef)
    const result = getWidget('test')
    expect(result).toBeDefined()
    expect(result?.name).toBe('test')
    expect(result?.displayName).toBe('Test')
  })

  it('G-1-2: 중복 registerWidget → 마지막 등록으로 덮어쓰기', () => {
    registerWidget(mockDef)
    const overrideDef: WidgetDefinition<{ x: number }> = {
      ...mockDef,
      displayName: 'Test Updated',
    }
    registerWidget(overrideDef)
    const result = getWidget('test')
    expect(result?.displayName).toBe('Test Updated')
  })

  it('G-1-3: 미등록 name → getWidget 반환 undefined', () => {
    const result = getWidget('nonexistent')
    expect(result).toBeUndefined()
  })

  it('G-1-4: listWidgets → 등록된 전체 목록 반환', () => {
    const anotherDef: WidgetDefinition<{ y: string }> = {
      name: 'another',
      displayName: 'Another',
      propsSchema: z.object({ y: z.string() }),
      Component: (() => null) as unknown as (props: { y: string }) => unknown,
    }
    registerWidget(mockDef)
    registerWidget(anotherDef)
    const list = listWidgets()
    expect(list).toHaveLength(2)
    expect(list.map((w) => w.name)).toContain('test')
    expect(list.map((w) => w.name)).toContain('another')
  })

  it('G-1-5: resetWidgetRegistry → listWidgets 빈 배열', () => {
    registerWidget(mockDef)
    resetWidgetRegistry()
    expect(listWidgets()).toHaveLength(0)
  })
})
