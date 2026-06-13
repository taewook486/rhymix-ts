'use client';

/**
 * DarkModeToggle — 다크모드 토글 버튼 컴포넌트
 *
 * REQ-THEME-POLISH-030, REQ-THEME-POLISH-035, REQ-THEME-POLISH-038
 *
 * @remarks
 * - GlobalHeader 우측에 렌더링 (REQ-THEME-POLISH-038)
 * - supportsDarkMode=false일 때 비활성화 (REQ-THEME-POLISH-035)
 */

import { useColorScheme } from './ColorSchemeProvider';

/**
 * DarkModeToggle — 다크모드 토글 버튼
 *
 * @example
 * ```tsx
 * <DarkModeToggle />
 * ```
 */
export function DarkModeToggle() {
  const { colorScheme, toggle, supportsDarkMode } = useColorScheme();

  if (!supportsDarkMode) {
    return (
      <button
        disabled
        title="이 테마는 다크모드를 지원하지 않습니다"
        className="rounded-md p-2 text-gray-400 cursor-not-allowed opacity-50"
        aria-label="다크모드 지원 안 함"
      >
        {/* Moon icon */}
        <span className="text-xl" role="img" aria-hidden="true">
          🌙
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={colorScheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-gray-300"
      type="button"
    >
      {colorScheme === 'dark' ? (
        <span className="text-xl" role="img" aria-hidden="true">
          ☀️
        </span>
      ) : (
        <span className="text-xl" role="img" aria-hidden="true">
          🌙
        </span>
      )}
    </button>
  );
}
