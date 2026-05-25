/**
 * 설치된 site row 1개 + admin user 1개를 직접 INSERT 하는 헬퍼.
 *
 * 위저드를 거친 happy-path보다 ~10배 빠릅니다. E2E-02/E2E-03처럼 "이미 설치된
 * 상태"를 전제로 하는 시나리오에서만 사용합니다. SiteLock 토글이나
 * /install 410 동작을 검증하기 위한 최소 시드이며, 실제 install이 만드는
 * MemberGroup / ModuleInstance까지는 만들지 않습니다 (해당 시나리오에 불필요).
 *
 * 비밀번호 해시는 placeholder 문자열 — 본 헬퍼로 시드된 사용자로는 로그인이
 * 동작하지 않습니다 (의도적). 로그인 시나리오는 happy-path에 포함되어 있습니다.
 */
import { Client } from 'pg';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');
  }
  return url;
}

export interface SeedInstalledOptions {
  hostname?: string;
  scheme?: 'http' | 'https';
  adminEmail?: string;
  adminUserId?: string;
}

/**
 * 설치 완료된 site 1개를 빠르게 시드합니다 (TRUNCATE 이후 호출 필요).
 *
 * @MX:NOTE: REQ-INSTALL-020(설치 상태 게이트)을 만족시키려면 sites.installedAt 가 NOT NULL 이어야 합니다.
 */
export async function seedInstalledSite(opts: SeedInstalledOptions = {}): Promise<{
  siteId: number;
  userId: number;
}> {
  const hostname = opts.hostname ?? 'localhost';
  const scheme = opts.scheme ?? 'http';
  const email = opts.adminEmail ?? 'admin@e2e.local';
  const userId = opts.adminUserId ?? 'admin';

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');

    const siteRes = await client.query<{ id: number }>(
      `INSERT INTO sites
        ("defaultLanguage", "timeZone", scheme, "installedAt", "installerIp", "installerUserAgent",
         "rhymixTsVersion", "databaseSchemaVersion")
       VALUES ('ko', 'Asia/Seoul', $1, NOW(), '127.0.0.1', 'e2e-seed', '0.0.0', 'init')
       RETURNING id`,
      [scheme],
    );
    const siteId = siteRes.rows[0]!.id;

    await client.query(
      `INSERT INTO domains ("siteId", hostname, "isDefault", scheme, "forceHttps", "updatedAt")
       VALUES ($1, $2, true, $3, $4, NOW())`,
      [siteId, hostname, scheme, scheme === 'https'],
    );

    const userRes = await client.query<{ id: number }>(
      `INSERT INTO users
        ("userId", "emailAddress", "passwordHash", "passwordVersion", "nickName",
         status, "isAdmin", denied, "updatedAt")
       VALUES ($1, $2, 'e2e-placeholder-not-a-real-hash', 'argon2id-v1', $1,
         'APPROVED', true, false, NOW())
       RETURNING id`,
      [userId, email],
    );
    const adminId = userRes.rows[0]!.id;

    await client.query(
      `UPDATE sites SET "installedBy" = $1 WHERE id = $2`,
      [adminId, siteId],
    );

    await client.query('COMMIT');
    return { siteId, userId: adminId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}
