/**
 * jest-dom 매처의 vitest Assertion 타입 보강.
 *
 * @testing-library/jest-dom은 vitest를 peerDependency로 선언하지 않아,
 * 그 패키지 내부의 `import 'vitest'`가 apps/web의 로컬 vitest(v3)가 아니라
 * pnpm 디렉터리 탐색으로 루트의 vitest(v2)로 우회 해석될 수 있다.
 * 그 결과 @testing-library/jest-dom/vitest가 제공하는 타입 보강이
 * apps/web 테스트 파일이 실제로 import하는 vitest(v3)의 Assertion과
 * 병합되지 않아 toBeInTheDocument 등에서 TS2339가 발생한다.
 *
 * 이 파일은 apps/web 안에 있으므로 아래 `import 'vitest'`는 항상
 * apps/web의 로컬 vitest로 정확히 resolve되어 문제를 피한다.
 */
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  // 모듈 확장(declaration merging)이라 interface 여야 한다. type 별칭으로 바꾸면
  // vitest 의 기존 Assertion 과 병합되지 않아 매처 타입이 사라진다.
  /* eslint-disable @typescript-eslint/no-empty-object-type */
  interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
  /* eslint-enable @typescript-eslint/no-empty-object-type */
}
