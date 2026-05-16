/**
 * 위젯 시스템 타입 정의 — SPEC-ADMIN-001 Slice G
 *
 * React 의존성 없음 — ComponentType은 구조적 타입으로 정의한다.
 */
import type { ZodSchema } from 'zod'

/**
 * 위젯 컴포넌트 타입 (React.ComponentType 호환, React import 없이 정의).
 * RSC/클라이언트 컴포넌트 모두 호환된다.
 */
export type WidgetComponent<P = Record<string, unknown>> = (props: P) => unknown

// @MX:NOTE: [AUTO] WidgetDefinition — 위젯 등록 인터페이스. Component는 RSC 호환.
export interface WidgetDefinition<P = Record<string, unknown>> {
  /** 위젯 고유 식별자 (kebab-case 권장) */
  name: string
  /** 관리자 UI에 표시되는 이름 */
  displayName: string
  /** props 런타임 검증 스키마 */
  propsSchema: ZodSchema<P>
  /** React 컴포넌트 (RSC 호환) */
  Component: WidgetComponent<P>
  /** 기본 props 값 */
  defaultProps?: Partial<P>
}
