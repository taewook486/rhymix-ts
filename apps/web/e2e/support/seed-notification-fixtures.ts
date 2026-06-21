/**
 * SPEC-NOTIFICATION-001 REQ-NOTIF-065 / AC-NOTIF-B1 e2e 시드 헬퍼.
 *
 * notification.spec.ts에서 사용하는 두 가지 시드 함수를 제공한다:
 *  - seedMember: 실제 로그인이 가능한 회원 1명 생성 (Argon2id 실제 해시 사용)
 *  - seedNotificationBoard: 게시판 1개 생성 (permissions는 빈 객체로 — 로그인 회원은
 *    canPerformAction의 group [1] 기본값으로 글쓰기/댓글쓰기 권한을 이미 보유하므로
 *    feed.spec.ts의 게스트 권한 패턴이 불필요함)
 *
 * seed-installed-site.ts와 동일한 스타일(pg.Client 직접 사용, BEGIN/COMMIT/ROLLBACK)을 따른다.
 */
import { Client } from 'pg';
import { hashPassword } from '@rhymix-ts/auth';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되어 있지 않습니다. apps/web/.env.local 또는 환경변수를 확인하세요.',
    );
  }
  return url;
}

export interface SeedMemberOptions {
  userId: string;
  password: string;
  nickName: string;
  email?: string;
}

/**
 * 실제 로그인 가능한 회원 1명을 시드한다.
 *
 * seed-installed-site.ts의 admin row와 달리, placeholder 해시가 아니라
 * hashPassword()로 생성한 실제 Argon2id PHC 문자열을 사용한다 — 이 회원으로
 * /login 폼을 통해 실제로 로그인할 수 있어야 하기 때문이다.
 *
 * status: 'APPROVED', isAdmin: false, denied: false — seed-installed-site.ts의
 * users INSERT 컬럼/값 패턴을 그대로 따른다.
 */
export async function seedMember(opts: SeedMemberOptions): Promise<{ userId: number }> {
  const email = opts.email ?? `${opts.userId}@e2e.local`;
  const passwordHash = await hashPassword(opts.password);

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query<{ id: number }>(
      `INSERT INTO users
        ("userId", "emailAddress", "passwordHash", "passwordVersion", "nickName",
         status, "isAdmin", denied, "updatedAt")
       VALUES ($1, $2, $3, 'argon2id-v1', $4,
         'APPROVED', false, false, NOW())
       RETURNING id`,
      [opts.userId, email, passwordHash, opts.nickName],
    );

    await client.query('COMMIT');
    return { userId: userRes.rows[0]!.id };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

export interface SeedNotificationBoardOptions {
  mid?: string;
  siteId: number;
}

/**
 * 게시판 1개를 시드하고 mid를 반환한다.
 *
 * permissions는 `{}`로 둔다 — feed.spec.ts의 `{list:[0],view:[0]}` 패턴(게스트 그룹 0
 * 권한 부여)과 달리, 이 시나리오는 로그인 회원(member A/B/C)만 사용하므로
 * permissions.ts의 canPerformAction()이 write_document/write_comment에 대해
 * 적용하는 기본 그룹 [1] 권한으로 충분하다. 별도 MemberGroup/MemberGroupMember
 * 시드가 필요 없다 (write/page.tsx와 buildActor()가 로그인 회원을 그룹 1로 취급).
 */
export async function seedNotificationBoard(
  opts: SeedNotificationBoardOptions,
): Promise<{ mid: string; boardId: number }> {
  const mid = opts.mid ?? 'notiftest';

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');

    const moduleRes = await client.query<{ id: number }>(
      `INSERT INTO module_instances ("siteId", "moduleCode", mid, name, "updatedAt")
       VALUES ($1, 'board', $2, '알림 테스트 게시판', NOW())
       RETURNING id`,
      [opts.siteId, mid],
    );
    const moduleInstanceId = moduleRes.rows[0]!.id;

    const boardRes = await client.query<{ id: number }>(
      `INSERT INTO boards ("moduleInstanceId", name, permissions, "createdAt", "updatedAt")
       VALUES ($1, '알림 테스트', $2, NOW(), NOW())
       RETURNING id`,
      [moduleInstanceId, JSON.stringify({})],
    );
    const boardId = boardRes.rows[0]!.id;

    await client.query('COMMIT');
    return { mid, boardId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}
