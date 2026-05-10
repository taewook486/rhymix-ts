/**
 * E2E DB 초기화 헬퍼 — Slice E-followup.
 *
 * 매 테스트 전에 install로 생성되는 모든 행을 TRUNCATE 하여 위저드를
 * 깨끗한 상태에서 시작할 수 있게 합니다. `prisma db push --force-reset`
 * 보다 ~50배 빠르며 스키마는 그대로 유지합니다.
 *
 * 대상 테이블은 `prisma/schema.prisma`의 `@@map` 이름을 따릅니다
 * (Slice E-snake가 적용되기 전이라 현재는 snake_case).
 *
 * 직접 `pg.Client`를 사용하는 이유:
 *  - Prisma client는 `process.env.DATABASE_URL`을 모듈 로드 시점에 캐시해서
 *    테스트 격리에 부적합.
 *  - TRUNCATE는 raw SQL이 가장 빠름.
 */
import { Client } from 'pg';

/** TRUNCATE 대상 — 자식 → 부모 순서이지만 CASCADE이므로 의존성은 PG가 처리. */
const TABLES_TO_TRUNCATE = [
  'member_group_members',
  'member_groups',
  'module_instances',
  'site_settings',
  'domains',
  'sites',
  'users',
] as const;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되어 있지 않습니다. apps/web/.env.local 또는 환경변수를 확인하세요.',
    );
  }
  return url;
}

/**
 * 모든 install 관련 테이블을 TRUNCATE 합니다.
 *
 * @MX:WARN: production DB에 절대 실행되면 안 됩니다.
 * @MX:REASON: TRUNCATE CASCADE는 모든 사용자 데이터를 삭제합니다. 호출자가 테스트 환경임을 보장해야 합니다.
 * @MX:SPEC: SPEC-INSTALL-001 Slice E-followup F2
 */
export async function resetDb(): Promise<void> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    const list = TABLES_TO_TRUNCATE.map((t) => `"${t}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  } finally {
    await client.end();
  }
}
