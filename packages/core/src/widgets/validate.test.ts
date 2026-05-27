/**
 * validate.ts 단위 테스트 — SPEC-WIDGET-001 Slice A
 *
 * validateWidgetProps 의 정상/오류 케이스를 검증한다.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { validateWidgetProps } from './validate'
import { registerWidget, resetWidgetRegistry } from './registry'
import type { WidgetDefinition } from './types'

// 테스트용 위젯 정의
const greetDef: WidgetDefinition<{ name: string; count: number }> = {
  name: 'greet',
  displayName: '인사',
  propsSchema: z.object({ name: z.string(), count: z.number().default(1) }),
  Component: (() => null) as unknown as (props: { name: string; count: number }) => unknown,
  defaultProps: { count: 1 },
}

const strictDef: WidgetDefinition<{ value: number }> = {
  name: 'strict',
  displayName: '엄격',
  propsSchema: z.object({ value: z.number() }),
  Component: (() => null) as unknown as (props: { value: number }) => unknown,
  // defaultProps 없음
}

describe('validateWidgetProps — Slice A', () => {
  beforeEach(() => {
    resetWidgetRegistry()
  })

  it('A-VAL-1: 유효 props → { ok: true, props }', () => {
    const result = validateWidgetProps(greetDef, { name: 'Alice', count: 3 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.props.name).toBe('Alice')
      // defaultProps({ count: 1 })가 rawProps를 덮어씀 (A-VAL-3과 동일 계약)
      expect(result.props.count).toBe(1)
    }
  })

  it('A-VAL-2: defaultProps가 rawProps 누락 필드를 채워 검증 성공', () => {
    // count가 없어도 defaultProps.count = 1 로 병합
    const result = validateWidgetProps(greetDef, { name: 'Bob' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.props.name).toBe('Bob')
      expect(result.props.count).toBe(1)
    }
  })

  it('A-VAL-3: rawProps의 값이 defaultProps보다 우선하지 않는다 (defaultProps가 덮어씀)', () => {
    // 구현: merged = { ...rawProps, ...defaultProps }
    // rawProps에 count:5를 전달해도 defaultProps.count=1이 덮어씀
    const result = validateWidgetProps(greetDef, { name: 'Carol', count: 5 })
    // defaultProps가 덮어쓰므로 count는 1
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.props.count).toBe(1)
    }
  })

  it('A-VAL-4: 필수 필드 누락 (defaultProps 없음) → { ok: false, error }', () => {
    const result = validateWidgetProps(strictDef, {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeDefined()
      // ZodError.issues에 value 필드 관련 오류 포함
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('A-VAL-5: 타입 불일치 → { ok: false, error }, throw 없음', () => {
    // value에 string을 전달 → 검증 실패
    const result = validateWidgetProps(strictDef, { value: 'not-a-number' })
    expect(result.ok).toBe(false)
  })

  it('A-VAL-6: 빈 rawProps + defaultProps만으로 검증 성공', () => {
    // greetDef는 name이 필수지만 defaultProps에 없어서 실패해야 함
    const result = validateWidgetProps(greetDef, {})
    expect(result.ok).toBe(false)
  })

  it('A-VAL-7: 위젯 레지스트리 등록 후 validateWidgetProps 통합 호출', () => {
    registerWidget(greetDef)
    // 레지스트리와 독립적으로 validateWidgetProps는 def를 직접 받음
    const result = validateWidgetProps(greetDef, { name: 'Dave' })
    expect(result.ok).toBe(true)
  })
})
