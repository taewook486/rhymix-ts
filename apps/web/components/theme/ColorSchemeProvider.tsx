'use client';

/**
 * ColorSchemeProvider — 다크모드 상태 관리를 위한 React Context Provider
 *
 * REQ-THEME-POLISH-030~032, REQ-THEME-POLISH-067
 *
 * @remarks
 * - 초기 state는 항상 'light' (SSR safety)
 * - useEffect에서 client-side localStorage를 읽어 sync
 * - toggle 시 setState + localStorage + <html> classList 동시 업데이트
 * - 전역 mutable state 없음 (REQ-THEME-POLISH-067 준수)
 */

import { createContext, useContext, useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark';

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  toggle: () => void;
  supportsDarkMode: boolean;
}

export const ColorSchemeContext = createContext<ColorSchemeContextValue>({
  colorScheme: 'light',
  toggle: () => {},
  supportsDarkMode: true,
});

/**
 * useColorScheme hook — 현재 컬러 스킴과 토글 함수를 반환
 */
export function useColorScheme() {
  return useContext(ColorSchemeContext);
}

interface ColorSchemeProviderProps {
  children: React.ReactNode;
  /**
   * 테마 manifest의 supportsDarkMode 값 (테마가 다크모드를 지원하는지 여부)
   * REQ-THEME-POLISH-035
   */
  supportsDarkMode?: boolean;
}

/**
 * ColorSchemeProvider — 다크모드 상태 관리 Provider
 *
 * @example
 * ```tsx
 * <ColorSchemeProvider supportsDarkMode={true}>
 *   <DarkModeToggle />
 * </ColorSchemeProvider>
 * ```
 */
export function ColorSchemeProvider({ children, supportsDarkMode = true }: ColorSchemeProviderProps) {
  // SSR: 항상 light 모드로 시작 (REQ-THEME-POLISH-034)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  // SSR 은 항상 light 로 렌더해야 하므로(하이드레이션 불일치 방지) 클라이언트
  // 마운트 후에만 실제 선호를 반영할 수 있다. lazy initializer 로 옮기면
  // 서버/클라이언트 첫 렌더가 어긋난다.
  useEffect(() => {
    // 클라이언트 마운트 후 localStorage에서 읽어 sync
    // inline script가 이미 <html> class를 설정했으므로 시각적 FOIT 없음
    const pref = localStorage.getItem('rx-color-scheme');
    if (pref === 'dark') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColorScheme('dark');
    } else if (pref === null && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setColorScheme('dark');
    }
  }, []);

  const toggle = () => {
    setColorScheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('rx-color-scheme', next);

      // <html> 요소에 dark 클래스 토글
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      return next;
    });
  };

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, toggle, supportsDarkMode: supportsDarkMode ?? true }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}
