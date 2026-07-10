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
 *   2) Domain (생성 id 보관 → 11단계에서 인덱스 모듈/메뉴 연결)
 *   3) MemberGroup × 2 (admin, member)
 *   4) admin User
 *   5) Site.installedBy ← admin user id
 *   6) MemberGroupMember (admin user → admin group)
 *   7) ModuleInstance × 3 (notice, qna, board) — 생성 id 보관
 *   8) SiteSetting × 3 (sitelock_enabled, sitelock_allowlist, install_lock=true)
 *   9) Board × 3 (board 모듈마다 backing Board; Document FK 선행 조건)
 *  10) Menu × 1 + MenuItem × 3 (board/notice/qna → /{mid}) — REQ-INSTALL-017
 *  11) Domain.update: indexModuleInstanceId=board(REQ-016), defaultMenuId=menu(REQ-017)
 *  12) ThemeAssignment (기본 디자인 토큰) — SPEC-MENU-001 REQ-MENU-060
 *  13) 샘플 Document (board/notice 각 1건) — REQ-INSTALL-018, seedSampleContent 기본 true
 *
 * 주의: `prisma migrate deploy`는 자체 트랜잭션 관리 때문에 본 트랜잭션
 * 안으로 이식할 수 없습니다. 본 시드는 스키마가 사전 적용된 상태(prisma db
 * push 또는 migrate deploy)를 전제로 합니다(REQ-INSTALL-014 운영 노트).
 *
 * @MX:ANCHOR: 첫 영구 DB 변경의 단일 진입점 (fan_in: performInstall, 통합 테스트, 향후 admin re-seed tooling).
 * @MX:REASON: 본 함수가 부분 성공 시 중간 상태를 남기면 install lock과 결합되어 사이트 잠금이 발생한다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-014, REQ-INSTALL-015, REQ-INSTALL-016, REQ-INSTALL-017, REQ-INSTALL-018
 *            SPEC-MENU-001 REQ-MENU-060
 */
import type { PrismaClient } from '@prisma/client';
import { DEFAULT_THEME_TOKENS } from '@rhymix-ts/core';

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

    // 7) ModuleInstance × 3 — notice/qna/board, 모두 isDefault=false.
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

    // 8) SiteSetting × 3
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

    // 9) Board 행 — board 모듈마다 backing Board가 있어야 정상 렌더된다.
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

    // 10) REQ-INSTALL-017: 기본 메뉴 1개 + board/notice/qna 연결 MenuItem.
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

    // 11) REQ-INSTALL-016 + REQ-INSTALL-017: 인덱스 모듈(board)·기본 메뉴를
    //     기본 도메인에 연결한다. 본 트랜잭션 내에서 수행(부분 시드 방지).
    await tx.domain.update({
      where: { id: domain.id },
      data: {
        indexModuleInstanceId: moduleInstanceIds.board,
        defaultMenuId: menu.id,
      },
    });

    // 12) SPEC-MENU-001 REQ-MENU-060: 기본 디자인 토큰 시드.
    //     SITE scope ThemeAssignment를 생성하여 tokensOverride를 채운다.
    //     본 트랜잭션 내에서 수행(부분 시드 방지).
    await tx.themeAssignment.create({
      data: {
        scope: 'SITE',
        refType: 'site',
        refId: site.id.toString(),
        themeId: '', // Token만 저장하는 경우 themeId는 빈 문자열
        tokensOverride: DEFAULT_THEME_TOKENS,
      },
    });

    // 13) REQ-INSTALL-018: 환영/공지 샘플 Document(기본 활성).
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
