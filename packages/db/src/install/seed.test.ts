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
      adminFavorite: {
        create: vi.fn(async (args: { data: { label: string } }) => {
          calls.push(`adminFavorite.create:${args.data.label}`);
          return { id: 1 };
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
        findFirst: vi.fn(async () => ({
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
      menuSlotAssignment: {
        create: vi.fn(async (args: { data: { slot: string } }) => {
          calls.push(`menuSlotAssignment.create:${args.data.slot}`);
          return { id: 1 };
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
  moduleInstanceCreateArgs: Array<{
    data: { mid: string; moduleCode?: string; mcontent?: string };
  }>;
  adminFavoriteCreateArgs: Array<{ data: { label: string; href: string; listOrder: number } }>;
  menuSlotAssignmentCreateArgs: Array<{
    data: { domainId: number; slot: string; menuId: number };
  }>;
  tx: unknown;
}

/** mid → 결정적 ModuleInstance id (board=300, notice=100, qna=200). */
const MODULE_ID = { notice: 100, qna: 200, board: 300, main: 400 } as const;
/** moduleInstanceId → 결정적 Board id (offset +1000). */
const boardIdFor = (moduleInstanceId: number) => moduleInstanceId + 1000;

function makeRecordingTx(): RecordedTx {
  const calls: string[] = [];
  const domainUpdateArgs: RecordedTx['domainUpdateArgs'] = [];
  const documentCreateArgs: RecordedTx['documentCreateArgs'] = [];
  const menuCreateArgs: RecordedTx['menuCreateArgs'] = [];
  const menuItemCreateArgs: RecordedTx['menuItemCreateArgs'] = [];
  const boardCreateArgs: RecordedTx['boardCreateArgs'] = [];
  const moduleInstanceCreateArgs: RecordedTx['moduleInstanceCreateArgs'] = [];
  const adminFavoriteCreateArgs: RecordedTx['adminFavoriteCreateArgs'] = [];
  const menuSlotAssignmentCreateArgs: RecordedTx['menuSlotAssignmentCreateArgs'] = [];

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
    adminFavorite: {
      create: vi.fn(async (args: { data: { label: string; href: string; listOrder: number } }) => {
        calls.push(`adminFavorite.create:${args.data.label}`);
        adminFavoriteCreateArgs.push(args);
        return { id: 1 };
      }),
    },
    moduleInstance: {
      create: vi.fn(
        async (args: { data: { mid: string; moduleCode?: string; mcontent?: string } }) => {
          calls.push(`moduleInstance.create:${args.data.mid}`);
          moduleInstanceCreateArgs.push(args);
          const known = (MODULE_ID as Record<string, number>)[args.data.mid];
          return { id: known ?? 999 };
        },
      ),
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
      findFirst: vi.fn(async () => ({
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
    menuSlotAssignment: {
      create: vi.fn(
        async (args: { data: { domainId: number; slot: string; menuId: number } }) => {
          calls.push(`menuSlotAssignment.create:${args.data.slot}`);
          menuSlotAssignmentCreateArgs.push(args);
          return { id: 1 };
        },
      ),
    },
  };

  return {
    calls,
    domainUpdateArgs,
    documentCreateArgs,
    menuCreateArgs,
    menuItemCreateArgs,
    boardCreateArgs,
    moduleInstanceCreateArgs,
    adminFavoriteCreateArgs,
    menuSlotAssignmentCreateArgs,
    tx,
  };
}

function makePrisma(rec: RecordedTx) {
  return {
    $transaction: vi.fn(async (cb: (t: unknown) => Promise<unknown>) => cb(rec.tx)),
  };
}

describe('seedInstall post-install bootstrap (REQ-INSTALL-016/017/018)', () => {
  // SPEC-FRONT-PARITY-001 REQ-FP-001로 인덱스 모듈이 board → page로 바뀌었다.
  // 이 단언 변경은 회귀가 아니라 의도된 변경이다
  // (acceptance.md "의도된 변경 carve-out" — 원래 seed.test.ts:406).
  it('AC-INSTALL-008 / AC-FP-001: shall designate the page ModuleInstance as the default index module', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    // 인덱스 모듈 = page 인스턴스 id (mid='main', 400).
    const indexUpdate = rec.domainUpdateArgs.find(
      (a) => a.data.indexModuleInstanceId !== undefined,
    );
    expect(indexUpdate).toBeDefined();
    expect(indexUpdate?.data.indexModuleInstanceId).toBe(MODULE_ID.main);
    // REQ-FP-005: board 인스턴스는 삭제되지 않고 그대로 남아야 한다.
    expect(rec.calls).toContain('moduleInstance.create:board');
  });

  // SPEC-FRONT-PARITY-001 AC-FP-002: 인덱스 page 본문에 제목·소개·`/admin` 링크.
  it('AC-FP-002: shall seed welcome content into the index page module', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    const pageInstance = rec.moduleInstanceCreateArgs.find((a) => a.data.moduleCode === 'page');
    expect(pageInstance).toBeDefined();

    const mcontent = pageInstance?.data.mcontent ?? '';
    expect(mcontent).toContain('<h1');
    expect(mcontent).toContain('Rhymix-TS에 오신 것을 환영합니다');
    expect(mcontent).toContain('/admin');
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
    // SPEC-FRONT-PARITY-001 REQ-FP-001: 인덱스는 page 인스턴스 (의도된 변경 — 원래 :469).
    const indexUpdate = rec.domainUpdateArgs.find(
      (a) => a.data.indexModuleInstanceId !== undefined,
    );
    expect(indexUpdate?.data.indexModuleInstanceId).toBe(MODULE_ID.main);
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

/**
 * SPEC-ADMIN-MENU-PARITY-001 AC-AMP-006: 설치 완료 시 신규 관리자에게 기본 즐겨찾기 2건이
 * 생성되고, label/listOrder는 REQ-AMP-006 명시 값과 정확히 일치, href는 `/admin/` 프리픽스만
 * 검증한다(정확 매치 대신 프리픽스 검증으로 완화 — plan.md M2 "알림 센터" 실측 불확실성 흡수,
 * PASS-WITH-DEBT 여지).
 */
describe('seedInstall admin favorite bootstrap (SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-006)', () => {
  it('AC-AMP-006: shall create exactly 2 AdminFavorite rows with REQ-AMP-006 label/listOrder and /admin/-prefixed href', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    expect(rec.adminFavoriteCreateArgs).toHaveLength(2);

    const sorted = [...rec.adminFavoriteCreateArgs].sort(
      (a, b) => a.data.listOrder - b.data.listOrder,
    );

    expect(sorted[0]?.data).toMatchObject({
      label: '메일·SMS·알림 발송 설정',
      listOrder: 0,
    });
    expect(sorted[0]?.data.href).toMatch(/^\/admin\//);

    expect(sorted[1]?.data).toMatchObject({
      label: '알림 센터',
      listOrder: 1,
    });
    expect(sorted[1]?.data.href).toMatch(/^\/admin\//);
  });

  it('AC-AMP-006: shall seed favorites for the newly-created admin (memberId propagation via prisma FK)', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    // adminFavorite.create는 user.create(관리자 계정 생성) 이후에 호출되어야 한다
    // (REQ-AMP-006: "설치 완료 시 신규 관리자에게" — memberId FK 선행 조건).
    const firstUser = rec.calls.findIndex((c) => c === 'user.create');
    const firstFavorite = rec.calls.findIndex((c) => c.startsWith('adminFavorite.create'));
    expect(firstUser).toBeGreaterThanOrEqual(0);
    expect(firstFavorite).toBeGreaterThan(firstUser);
  });
});

/**
 * 설치 시 "만들기"는 하되 "연결"을 빠뜨려 기능이 활성화되지 않던 결함 회귀 방지.
 *
 * 발견 경위(2026-08-11): 재설치 후 방문자 첫 화면에서 (a) 헤더 메뉴가 비어 있고
 * (b) 레이아웃이 적용되지 않아 본문이 컨테이너 밖으로 벗어나는 현상을 실측.
 * 원인은 두 건 모두 "행은 생성되나 연결 행/FK가 비어 있음"이었다:
 *   - domains.defaultLayoutId = NULL  → resolveLayoutFromInstance가 매번 fallback
 *     (dev 서버 로그에 `[Layout] no layout resolved` 30회 관측)
 *   - menu_slot_assignments 0행 → MenuSlotRenderer(slot=HEADER_PRIMARY)가 빈 렌더
 */
describe('seedInstall wiring completeness (설치 연결 누락 회귀 방지)', () => {
  it('shall link the default layout to the domain (domains.defaultLayoutId)', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    const layoutUpdate = rec.domainUpdateArgs.find(
      (a) => a.data.defaultLayoutId !== undefined,
    );
    expect(layoutUpdate).toBeDefined();
    expect(layoutUpdate?.data.defaultLayoutId).toBe('layout-default-id');
  });

  it('shall assign the default menu to the HEADER_PRIMARY slot', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    const header = rec.menuSlotAssignmentCreateArgs.find(
      (a) => a.data.slot === 'HEADER_PRIMARY',
    );
    expect(header).toBeDefined();
    // menu.create mock이 반환하는 결정적 id(55)와 일치해야 한다.
    expect(header?.data.menuId).toBe(55);
    expect(header?.data.domainId).toBe(1);
  });

  it('shall create the layout link only after the default layout exists', async () => {
    const rec = makeRecordingTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedInstall(makeInput(), makePrisma(rec) as any);

    // 레이아웃 생성(themeAssignment.create 직전 단계)보다 뒤에 연결되어야 FK가 성립한다.
    const themeAssign = rec.calls.findIndex((c) => c === 'themeAssignment.create');
    const domainUpdates = rec.calls
      .map((c, i) => (c === 'domain.update' ? i : -1))
      .filter((i) => i >= 0);
    const layoutLinkIndex = domainUpdates[domainUpdates.length - 1];
    expect(themeAssign).toBeGreaterThanOrEqual(0);
    expect(layoutLinkIndex).toBeGreaterThan(themeAssign);
  });
});
