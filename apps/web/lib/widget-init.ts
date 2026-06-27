// SPEC-WIDGET-001 Slice C — 위젯 초기화 모듈
// [app-rsc] 컨텍스트에서 빌트인 위젯을 레지스트리에 등록한다.
//
// instrumentation.ts는 [instrumentation] 컨텍스트에서 실행되므로
// Turbopack 멀티 컨텍스트 환경에서 [app-rsc] 싱글톤과 분리된다.
// renderBodyWithWidgets가 호출되는 RSC 경로에서 별도 등록이 필요하다.
//
// REQ-WIDGET-001

import { registerBuiltinWidgets } from '@rhymix-ts/core/widgets/builtin';

// @MX:NOTE: [AUTO] widget-init — [app-rsc] 컨텍스트 위젯 등록 진입점. layout-init.ts와 동일 패턴.
registerBuiltinWidgets();
