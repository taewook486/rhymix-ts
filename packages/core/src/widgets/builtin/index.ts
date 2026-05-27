/**
 * 빌트인 위젯 idempotent 등록 배럴 — SPEC-WIDGET-001 Slice C
 *
 * 이 파일을 import하면 모든 빌트인 위젯이 레지스트리에 등록된다.
 * HMR(Hot Module Replacement) 환경에서 중복 등록을 방지하기 위해
 * _initialized 플래그로 한 번만 실행되도록 제어한다.
 *
 * 사용법:
 *   import { registerBuiltinWidgets } from '@rhymix-ts/core/widgets/builtin'
 *   registerBuiltinWidgets()
 *
 * NOTE: registerBuiltinWidgets()는 apps/web의 앱 부트스트랩(lib/modules/register.ts)에서
 * 호출되어야 한다. 현재 해당 파일은 PAGE 에이전트 소유이므로 직접 수정하지 않는다.
 * 대신 앱 진입점(layout.tsx 또는 별도 bootstrap 파일)에서 호출하도록 한다.
 */
import { registerWidget } from '../registry'
import { loginInfoWidget } from './login-info'
import { contentWidget } from './content'

let _initialized = false

/**
 * 빌트인 위젯을 레지스트리에 등록한다.
 * 멱등성 보장 — 여러 번 호출해도 한 번만 등록된다.
 */
export function registerBuiltinWidgets(): void {
  if (_initialized) return
  registerWidget(loginInfoWidget)
  registerWidget(contentWidget)
  _initialized = true
}

/**
 * 테스트 격리용 초기화 함수.
 * resetWidgetRegistry() 호출 후 이 함수도 호출해야 재등록이 가능하다.
 */
export function resetBuiltinWidgetsInit(): void {
  _initialized = false
}

export { loginInfoWidget, contentWidget }
