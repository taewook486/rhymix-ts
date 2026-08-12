// SPEC-LAYOUT-001 Slice C — DefaultLayout 단위 테스트
// REQ-LAYOUT-031, REQ-LAYOUT-033, REQ-LAYOUT-050

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ParsedExtraVars } from '../../../packages/core/src/theme/layout/types';

/**
 * 기본 extraVars 픽스처 (footerText 없음).
 */
const baseExtraVars: ParsedExtraVars = {
  layoutType: 'MAIN_PAGE',
};

/**
 * footerText가 있는 extraVars 픽스처.
 */
const extraVarsWithFooter: ParsedExtraVars = {
  layoutType: 'SUB_PAGE',
  footerText: '커스텀 푸터 텍스트',
  siteTitle: '테스트 사이트',
};

describe('DefaultLayout', () => {
  // DL-1: 컴포넌트가 export default 함수여야 한다
  it('DefaultLayout이 함수로 export 되어야 한다', async () => {
    const module = await import('./default');
    expect(typeof module.default).toBe('function');
  });

  // DL-2: children을 포함한 ReactNode를 반환해야 한다
  it('DefaultLayout이 children을 올바르게 렌더해야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    const child = createElement('span', { id: 'test-child' }, 'Hello World');
    // async RSC — await 필요
    const result = await DefaultLayout({ children: child, extraVars: baseExtraVars });
    expect(result).toBeDefined();
  });

  // DL-3: data-rhymix-layout="default" 속성이 있어야 한다
  it('루트 div에 data-rhymix-layout="default" 속성이 있어야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    const result = await DefaultLayout({ children: null, extraVars: baseExtraVars });

    // ReactElement props 검사
    expect(result).toHaveProperty('props');
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props['data-rhymix-layout']).toBe('default');
  });

  // DL-4: data-layout-type이 extraVars.layoutType을 반영해야 한다
  it('data-layout-type 속성이 extraVars.layoutType을 반영해야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    const result = await DefaultLayout({ children: null, extraVars: baseExtraVars });

    const props = (result as { props: Record<string, unknown> }).props;
    expect(props['data-layout-type']).toBe('MAIN_PAGE');
  });

  // DL-5: SUB_PAGE layoutType도 올바르게 반영해야 한다
  it('SUB_PAGE layoutType이 data-layout-type에 반영되어야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    const result = await DefaultLayout({ children: null, extraVars: extraVarsWithFooter });

    const props = (result as { props: Record<string, unknown> }).props;
    expect(props['data-layout-type']).toBe('SUB_PAGE');
  });

  // DL-6/DL-7 (footerText 렌더)은 GlobalFooter.test.tsx로 이전됨.
  //
  // SPEC-FRONT-PARITY-001 REQ-FP-003(문서당 <footer> 1개)에 따라 DefaultLayout은
  // 더 이상 자체 <footer>를 렌더하지 않는다. footerText 렌더 책임은
  // apps/web/components/layout/GlobalFooter.tsx가 승계했으며, 해당 테스트는
  // GlobalFooter.test.tsx의 "footerText" describe 블록에 있다.
  // SPEC-LAYOUT-001의 footerText 요구사항 자체는 유지된다 — 렌더 위치만 이동했다.

  // DL-6': DefaultLayout은 자체 <footer>를 렌더하지 않는다 (REQ-FP-003)
  it('자체 <footer>를 렌더하지 않아야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    const result = await DefaultLayout({ children: null, extraVars: extraVarsWithFooter });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"footer"');
  });

  // DL-7': DefaultLayout은 자체 <main>을 렌더하지 않는다 (REQ-FP-004)
  it('자체 <main>을 렌더하지 않아야 한다 (루트 레이아웃이 소유)', async () => {
    const { default: DefaultLayout } = await import('./default');
    const result = await DefaultLayout({ children: null, extraVars: baseExtraVars });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"main"');
  });

  // DL-8: children이 ReactNode 트리에 포함되어야 한다
  it('children이 렌더 결과에 포함되어야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    const child = createElement('div', { 'data-testid': 'child-content' }, '모듈 출력');
    const result = await DefaultLayout({ children: child, extraVars: baseExtraVars });

    const serialized = JSON.stringify(result);
    expect(serialized).toContain('child-content');
    expect(serialized).toContain('모듈 출력');
  });

  // DL-9: null children도 정상 처리해야 한다 (graceful null handling)
  it('children이 null이어도 에러 없이 렌더되어야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    await expect(DefaultLayout({ children: null, extraVars: baseExtraVars })).resolves.toBeDefined();
  });

  // DL-10: 컴포넌트가 비동기 함수(async RSC)여야 한다
  it('DefaultLayout은 async 함수(Server Component)여야 한다', async () => {
    const { default: DefaultLayout } = await import('./default');
    // async 함수는 Promise를 반환한다
    const result = DefaultLayout({ children: null, extraVars: baseExtraVars });
    expect(result).toBeInstanceOf(Promise);
  });
});
