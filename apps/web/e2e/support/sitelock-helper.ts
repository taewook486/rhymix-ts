/**
 * SiteLock 직접 조작 헬퍼 — Slice E-followup F2.
 *
 * 위저드를 거치지 않고 SiteSetting 행을 직접 INSERT/UPDATE 하여 503 차단
 * 시나리오 (E2E-03)를 빠르게 구성합니다. 본 헬퍼는 site row가 이미 시드된
 * 상태를 전제로 합니다 — `seedInstalledSite`로 먼저 site를 만든 뒤 호출하세요.
 */
import { Client } from 'pg';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');
  }
  return url;
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function getFirstSiteId(client: Client): Promise<number> {
  const res = await client.query<{ id: number }>('SELECT id FROM sites ORDER BY id LIMIT 1');
  if (res.rowCount === 0) {
    throw new Error('site row가 없습니다. seedInstalledSite를 먼저 호출하세요.');
  }
  return res.rows[0]!.id;
}

/**
 * SiteLock을 활성화하고 allowlist를 지정합니다.
 *
 * 기존 sitelock_enabled / sitelock_allowlist 행이 있으면 UPDATE,
 * 없으면 INSERT — UPSERT는 (siteId, key) unique 인덱스를 사용합니다.
 */
export async function enableSiteLock(allowlistIps: string[]): Promise<void> {
  await withClient(async (client) => {
    const siteId = await getFirstSiteId(client);
    const now = new Date();
    const upsert = `
      INSERT INTO site_settings ("siteId", key, value, "updatedAt")
      VALUES ($1, $2, $3::jsonb, $4)
      ON CONFLICT ("siteId", key) DO UPDATE
      SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"
    `;
    await client.query(upsert, [siteId, 'sitelock_enabled', JSON.stringify(true), now]);
    await client.query(upsert, [
      siteId,
      'sitelock_allowlist',
      JSON.stringify(allowlistIps),
      now,
    ]);
  });
}

/** SiteLock 비활성화 — afterAll cleanup용. */
export async function disableSiteLock(): Promise<void> {
  await withClient(async (client) => {
    const siteId = await getFirstSiteId(client);
    const now = new Date();
    const upsert = `
      INSERT INTO site_settings ("siteId", key, value, "updatedAt")
      VALUES ($1, 'sitelock_enabled', $2::jsonb, $3)
      ON CONFLICT ("siteId", key) DO UPDATE
      SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"
    `;
    await client.query(upsert, [siteId, JSON.stringify(false), now]);
  });
}
