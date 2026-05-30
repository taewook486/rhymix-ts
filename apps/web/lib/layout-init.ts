// SPEC-LAYOUT-001 Slice C — 레이아웃 초기화 모듈
// apps/web 진입점에서 import하여 default 레이아웃을 레지스트리에 등록한다.
// REQ-LAYOUT-009: 정적 등록 전용 (동적 import 금지)

import { registerLayout } from '@rhymix-ts/core';
import DefaultLayout from '../../../themes/default/layouts/default';

/**
 * default 레이아웃을 레지스트리에 등록한다.
 * 이 함수는 앱 초기화 시 한 번 호출되어야 한다.
 * 멱등성: 이미 등록된 경우 registry.ts의 경고 로직에 따라 no-op.
 *
 * REQ-LAYOUT-009
 */
// @MX:NOTE: [AUTO] initLayouts — apps/web 레이아웃 초기화 진입점
registerLayout('default', DefaultLayout);
