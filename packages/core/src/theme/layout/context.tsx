'use client';
// SPEC-LAYOUT-001 Slice B — LayoutContext + LayoutProvider + hooks
// REQ-LAYOUT-005: LayoutContextValue를 React Context로 주입

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { LayoutContextValue } from './types';

/**
 * 레이아웃 컨텍스트.
 * 기본값은 null — LayoutProvider 외부에서 useLayoutContext를 호출하면 throw.
 *
 * REQ-LAYOUT-005
 */
// @MX:ANCHOR: [AUTO] LayoutContext — 레이아웃 컨텍스트 공개 API 경계
// @MX:REASON: LayoutProvider, useLayoutContext, useLayoutContextOptional 모두 이 객체에 fan_in >= 3
export const LayoutContext = createContext<LayoutContextValue | null>(null);

/**
 * LayoutProvider 컴포넌트.
 * Client Component ('use client' 지시어 적용됨).
 * apps/web의 page/layout에서 resolveLayoutFromInstance 결과를 주입한다.
 *
 * REQ-LAYOUT-005
 */
export function LayoutProvider({
  value,
  children,
}: {
  value: LayoutContextValue;
  children: ReactNode;
}) {
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

/**
 * LayoutContextValue를 반환하는 훅.
 * LayoutProvider 외부에서 호출하면 Error를 throw한다.
 *
 * REQ-LAYOUT-005
 */
// @MX:ANCHOR: [AUTO] useLayoutContext — 레이아웃 컨텍스트 소비 훅
// @MX:REASON: 위젯, 페이지, 레이아웃 컴포넌트 전반에서 호출됨 (fan_in >= 3 예상)
export function useLayoutContext(): LayoutContextValue {
  const value = useContext(LayoutContext);
  if (value === null) {
    throw new Error('[Layout] useLayoutContext must be used within a LayoutProvider');
  }
  return value;
}

/**
 * LayoutContextValue를 반환하는 훅 (nullable 버전).
 * LayoutProvider 외부에서 호출하면 null을 반환한다.
 *
 * REQ-LAYOUT-005
 */
export function useLayoutContextOptional(): LayoutContextValue | null {
  return useContext(LayoutContext);
}
