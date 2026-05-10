/**
 * Transactional seed specification tests — REQ-INSTALL-014, REQ-INSTALL-015.
 *
 * 단위 테스트: `prisma.$transaction`을 모킹하여 호출 시퀀스(Site → Domain →
 * MemberGroup × 2 → User → Site.update → MemberGroupMember → ModuleInstance × 3
 * → SiteSetting × 3)와 트랜잭션 경계를 검증합니다.
 */
import { describe, expect, it, vi } from 'vitest';

import { seedInstall, type SeedInput } from './seed';

function makeInput(): SeedInput {
  return {
    site: {
      defaultLanguage: 'en',
      timeZone: 'UTC',
      scheme: 'https',
      rhymixTsVersion: '0.0.0',
      databaseSchemaVersion: 'init',
      installerIp: '127.0.0.1',
      installerUserAgent: 'vitest',
    },
    domain: { hostname: 'example.com' },
    admin: {
      userId: 'admin',
      emailAddress: 'admin@example.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$abc$def',
      nickName: 'Administrator',
      userName: 'Administrator',
    },
    sitelock: { enabled: false, allowlist: [] },
  };
}

describe('seedInstall (unit)', () => {
  it('the system shall execute all writes inside a single $transaction', async () => {
    const calls: string[] = [];
    // 트랜잭션 클라이언트 모형 — 각 모델/메서드 호출을 calls 배열에 기록.
    const tx = {
      site: {
        create: vi.fn(async () => {
          calls.push('site.create');
          return { id: 7 };
        }),
        update: vi.fn(async () => {
          calls.push('site.update');
          return { id: 7 };
        }),
      },
      domain: {
        create: vi.fn(async () => {
          calls.push('domain.create');
          return { id: 1 };
        }),
      },
      memberGroup: {
        create: vi.fn(async (args: { data: { isAdmin?: boolean } }) => {
          calls.push(`memberGroup.create:${args.data.isAdmin ? 'admin' : 'member'}`);
          return { id: args.data.isAdmin ? 100 : 200 };
        }),
      },
      user: {
        create: vi.fn(async () => {
          calls.push('user.create');
          return { id: 42 };
        }),
      },
      memberGroupMember: {
        create: vi.fn(async () => {
          calls.push('memberGroupMember.create');
          return {};
        }),
      },
      moduleInstance: {
        create: vi.fn(async (args: { data: { mid: string } }) => {
          calls.push(`moduleInstance.create:${args.data.mid}`);
          return {};
        }),
      },
      siteSetting: {
        create: vi.fn(async (args: { data: { key: string } }) => {
          calls.push(`siteSetting.create:${args.data.key}`);
          return {};
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await seedInstall(makeInput(), prisma as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      siteId: 7,
      userId: 42,
      adminGroupId: 100,
      memberGroupId: 200,
    });
    // 시퀀스 검증: site → domain → admin group → member group → user → site update → member-group-member.
    expect(calls.slice(0, 7)).toEqual([
      'site.create',
      'domain.create',
      'memberGroup.create:admin',
      'memberGroup.create:member',
      'user.create',
      'site.update',
      'memberGroupMember.create',
    ]);
    // 모듈 인스턴스 3개.
    expect(calls).toContain('moduleInstance.create:notice');
    expect(calls).toContain('moduleInstance.create:qna');
    expect(calls).toContain('moduleInstance.create:board');
    // 사이트 설정 3개.
    expect(calls).toContain('siteSetting.create:sitelock_enabled');
    expect(calls).toContain('siteSetting.create:sitelock_allowlist');
    expect(calls).toContain('siteSetting.create:install_lock');
  });

  it('the system shall propagate errors so the transaction rolls back', async () => {
    const tx = {
      site: { create: vi.fn(async () => ({ id: 1 })), update: vi.fn() },
      domain: {
        create: vi.fn(async () => {
          throw new Error('boom');
        }),
      },
      memberGroup: { create: vi.fn() },
      user: { create: vi.fn() },
      memberGroupMember: { create: vi.fn() },
      moduleInstance: { create: vi.fn() },
      siteSetting: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(seedInstall(makeInput(), prisma as any)).rejects.toThrow(/boom/);
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});
