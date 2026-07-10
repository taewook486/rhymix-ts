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
        update: vi.fn(async () => {
          calls.push('domain.update');
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
          const ids: Record<string, number> = { notice: 100, qna: 200, board: 300 };
          return { id: ids[args.data.mid] ?? 999 };
        }),
      },
      board: {
        create: vi.fn(async (args: { data: { moduleInstanceId: number } }) => {
          calls.push(`board.create:${args.data.moduleInstanceId}`);
          return { id: args.data.moduleInstanceId + 1000 };
        }),
      },
      document: {
        create: vi.fn(async (args: { data: { boardId: number } }) => {
          calls.push(`document.create:${args.data.boardId}`);
          return { id: 1 };
        }),
      },
      menu: {
        create: vi.fn(async () => {
          calls.push('menu.create');
          return { id: 55 };
        }),
      },
      menuItem: {
        create: vi.fn(async (args: { data: { title: string } }) => {
          calls.push(`menuItem.create:${args.data.title}`);
          return { id: 1 };
        }),
      },
      siteSetting: {
        create: vi.fn(async (args: { data: { key: string } }) => {
          calls.push(`siteSetting.create:${args.data.key}`);
          return {};
        }),
      },
      theme: {
        findUnique: vi.fn(async () => ({
          id: 'theme-default-id',
          name: 'default',
        })),
        upsert: vi.fn(async () => ({
          id: 'theme-default-id',
          name: 'default',
        })),
      },
      layout: {
        upsert: vi.fn(async () => ({
          id: 'layout-default-id',
          name: 'default',
        })),
      },
      themeAssignment: {
        create: vi.fn(async () => {
          calls.push('themeAssignment.create');
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
      theme: {
        findUnique: vi.fn(async () => ({
          id: 'theme-default-id',
          name: 'default',
        })),
      },
      themeAssignment: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(seedInstall(makeInput(), prisma as any)).rejects.toThrow(/boom/);
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});

/**
 * Post-install 부트스트랩 시드 사양 테스트 — REQ-INSTALL-016/017/018,
 * AC-INSTALL-008~011. 모듈 인스턴스 id 캡처가 필요하므로 moduleInstance.create/
 * board.create는 결정적 id를 반환하도록 모킹합니다.
 */

interface RecordedTx {
  calls: string[];
  domainUpdateArgs: Array<{ where: unknown; data: Record<string, unknown> }>;
  documentCreateArgs: Array<{ data: { boardId: number; title: string } }>;
  menuCreateArgs: Array<{ data: { siteId: number; title: string } }>;
  menuItemCreateArgs: Array<{ data: { menuId: number; title: string; url?: string } }>;
  boardCreateArgs: Array<{ data: { moduleInstanceId: number; name: string } }>;
  tx: unknown;
}

/** mid → 결정적 ModuleInstance id (board=300, notice=100, qna=200). */
const MODULE_ID = { notice: 100, qna: 200, board: 300 } as const;
/** moduleInstanceId → 결정적 Board id (offset +1000). */
const boardIdFor = (moduleInstanceId: number) => moduleInstanceId + 1000;

function makeRecordingTx(): RecordedTx {
  const calls: string[] = [];
  const domainUpdateArgs: RecordedTx['domainUpdateArgs'] = [];
  const documentCreateArgs: RecordedTx['documentCreateArgs'] = [];
  const menuCreateArgs: RecordedTx['menuCreateArgs'] = [];
  const menuItemCreateArgs: RecordedTx['menuItemCreateArgs'] = [];
  const boardCreateArgs: RecordedTx['boardCreateArgs'] = [];

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
      update: vi.fn(async (args: { where: unknown; data: Record<string, unknown> }) => {
        calls.push('domain.update');
        domainUpdateArgs.push(args);
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
        const known = (MODULE_ID as Record<string, number>)[args.data.mid];
        return { id: known ?? 999 };
      }),
    },
    board: {
      create: vi.fn(async (args: { data: { moduleInstanceId: number; name: string } }) => {
        calls.push(`board.create:${args.data.moduleInstanceId}`);
        boardCreateArgs.push(args);
        return { id: boardIdFor(args.data.moduleInstanceId) };
      }),
    },
    document: {
      create: vi.fn(async (args: { data: { boardId: number; title: string } }) => {
        calls.push(`document.create:${args.data.boardId}`);
        documentCreateArgs.push(args);
        return { id: 1 };
      }),
    },
    menu: {
      create: vi.fn(async (args: { data: { siteId: number; title: string } }) => {
        calls.push('menu.create');
        menuCreateArgs.push(args);
        return { id: 55 };
      }),
    },
    menuItem: {
      create: vi.fn(async (args: { data: { menuId: number; title: string; url?: string } }) => {
        calls.push(`menuItem.create:${args.data.title}`);
        menuItemCreateArgs.push(args);
        return { id: 1 };
      }),
    },
    siteSetting: {
      create: vi.fn(async (args: { data: { key: string } }) => {
        calls.push(`siteSetting.create:${args.data.key}`);
        return {};
      }),
    },
    theme: {
      findUnique: vi.fn(async () => ({
        id: 'theme-default-id',
        name: 'default',
      })),
      upsert: vi.fn(async () => ({
        id: 'theme-default-id',
        name: 'default',
      })),
    },
    layout: {
      upsert: vi.fn(async () => ({
        id: 'layout-default-id',
        name: 'default',
      })),
    },
    themeAssignment: {
      create: vi.fn(async () => {
        calls.push('themeAssignment.create');
        return {};
      }),
    },
  };

  return {
    calls,
    domainUpdateArgs,
    documentCreateArgs,
    menuCreateArgs,
    menuItemCreateArgs,
    boardCreateArgs,
    tx,
  };
}

function makePrisma(rec: RecordedTx) {
  return {
    $transaction: vi.fn(async (cb: (t: unknown) => Promise<unknown>) => cb(rec.tx)),
  };
}

describe('seedInstall post-install bootstrap (REQ-INSTALL-016/017/018)', () => {
  it('AC-INSTALL-008: shall designate the board ModuleInstance as the default index module', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    // 인덱스 모듈 = board 인스턴스 id (300).
    const indexUpdate = rec.domainUpdateArgs.find(
      (a) => a.data.indexModuleInstanceId !== undefined,
    );
    expect(indexUpdate).toBeDefined();
    expect(indexUpdate?.data.indexModuleInstanceId).toBe(MODULE_ID.board);
  });

  it('AC-INSTALL-009: shall create one default Menu with MenuItems and set Domain.defaultMenuId', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    // 메뉴 1개 생성 + 사이트 연결.
    expect(rec.menuCreateArgs).toHaveLength(1);
    expect(rec.menuCreateArgs[0]?.data.siteId).toBe(7);

    // board/notice/qna 모듈로 연결되는 MenuItem 3개.
    expect(rec.menuItemCreateArgs.length).toBeGreaterThanOrEqual(3);
    for (const item of rec.menuItemCreateArgs) {
      expect(item.data.menuId).toBe(55);
    }
    const urls = rec.menuItemCreateArgs.map((i) => i.data.url);
    expect(urls).toContain('/board');
    expect(urls).toContain('/notice');
    expect(urls).toContain('/qna');

    // Domain.defaultMenuId = 생성된 메뉴 id (55).
    const menuUpdate = rec.domainUpdateArgs.find((a) => a.data.defaultMenuId !== undefined);
    expect(menuUpdate?.data.defaultMenuId).toBe(55);
  });

  it('AC-INSTALL-010: with seed_sample_content=true (default) shall create Board rows and a sample Document in board and notice', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    // board 모듈마다 backing Board 행 (board/notice/qna).
    const boardModuleIds = rec.boardCreateArgs.map((b) => b.data.moduleInstanceId);
    expect(boardModuleIds).toContain(MODULE_ID.board);
    expect(boardModuleIds).toContain(MODULE_ID.notice);

    // board, notice 보드에 최소 1건씩 샘플 문서.
    const docBoardIds = rec.documentCreateArgs.map((d) => d.data.boardId);
    expect(docBoardIds).toContain(boardIdFor(MODULE_ID.board));
    expect(docBoardIds).toContain(boardIdFor(MODULE_ID.notice));
    expect(rec.documentCreateArgs.length).toBeGreaterThanOrEqual(2);

    // Board는 Document보다 먼저 생성되어야 한다 (FK 순서).
    const firstBoard = rec.calls.findIndex((c) => c.startsWith('board.create'));
    const firstDoc = rec.calls.findIndex((c) => c.startsWith('document.create'));
    expect(firstBoard).toBeGreaterThanOrEqual(0);
    expect(firstDoc).toBeGreaterThan(firstBoard);
  });

  it('AC-INSTALL-011: with seed_sample_content=false shall create no sample Document but still set index module and menu', async () => {
    const rec = makeRecordingTx();
    const input = { ...makeInput(), seedSampleContent: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(input, makePrisma(rec) as any);

    // 샘플 문서 0건.
    expect(rec.documentCreateArgs).toHaveLength(0);

    // 인덱스 모듈 + 기본 메뉴는 여전히 설정.
    const indexUpdate = rec.domainUpdateArgs.find(
      (a) => a.data.indexModuleInstanceId !== undefined,
    );
    expect(indexUpdate?.data.indexModuleInstanceId).toBe(MODULE_ID.board);
    expect(rec.menuCreateArgs).toHaveLength(1);
    const menuUpdate = rec.domainUpdateArgs.find((a) => a.data.defaultMenuId !== undefined);
    expect(menuUpdate?.data.defaultMenuId).toBe(55);
  });

  it('all post-install writes shall remain inside the single $transaction', async () => {
    const rec = makeRecordingTx();
    const prisma = makePrisma(rec);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), prisma as any);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
