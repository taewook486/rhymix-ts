/**
 * Hello Widget — 내장 위젯 예시
 * SPEC-ADMIN-001 Slice G
 */
import { z } from 'zod'
import type { WidgetDefinition } from '@rhymix-ts/core/widgets'

/**
 * HelloWidget 컴포넌트.
 * name props를 받아 인사말을 표시한다.
 */
function HelloWidget({ name }: { name: string }) {
  return <div data-widget="hello">Hello, {name}!</div>
}

export const helloWidgetDef: WidgetDefinition<{ name: string }> = {
  name: 'hello',
  displayName: 'Hello Widget',
  // z.string() 사용 — ZodDefault는 input 타입이 달라 타입 불일치 발생
  propsSchema: z.object({ name: z.string() }) as unknown as import('zod').ZodSchema<{ name: string }>,
  Component: HelloWidget,
  defaultProps: { name: 'World' },
}
