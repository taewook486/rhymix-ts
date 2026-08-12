/**
 * jest-dom 매처의 vitest Assertion 타입 보강 (packages/board 전용).
 *
 * `@testing-library/jest-dom`은 vitest를 peerDependency로 선언하지 않는다. 그래서 그
 * 패키지 내부의 `import 'vitest'`가 packages/board의 로컬 vitest(v3)가 아니라 pnpm의
 * 디렉터리 상위 탐색으로 **루트의 vitest(v2.1.9)**로 우회 해석될 수 있다. TypeScript의
 * ambient module augmentation은 모듈의 물리적 경로(= 정확히 어느 버전) 단위로 머지되므로,
 * 두 버전이 다르면 서로 다른 모듈로 취급돼 타입 보강이 합쳐지지 않는다. 그 결과
 * `toBeInTheDocument` / `toHaveAttribute` 등에서 TS2339가 발생했다.
 *
 * 이 파일이 packages/board 안에 있으므로 아래 `import 'vitest'`는 항상 이 패키지의
 * 로컬 vitest로 정확히 resolve되어 문제를 피한다.
 *
 * 런타임 매처 등록은 `src/components/test-setup.ts`가 로컬 `expect`를 직접 extend하는
 * 방식으로 이미 올바르게 동작한다 — 건드리지 말 것. `@testing-library/jest-dom/vitest`
 * 진입점으로 런타임까지 바꾸면 그 진입점 내부의 `require('vitest')`가 같은 우회-resolve
 * 문제를 겪어 매처 등록 자체가 실패하는 회귀가 생긴다(apps/web에서 실측 후 되돌린 이력).
 *
 * 같은 처방이 `apps/web/types/jest-dom.d.ts`에도 적용되어 있다. 근본 해결은 모노레포
 * 전체의 vitest 버전 통일(루트 v2 → v3)이지만 breaking change 위험이 있어 국소 처방을 쓴다.
 */
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
