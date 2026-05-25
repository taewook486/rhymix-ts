import { describe, it, expect, beforeEach } from 'vitest';
import { createAssignmentStore, type AssignmentStore, type AssignmentEntry } from './assignment-store';

describe('AssignmentStore', () => {
  let store: AssignmentStore;

  beforeEach(() => {
    store = createAssignmentStore();
  });

  // AS-1: domain 할당 추가 후 hostname으로 resolve
  it('AS-1: domain 할당을 추가하고 hostname으로 조회하면 해당 entry를 반환한다', () => {
    const entry: AssignmentEntry = {
      scope: 'domain',
      refType: 'domain',
      refId: 'example.com',
      layoutPath: '/layouts/DomainLayout.tsx',
      themeName: 'default',
    };
    store.set(entry);
    const result = store.resolve({ hostname: 'example.com' });
    expect(result).toEqual(entry);
  });

  // AS-2: site 할당만 있고 hostname 모를 때 site 반환
  it('AS-2: site 할당만 있을 때 알 수 없는 hostname으로 조회하면 site entry를 반환한다', () => {
    const siteEntry: AssignmentEntry = {
      scope: 'site',
      refType: 'site',
      refId: 'default',
      layoutPath: '/layouts/SiteLayout.tsx',
    };
    store.set(siteEntry);
    const result = store.resolve({ hostname: 'unknown.example.com' });
    expect(result).toEqual(siteEntry);
  });

  // AS-3: module_instance 추가 후 mid로 resolve
  it('AS-3: module_instance 할당 추가 후 해당 mid로 조회하면 해당 entry를 반환한다', () => {
    const midEntry: AssignmentEntry = {
      scope: 'module_instance',
      refType: 'mid',
      refId: 'board_01',
      layoutPath: '/layouts/BoardLayout.tsx',
    };
    store.set(midEntry);
    const result = store.resolve({ hostname: 'any.com', mid: 'board_01' });
    expect(result).toEqual(midEntry);
  });

  // AS-4: domain + module_instance 있을 때 mid로 조회하면 module_instance 우선
  it('AS-4: domain과 module_instance가 모두 있을 때 mid로 조회하면 module_instance를 우선 반환한다', () => {
    const domainEntry: AssignmentEntry = {
      scope: 'domain',
      refType: 'domain',
      refId: 'example.com',
      layoutPath: '/layouts/DomainLayout.tsx',
    };
    const midEntry: AssignmentEntry = {
      scope: 'module_instance',
      refType: 'mid',
      refId: 'board_01',
      layoutPath: '/layouts/BoardLayout.tsx',
    };
    store.set(domainEntry);
    store.set(midEntry);
    const result = store.resolve({ hostname: 'example.com', mid: 'board_01' });
    expect(result).toEqual(midEntry);
  });

  // AS-5: entry 없을 때 null 반환
  it('AS-5: entry가 없으면 null을 반환한다', () => {
    const result = store.resolve({ hostname: 'nonexistent.com' });
    expect(result).toBeNull();
  });

  // AS-6: 두 domain 있을 때 각각 독립적으로 resolve
  it('AS-6: domain A와 domain B가 있을 때 domain A로 조회하면 A의 entry만 반환한다', () => {
    const entryA: AssignmentEntry = {
      scope: 'domain',
      refType: 'domain',
      refId: 'a.example.com',
      layoutPath: '/layouts/ALayout.tsx',
    };
    const entryB: AssignmentEntry = {
      scope: 'domain',
      refType: 'domain',
      refId: 'b.example.com',
      layoutPath: '/layouts/BLayout.tsx',
    };
    store.set(entryA);
    store.set(entryB);
    const result = store.resolve({ hostname: 'a.example.com' });
    expect(result).toEqual(entryA);
    expect(result?.layoutPath).toBe('/layouts/ALayout.tsx');
  });

  // AS-7: site + domain 있을 때 알 수 없는 hostname이면 site 기본값 반환
  it('AS-7: site와 domain 할당이 있을 때 알 수 없는 hostname으로 조회하면 site 기본값을 반환한다', () => {
    const siteEntry: AssignmentEntry = {
      scope: 'site',
      refType: 'site',
      refId: 'default',
      layoutPath: '/layouts/SiteDefault.tsx',
    };
    const domainEntry: AssignmentEntry = {
      scope: 'domain',
      refType: 'domain',
      refId: 'specific.com',
      layoutPath: '/layouts/SpecificLayout.tsx',
    };
    store.set(siteEntry);
    store.set(domainEntry);
    const result = store.resolve({ hostname: 'unknown.com' });
    expect(result).toEqual(siteEntry);
  });
});
