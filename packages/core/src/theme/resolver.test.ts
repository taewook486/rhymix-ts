import { describe, it, expect } from 'vitest';
import { resolveLayout, type ResolveLayoutOptions } from './resolver';

describe('resolveLayout', () => {
  // TR-1: moduleInstanceLayoutPath가 있으면 module_instance 반환
  it('TR-1: moduleInstanceLayoutPath가 제공되면 source=module_instance로 반환한다', () => {
    const opts: ResolveLayoutOptions = {
      moduleInstanceLayoutPath: '/layouts/MyLayout.tsx',
    };
    const result = resolveLayout(opts);
    expect(result).toEqual({
      type: 'component',
      layoutPath: '/layouts/MyLayout.tsx',
      source: 'module_instance',
    });
  });

  // TR-2: domainThemeLayoutPath만 있으면 domain 반환
  it('TR-2: moduleInstance 없이 domainThemeLayoutPath가 있으면 source=domain으로 반환한다', () => {
    const opts: ResolveLayoutOptions = {
      moduleInstanceLayoutPath: null,
      domainThemeLayoutPath: '/layouts/DomainLayout.tsx',
    };
    const result = resolveLayout(opts);
    expect(result).toEqual({
      type: 'component',
      layoutPath: '/layouts/DomainLayout.tsx',
      source: 'domain',
    });
  });

  // TR-3: siteDefaultLayoutPath만 있으면 site 반환
  it('TR-3: moduleInstance, domain 없이 siteDefaultLayoutPath만 있으면 source=site로 반환한다', () => {
    const opts: ResolveLayoutOptions = {
      moduleInstanceLayoutPath: null,
      domainThemeLayoutPath: null,
      siteDefaultLayoutPath: '/layouts/SiteLayout.tsx',
    };
    const result = resolveLayout(opts);
    expect(result).toEqual({
      type: 'component',
      layoutPath: '/layouts/SiteLayout.tsx',
      source: 'site',
    });
  });

  // TR-4: 아무것도 없으면 fallback 반환
  it('TR-4: 모든 layoutPath가 null/undefined이면 type=fallback, source=none을 반환한다', () => {
    const opts: ResolveLayoutOptions = {};
    const result = resolveLayout(opts);
    expect(result).toEqual({
      type: 'fallback',
      source: 'none',
    });
  });

  // TR-5: moduleInstance > domain 우선순위
  it('TR-5: moduleInstance와 domain이 모두 있으면 moduleInstance를 우선한다', () => {
    const opts: ResolveLayoutOptions = {
      moduleInstanceLayoutPath: '/layouts/ModuleLayout.tsx',
      domainThemeLayoutPath: '/layouts/DomainLayout.tsx',
    };
    const result = resolveLayout(opts);
    expect(result).toEqual({
      type: 'component',
      layoutPath: '/layouts/ModuleLayout.tsx',
      source: 'module_instance',
    });
  });

  // TR-6: domain > site 우선순위
  it('TR-6: domain과 site가 모두 있으면 domain을 우선한다', () => {
    const opts: ResolveLayoutOptions = {
      moduleInstanceLayoutPath: null,
      domainThemeLayoutPath: '/layouts/DomainLayout.tsx',
      siteDefaultLayoutPath: '/layouts/SiteLayout.tsx',
    };
    const result = resolveLayout(opts);
    expect(result).toEqual({
      type: 'component',
      layoutPath: '/layouts/DomainLayout.tsx',
      source: 'domain',
    });
  });
});
