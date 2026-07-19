/**
 * 위젯 시스템 타입 정의 — SPEC-WIDGET-001
 *
 * React 의존성 없음 — ComponentType은 구조적 타입으로 정의한다.
 */
import type { ZodType, ZodTypeDef } from 'zod'

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
  propsSchema: ZodType<P, ZodTypeDef, unknown>
  /** React 컴포넌트 (RSC 호환) */
  Component: WidgetComponent<P>
  /** 기본 props 값 */
  defaultProps?: Partial<P>
  /** 위젯 설명 (선택적) */
  description?: string
  /** 위젯 카테고리 (선택적) */
  category?: string
  /**
   * 렌더 컨텍스트(인증 상태 등)에서 동적 props를 추출한다.
   * 토큰 속성에서 파싱된 props보다 우선순위가 높다(오버라이드).
   * 세션 기반 위젯(login_info 등)이 인증 상태를 주입받을 때 사용한다.
   * DB 조회가 필요한 위젯(tag-cloud 등)을 위해 Promise 반환도 허용한다 —
   * 호출부(renderBodyWithWidgets)가 await 하므로 동기 반환도 그대로 호환된다.
   */
  resolveContextProps?: (ctx: WidgetRenderContext) => Partial<P> | Promise<Partial<P>>
}

/**
 * 위젯 렌더링 컨텍스트 — 서버 사이드 렌더 파이프라인에서 주입된다.
 * packages/core는 Next.js 의존성이 없으므로 타입만 정의하고
 * 실제 auth() 호출은 apps/web 레이어에서 처리한다.
 */
// @MX:ANCHOR: [AUTO] WidgetRenderContext — 렌더 파이프라인 전체에서 fan_in >= 3
// @MX:REASON: renderBodyWithWidgets, 빌트인 위젯, admin 페이지에서 공통 사용
export interface WidgetRenderContext {
  /** 관리자 여부 — 에러 메시지 노출 제어 */
  isAdmin: boolean
  /** 현재 인증된 사용자 (null이면 비로그인) */
  user?: { id: number; nickname: string } | null
  /** Prisma 클라이언트 인스턴스 */
  prisma: import('@prisma/client').PrismaClient
  /** 도메인 ID (선택적) */
  domainId?: number
}

/**
 * HTML 본문에서 파싱된 rx-widget 토큰 구조.
 * data-* 속성은 camelCase로 변환하여 저장한다.
 */
export interface WidgetToken {
  /** 위젯 이름 (name 속성 값) */
  name: string
  /** data-* 속성 → camelCase 변환된 props 맵 */
  props: Record<string, string>
  /** 원본 토큰 문자열 (치환 기준점으로 사용) */
  raw: string
}
