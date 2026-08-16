/**
 * SPEC-LEGACY-PARITY-001 M2 특성화 테스트용 메뉴 픽스처 시더.
 *
 * AC-SITE-004/005/006이 고정할 승계 동작(groupIds ACL · 3단계 중첩 트리 · 3슬롯
 * 동시 배정)을 검증 가능한 형태로 DB에 직접 시드한다. M1이 dev DB에 손으로 넣은
 * 행(M1-*)과 완전히 분리된 M2-* 픽스처만 만들며, resetDb() 이후 호출을 전제로
 * 한다 — 테스트의 상태는 전부 테스트 코드가 만든다 (의존성 최소화 원칙).
 *
 * 시드 형태는 M1 관찰(2026-08-16, research.md §3.0)의 픽스처 형태를 재사용한다:
 *  - ACL 쌍: groupIds [스태프 그룹] 제한 항목 + groupIds [] 공개 항목
 *  - 3단계 트리: M2-트리상 → M2-트리중 → M2-트리하
 *  - 3슬롯: HEADER_PRIMARY / FOOTER / UTILITY 각각 별도 메뉴 배정
 *
 * 로그인 가능한 계정 2종을 만든다 (argon2id 실제 해시):
 *  - m2staff  — "M2 Staff" 그룹 소속 (제한 항목 표시 케이스)
 *  - m2plain  — 어떤 그룹에도 미소속 (로그인했지만 미소속 케이스)
 */
import { Client } from 'pg';
import { hashPassword } from '@rhymix-ts/auth';
import { seedInstalledSite } from './seed-installed-site';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');
  }
  return url;
}

export const STAFF_LOGIN = 'm2staff';
export const STAFF_PASSWORD = 'm2-staff-pass-42';
export const PLAIN_LOGIN = 'm2plain';
export const PLAIN_PASSWORD = 'm2-plain-pass-42';

/** 특성화 대상 항목 제목 — 스펙 로케이터와 시더가 공유하는 상수. */
export const MENU_TITLES = {
  control: 'M2-공개',
  restricted: 'M2-제한',
  treeTop: 'M2-트리상',
  treeMid: 'M2-트리중',
  treeBottom: 'M2-트리하',
  footer: 'M2-푸터항목',
  utility: 'M2-유틸항목',
} as const;

export interface SeedMenuParityResult {
  siteId: number;
  domainId: number;
  adminUserId: number;
  staffGroupId: number;
  staffUserId: number;
  plainUserId: number;
  headerMenuId: number;
  footerMenuId: number;
  utilityMenuId: number;
}

/**
 * M2 특성화 픽스처 전체를 시드한다 (resetDb() 이후 호출 전제).
 *
 * @MX:NOTE: [AUTO] 제품 코드가 아니라 e2e 테스트 지원 툴링이다 (plan.md §A.3 예약명).
 * @MX:SPEC: SPEC-LEGACY-PARITY-001 M2
 */
export async function seedMenuParityFixtures(): Promise<SeedMenuParityResult> {
  const { siteId, userId: adminUserId } = await seedInstalledSite({
    adminPassword: 'm2-admin-pass-42',
  });

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');

    const domainRes = await client.query<{ id: number }>(
      `SELECT id FROM domains WHERE "siteId" = $1 AND "isDefault" = true LIMIT 1`,
      [siteId],
    );
    const domainId = domainRes.rows[0]!.id;

    const groupRes = await client.query<{ id: number }>(
      `INSERT INTO member_groups ("siteId", title, "isDefault", "isAdmin", "listOrder")
       VALUES ($1, 'M2 Staff', false, false, 1)
       RETURNING id`,
      [siteId],
    );
    const staffGroupId = groupRes.rows[0]!.id;

    const staffHash = await hashPassword(STAFF_PASSWORD);
    const plainHash = await hashPassword(PLAIN_PASSWORD);

    const insertUser = async (
      login: string,
      passwordHash: string,
    ): Promise<number> => {
      // "updatedAt"은 NOT NULL + DB 기본값 없음 (Prisma @updatedAt은 클라이언트
      // 측 전용) — 원시 INSERT가 반드시 채워야 한다 (seed-installed-site와 동일).
      const res = await client.query<{ id: number }>(
        `INSERT INTO users
          ("userId", "emailAddress", "passwordHash", "nickName", status, "isAdmin", denied, "updatedAt")
         VALUES ($1, $2, $3, $1, 'APPROVED', false, false, NOW())
         RETURNING id`,
        [login, `${login}@e2e.local`, passwordHash],
      );
      return res.rows[0]!.id;
    };

    const staffUserId = await insertUser(STAFF_LOGIN, staffHash);
    const plainUserId = await insertUser(PLAIN_LOGIN, plainHash);

    // 소속/미소속을 가르는 유일한 차이 — 그룹 멤버십 1행
    await client.query(
      `INSERT INTO member_group_members ("groupId", "userId") VALUES ($1, $2)`,
      [staffGroupId, staffUserId],
    );

    const insertMenu = async (title: string, listOrder: number): Promise<number> => {
      const res = await client.query<{ id: number }>(
        `INSERT INTO menus ("siteId", title, "isAdminMenu", "listOrder", "updatedAt")
         VALUES ($1, $2, false, $3, NOW()) RETURNING id`,
        [siteId, title, listOrder],
      );
      return res.rows[0]!.id;
    };

    const headerMenuId = await insertMenu('M2 Header Menu', 1);
    const footerMenuId = await insertMenu('M2 Footer Menu', 2);
    const utilityMenuId = await insertMenu('M2 Utility Menu', 3);

    const insertItem = async (
      menuId: number,
      parentId: number | null,
      title: string,
      groupIds: number[],
      listOrder: number,
    ): Promise<number> => {
      const res = await client.query<{ id: number }>(
        `INSERT INTO menu_items
          ("menuId", "parentId", title, url, "groupIds", "listOrder", "updatedAt")
         VALUES ($1, $2, $3, '/', $4::int[], $5, NOW())
         RETURNING id`,
        [menuId, parentId, title, groupIds, listOrder],
      );
      return res.rows[0]!.id;
    };

    // 헤더 메뉴 — ACL 쌍 + 3단계 트리
    await insertItem(headerMenuId, null, MENU_TITLES.control, [], 1);
    await insertItem(headerMenuId, null, MENU_TITLES.restricted, [staffGroupId], 2);
    const treeTop = await insertItem(headerMenuId, null, MENU_TITLES.treeTop, [], 3);
    const treeMid = await insertItem(headerMenuId, treeTop, MENU_TITLES.treeMid, [], 1);
    await insertItem(headerMenuId, treeMid, MENU_TITLES.treeBottom, [], 1);

    // 푸터·유틸리티 메뉴 — 슬롯별 1항목
    await insertItem(footerMenuId, null, MENU_TITLES.footer, [], 1);
    await insertItem(utilityMenuId, null, MENU_TITLES.utility, [], 1);

    // 3슬롯 동시 배정 — (domainId, slot) 유니크 제약 위반 없이 3행
    const assignSlot = async (slot: string, menuId: number): Promise<void> => {
      await client.query(
        `INSERT INTO menu_slot_assignments ("domainId", slot, "menuId", "updatedAt")
         VALUES ($1, $2, $3, NOW())`,
        [domainId, slot, menuId],
      );
    };
    await assignSlot('HEADER_PRIMARY', headerMenuId);
    await assignSlot('FOOTER', footerMenuId);
    await assignSlot('UTILITY', utilityMenuId);

    await client.query('COMMIT');
    return {
      siteId,
      domainId,
      adminUserId,
      staffGroupId,
      staffUserId,
      plainUserId,
      headerMenuId,
      footerMenuId,
      utilityMenuId,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * 도메인에 배정된 슬롯 목록을 조회한다 (AC-SITE-006 저장 검증 — listSlotAssignments
 * 결과에 3종이 모두 존재하는지). INSERT 성공 자체가 @@unique([domainId, slot])
 * 위반 0건의 증거다.
 */
export async function listAssignedSlots(domainId: number): Promise<string[]> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    const res = await client.query<{ slot: string }>(
      `SELECT slot FROM menu_slot_assignments WHERE "domainId" = $1 ORDER BY slot`,
      [domainId],
    );
    return res.rows.map((r) => r.slot);
  } finally {
    await client.end();
  }
}
