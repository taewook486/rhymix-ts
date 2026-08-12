/**
 * 트랜잭션 기반 초기 시드 — SPEC-INSTALL-001 / REQ-INSTALL-014, REQ-INSTALL-015.
 *
 * `prisma.$transaction(async tx => ...)`로 모든 INSERT/UPDATE를 묶어 부분
 * 시드를 차단합니다. 실패 시 Prisma 트랜잭션이 자동 롤백되며, 호출자
 * (`performInstall`)는 advisory lock 해제 + 사용자 친화적 오류 메시지로
 * 응답합니다.
 *
 * 시퀀스:
 *   1) Site (installedAt=NOW, installedBy=null 임시)
 *   2) Domain (생성 id 보관 → 12단계에서 인덱스 모듈/메뉴 연결)
 *   3) MemberGroup × 2 (admin, member)
 *   4) admin User
 *   5) Site.installedBy ← admin user id
 *   6) MemberGroupMember (admin user → admin group)
 *   7) AdminFavorite × 2 (레거시 parity 기본 즐겨찾기) — SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-006
 *   8) ModuleInstance × 3 (notice, qna, board) — 생성 id 보관
 *   9) SiteSetting × 3 (sitelock_enabled, sitelock_allowlist, install_lock=true)
 *  10) Board × 3 (board 모듈마다 backing Board; Document FK 선행 조건)
 *  11) Menu × 1 + MenuItem × 3 (board/notice/qna → /{mid}) — REQ-INSTALL-017
 *  12) Domain.update: indexModuleInstanceId=board(REQ-016), defaultMenuId=menu(REQ-017)
 *  13) Theme (default) — ThemeAssignment FK 선행 조건
 *  14) ThemeAssignment (기본 디자인 토큰) — SPEC-MENU-001 REQ-MENU-060
 *  15) 샘플 Document (board/notice 각 1건) — REQ-INSTALL-018, seedSampleContent 기본 true
 *
 * 주의: `prisma migrate deploy`는 자체 트랜잭션 관리 때문에 본 트랜잭션
 * 안으로 이식할 수 없습니다. 본 시드는 스키마가 사전 적용된 상태(prisma db
 * push 또는 migrate deploy)를 전제로 합니다(REQ-INSTALL-014 운영 노트).
 *
 * @MX:ANCHOR: 첫 영구 DB 변경의 단일 진입점 (fan_in: performInstall, 통합 테스트, 향후 admin re-seed tooling).
 * @MX:REASON: 본 함수가 부분 성공 시 중간 상태를 남기면 install lock과 결합되어 사이트 잠금이 발생한다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-014, REQ-INSTALL-015, REQ-INSTALL-016, REQ-INSTALL-017, REQ-INSTALL-018
 *            SPEC-MENU-001 REQ-MENU-060
 *            SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-006
 */
import type { PrismaClient } from '@prisma/client';
import { seedDefaultTheme } from '@rhymix-ts/theme-default';

/**
 * 기본 디자인 토큰 로컬 복제본.
 *
 * @rhymix-ts/core의 DEFAULT_THEME_TOKENS와 동일한 값.
 *
 * @MX:WARN
 * @MX:REASON 순환 의존성 방지를 위해 @rhymix-ts/core에서 값을 복제했습니다.
 *             packages/core/src/theme/default-tokens.ts의 DEFAULT_THEME_TOKENS가 변경되면
 *             이 값도 수동으로 동기화해야 합니다.
 */
const DEFAULT_THEME_TOKENS = {
  colors: {
    primary: '#3B82F6',
    background: '#FFFFFF',
    foreground: '#0F172A',
    accent: '#8B5CF6',
  },
  typography: {
    fontFamilyBase: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyHeading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    baseSize: 16,
  },
  spacing: {
    unit: 4,
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  dark: {
    colors: {
      primary: '#60A5FA',
      background: '#0F172A',
      foreground: '#F8FAFC',
      accent: '#A78BFA',
    },
  },
};

/**
 * 호출자가 주입하는 패스워드 해시 버전 태그.
 * `@rhymix-ts/auth.PASSWORD_VERSION_TAG`와 동일 값을 기대하지만, db 패키지가
 * auth에 의존하지 않도록 인자로 받습니다.
 */
const DEFAULT_PASSWORD_VERSION_TAG = 'argon2id-v1';

export interface SeedInput {
  site: {
    defaultLanguage: string;
    timeZone: string;
    scheme: 'http' | 'https';
    rhymixTsVersion: string;
    databaseSchemaVersion: string;
    installerIp: string;
    installerUserAgent: string;
  };
  domain: {
    hostname: string;
  };
  admin: {
    userId: string;
    emailAddress: string;
    passwordHash: string;
    nickName: string;
    userName?: string;
    /** 기본값 'argon2id-v1' — `@rhymix-ts/auth.PASSWORD_VERSION_TAG`와 일치. */
    passwordVersion?: string;
  };
  sitelock: {
    enabled: boolean;
    allowlist: string[];
  };
  /**
   * REQ-INSTALL-018: 환영/공지 샘플 Document를 board/notice 보드에 시드할지 여부.
   * 기본 true (레거시 Rhymix 설치 동작과 동일). false면 빈 사이트로 부트스트랩.
   * 인덱스 모듈(REQ-016)·기본 메뉴(REQ-017) 설정은 이 값과 무관하게 항상 수행한다.
   */
  seedSampleContent?: boolean;
}

export interface SeedResult {
  siteId: number;
  userId: number;
  adminGroupId: number;
  memberGroupId: number;
}

/**
 * SPEC-FRONT-PARITY-001 REQ-FP-002: 인덱스 page 모듈의 초기 본문.
 *
 * acceptance.md AC-FP-002가 다음 3개 리터럴의 존재를 판정 기준으로 고정한다 —
 * 구현자 재량에 맡기지 않기 위한 것이므로 임의로 바꾸지 말 것:
 *   (a) `<h1`  (b) `Rhymix-TS에 오신 것을 환영합니다`  (c) `/admin`
 *
 * apps/web/app/page.tsx가 moduleCode==='page'일 때 renderBodyWithWidgets로
 * 렌더하므로 HTML 문자열로 저장한다.
 */
const INDEX_PAGE_CONTENT = [
  '<h1>Rhymix-TS에 오신 것을 환영합니다</h1>',
  '<p>설치가 완료되었습니다. 이 페이지는 사이트의 첫 화면이며, 관리자 화면에서 자유롭게 수정할 수 있습니다.</p>',
  '<p>메뉴의 게시판·공지사항·Q&amp;A로 이동하거나, <a href="/admin">관리자 페이지</a>에서 사이트를 설정해 보세요.</p>',
].join('\n');

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * 단일 트랜잭션 내에서 초기 사이트/관리자/기본 모듈을 생성합니다.
 * 부분 실패 시 전체 롤백.
 */
export async function seedInstall(
  input: SeedInput,
  prisma: Pick<PrismaClient, '$transaction'>,
): Promise<SeedResult> {
  return prisma.$transaction(async (tx: TxClient) => {
    // 1) Site — installedBy는 admin user 생성 후 update.
    const site = await tx.site.create({
      data: {
        defaultLanguage: input.site.defaultLanguage,
        timeZone: input.site.timeZone,
        scheme: input.site.scheme,
        installedAt: new Date(),
        installedBy: null,
        installerIp: input.site.installerIp,
        installerUserAgent: input.site.installerUserAgent,
        rhymixTsVersion: input.site.rhymixTsVersion,
        databaseSchemaVersion: input.site.databaseSchemaVersion,
      },
    });

    // 2) Domain — 인덱스 모듈/기본 메뉴 연결을 위해 생성된 id를 보관.
    const domain = await tx.domain.create({
      data: {
        siteId: site.id,
        hostname: input.domain.hostname,
        isDefault: true,
        scheme: input.site.scheme,
        forceHttps: input.site.scheme === 'https',
      },
    });

    // 3) MemberGroup × 2
    const adminGroup = await tx.memberGroup.create({
      data: {
        siteId: site.id,
        title: 'Administrators',
        isAdmin: true,
        isDefault: false,
        listOrder: 0,
      },
    });
    const memberGroup = await tx.memberGroup.create({
      data: {
        siteId: site.id,
        title: 'Members',
        isAdmin: false,
        isDefault: true,
        listOrder: 1,
      },
    });

    // 4) admin User
    const adminUser = await tx.user.create({
      data: {
        userId: input.admin.userId,
        emailAddress: input.admin.emailAddress,
        passwordHash: input.admin.passwordHash,
        passwordVersion: input.admin.passwordVersion ?? DEFAULT_PASSWORD_VERSION_TAG,
        userName: input.admin.userName ?? input.admin.nickName,
        nickName: input.admin.nickName,
        status: 'APPROVED',
        isAdmin: true,
        denied: false,
      },
    });

    // 5) Site.installedBy ← admin user id
    await tx.site.update({
      where: { id: site.id },
      data: { installedBy: adminUser.id },
    });

    // 6) MemberGroupMember
    await tx.memberGroupMember.create({
      data: { groupId: adminGroup.id, userId: adminUser.id },
    });

    // 7) SPEC-ADMIN-MENU-PARITY-001 REQ-AMP-006: 설치 완료 시 신규 관리자에게 레거시와
    //    동일한 기본 즐겨찾기 2건을 시딩한다. 레거시의 "알림 센터"(dispNcenterliteAdminConfig)에
    //    1:1 대응하는 rhymix-ts 화면은 현재 존재하지 않는다(research.md §3 실측 확인 —
    //    apps/web/app/admin 하위에 별도 notification-center 라우트 없음). 두 항목 모두
    //    /admin/settings/notification을 가리키게 하고 label로만 레거시 2건을 구분한다
    //    (acceptance.md AC-AMP-006: href는 `/admin/` 프리픽스만 검증하도록 완화되어 있어
    //    PASS-WITH-DEBT로 허용됨). 대응 화면이 신설되면 두 번째 항목의 href를 갱신할 것.
    await tx.adminFavorite.create({
      data: {
        memberId: adminUser.id,
        label: '메일·SMS·알림 발송 설정',
        href: '/admin/settings/notification',
        listOrder: 0,
      },
    });
    await tx.adminFavorite.create({
      data: {
        memberId: adminUser.id,
        label: '알림 센터',
        href: '/admin/settings/notification',
        listOrder: 1,
      },
    });

    // 8) ModuleInstance × 3 — notice/qna/board, 모두 isDefault=false.
    //    이후 단계에서 인덱스 모듈 지정·Board 행 생성에 쓰도록 id를 보관한다.
    const moduleInstanceIds: Record<'notice' | 'qna' | 'board', number> = {
      notice: 0,
      qna: 0,
      board: 0,
    };
    for (const mid of ['notice', 'qna', 'board'] as const) {
      const created = await tx.moduleInstance.create({
        data: {
          mid,
          moduleCode: 'board',
          name: mid,
          siteId: site.id,
        },
      });
      moduleInstanceIds[mid] = created.id;
    }

    // 8-b) SPEC-FRONT-PARITY-001 REQ-FP-001/002: 인덱스 전용 page 모듈 인스턴스.
    //      레거시 Rhymix는 첫 화면에 게시판 목록이 아니라 소개 페이지를 노출한다.
    //      board/notice/qna 인스턴스는 그대로 두고(REQ-FP-005) 메뉴로 접근한다.
    //      apps/web/app/page.tsx는 moduleCode==='page'일 때 mcontent를
    //      renderBodyWithWidgets로 렌더하므로 HTML 문자열로 저장한다.
    const indexPageInstance = await tx.moduleInstance.create({
      data: {
        mid: 'main',
        moduleCode: 'page',
        name: 'Main',
        siteId: site.id,
        mcontent: INDEX_PAGE_CONTENT,
      },
    });

    // 9) SiteSetting × 3
    await tx.siteSetting.create({
      data: {
        siteId: site.id,
        key: 'sitelock_enabled',
        value: input.sitelock.enabled,
      },
    });
    await tx.siteSetting.create({
      data: {
        siteId: site.id,
        key: 'sitelock_allowlist',
        value: input.sitelock.allowlist,
      },
    });
    // REQ-INSTALL-042: install_lock 폴백 플래그(런타임 INSTALL_LOCK env와 별도).
    await tx.siteSetting.create({
      data: {
        siteId: site.id,
        key: 'install_lock',
        value: true,
      },
    });

    // 10) Board 행 — board 모듈마다 backing Board가 있어야 정상 렌더된다.
    //    REQ-INSTALL-018: Document.boardId → Board.id 이므로 Document보다 먼저 생성.
    const boardIds: Record<'notice' | 'qna' | 'board', number> = {
      notice: 0,
      qna: 0,
      board: 0,
    };
    for (const mid of ['notice', 'qna', 'board'] as const) {
      const board = await tx.board.create({
        data: {
          moduleInstanceId: moduleInstanceIds[mid],
          name: mid,
        },
      });
      boardIds[mid] = board.id;
    }

    // 11) REQ-INSTALL-017: 기본 메뉴 1개 + board/notice/qna 연결 MenuItem.
    const menu = await tx.menu.create({
      data: { siteId: site.id, title: 'Main Menu' },
    });
    const menuItems: ReadonlyArray<{ title: string; mid: 'board' | 'notice' | 'qna' }> = [
      { title: 'Board', mid: 'board' },
      { title: 'Notice', mid: 'notice' },
      { title: 'Q&A', mid: 'qna' },
    ];
    let listOrder = 0;
    for (const item of menuItems) {
      await tx.menuItem.create({
        data: {
          menuId: menu.id,
          title: item.title,
          url: `/${item.mid}`,
          listOrder: listOrder++,
        },
      });
    }

    // 12) REQ-INSTALL-016 + REQ-INSTALL-017: 인덱스 모듈·기본 메뉴를 기본 도메인에
    //     연결한다. 본 트랜잭션 내에서 수행(부분 시드 방지).
    //     SPEC-FRONT-PARITY-001 REQ-FP-001: 인덱스는 board가 아니라 page 인스턴스다.
    //     (기존 seed.test.ts의 board 단언 2건은 이 변경에 맞춰 갱신됨 —
    //      acceptance.md "의도된 변경 carve-out" 참고)
    await tx.domain.update({
      where: { id: domain.id },
      data: {
        indexModuleInstanceId: indexPageInstance.id,
        defaultMenuId: menu.id,
      },
    });

    // 13) SPEC-LAYOUT-001 REQ-LAYOUT-035: default 테마 생성.
    //     ThemeAssignment FK 선행 조건 충족을 위해 Theme 먼저 생성.
    //     본 트랜잭션 내에서 수행(부분 시드 방지).
    await seedDefaultTheme(tx as unknown as PrismaClient);

    // 14) SPEC-MENU-001 REQ-MENU-060: 기본 디자인 토큰 시드.
    //     SITE scope ThemeAssignment를 생성하여 tokensOverride를 채운다.
    //     Theme.id는 FK 제약조건을 위해 실제 Theme 행을 참조.
    //     본 트랜잭션 내에서 수행(부분 시드 방지).
    const theme = await tx.theme.findUnique({
      where: { name: 'default' },
    });
    if (!theme) {
      throw new Error('Default theme not found after seedDefaultTheme');
    }

    await tx.themeAssignment.create({
      data: {
        scope: 'SITE',
        refType: 'site',
        refId: site.id.toString(),
        themeId: theme.id, // FK 제약: 실제 Theme.id 참조
        tokensOverride: DEFAULT_THEME_TOKENS,
      },
    });

    // 14-b) 설치 연결 마감 — 생성된 레이아웃/메뉴를 실제로 "활성화"한다.
    //
    // @MX:WARN: 이 두 연결이 빠지면 모든 구성 요소가 존재함에도 화면에 전혀
    //   반영되지 않는다(무증상 실패). 2026-08-11 재설치 검증에서 실측된 결함:
    //   - domains.defaultLayoutId=NULL → resolveLayoutFromInstance가 매번 fallback으로
    //     빠져 DefaultLayout(컨테이너/푸터)이 적용되지 않음
    //     (dev 로그 `[Layout] no layout resolved` 30회 관측)
    //   - menu_slot_assignments 0행 → GlobalHeader의 MenuSlotRenderer가 빈 nav 렌더
    // @MX:REASON: 두 연결 모두 "행 생성"과 "연결"이 분리된 구조라 생성만으로는
    //   기능이 켜지지 않는다. 연결 자체가 기능 활성화 조건이므로 시드에 포함한다.

    // 레이아웃 연결: seedDefaultTheme가 upsert한 default 레이아웃을 도메인 기본값으로.
    // 반드시 seedDefaultTheme(13단계) 이후에 조회해야 FK가 성립한다.
    const defaultLayout = await tx.layout.findFirst({
      where: { name: 'default' },
      select: { id: true },
    });
    if (!defaultLayout) {
      throw new Error('Default layout not found after seedDefaultTheme');
    }
    await tx.domain.update({
      where: { id: domain.id },
      data: { defaultLayoutId: defaultLayout.id },
    });

    // 메뉴 슬롯 연결: 기본 메뉴를 헤더 주 메뉴 슬롯에 배치.
    await tx.menuSlotAssignment.create({
      data: {
        domainId: domain.id,
        slot: 'HEADER_PRIMARY',
        menuId: menu.id,
      },
    });

    // 15) REQ-INSTALL-018: 환영/공지 샘플 Document(기본 활성).
    //     board/notice 보드에 최소 1건씩. seedSampleContent=false면 건너뛴다.
    if (input.seedSampleContent !== false) {
      const samples: ReadonlyArray<{ mid: 'board' | 'notice'; title: string; content: string }> = [
        {
          mid: 'board',
          title: 'Welcome to Rhymix-TS',
          content: '<p>축하합니다! Rhymix-TS 설치가 완료되었습니다.</p>',
        },
        {
          mid: 'notice',
          title: 'Notice: Getting Started',
          content: '<p>관리자 페이지에서 사이트 설정을 시작하세요.</p>',
        },
      ];
      for (const sample of samples) {
        await tx.document.create({
          data: {
            boardId: boardIds[sample.mid],
            title: sample.title,
            content: sample.content,
            authorId: adminUser.id,
            nickName: input.admin.nickName,
            isNotice: sample.mid === 'notice',
          },
        });
      }
    }

    return {
      siteId: site.id,
      userId: adminUser.id,
      adminGroupId: adminGroup.id,
      memberGroupId: memberGroup.id,
    };
  });
}
