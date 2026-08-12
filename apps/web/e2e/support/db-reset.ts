/**
 * E2E DB 초기화 헬퍼 — Slice E-followup.
 *
 * 매 테스트 전에 install로 생성되는 모든 행을 TRUNCATE 하여 위저드를
 * 깨끗한 상태에서 시작할 수 있게 합니다. `prisma db push --force-reset`
 * 보다 ~50배 빠르며 스키마는 그대로 유지합니다.
 *
 * 직접 `pg.Client`를 사용하는 이유:
 *  - Prisma client는 `process.env.DATABASE_URL`을 모듈 로드 시점에 캐시해서
 *    테스트 격리에 부적합.
 *  - TRUNCATE는 raw SQL이 가장 빠름.
 *
 * 대상 테이블은 **하드코딩하지 않고 pg_tables에서 매번 조회**합니다.
 * 과거에는 손으로 관리하는 목록을 썼는데, 스키마가 자라는 동안 목록이 따라가지
 * 못해 다음 결함이 발생했습니다:
 *
 *   - `theme_assignments`가 목록에 없었다. 이 테이블의 `refId`는 다형성 컬럼이라
 *     `sites`/`domains`로 가는 FK가 없어 CASCADE가 닿지 않는다.
 *   - install 시드는 theme/layout은 upsert로 쓰지만 `themeAssignment`만 `create()`를
 *     쓰므로, 한 번 설치된 뒤 재설치하면 항상
 *     `Unique constraint failed on (scope, refType, refId)`로 트랜잭션이 롤백됐다.
 *   - 그 결과 `install-happy-path.spec.ts`를 포함해 설치 위저드를 도는 spec들이
 *     연속 실행에서 재현성 있게 실패했다.
 *
 * 동적 조회는 이 드리프트를 구조적으로 차단합니다 — 새 테이블이 추가돼도
 * 이 파일을 고칠 필요가 없습니다.
 */
import { Client } from 'pg';

/**
 * TRUNCATE 대상에서 제외할 테이블.
 * `_prisma_migrations`는 마이그레이션 이력이므로 지우면 Prisma가 스키마를
 * 미적용 상태로 오인합니다.
 */
const EXCLUDED_TABLES = ['_prisma_migrations'] as const;

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
 * public 스키마의 TRUNCATE 대상 테이블 목록을 조회합니다.
 * 식별자는 pg 카탈로그에서 온 값이지만, 방어적으로 `"` 이스케이프를 적용합니다.
 */
async function listTruncatableTables(client: Client): Promise<string[]> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> ALL($1::text[])
      ORDER BY tablename`,
    [EXCLUDED_TABLES as unknown as string[]],
  );
  return res.rows.map((r) => r.tablename);
}

/**
 * public 스키마의 모든 애플리케이션 테이블을 TRUNCATE 합니다.
 *
 * @MX:WARN: production DB에 절대 실행되면 안 됩니다.
 * @MX:REASON: TRUNCATE CASCADE는 모든 사용자 데이터를 삭제합니다. 호출자가 테스트 환경임을 보장해야 합니다.
 * @MX:SPEC: SPEC-INSTALL-001 Slice E-followup F2
 */
export async function resetDb(): Promise<void> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    const tables = await listTruncatableTables(client);
    if (tables.length === 0) {
      throw new Error(
        'public 스키마에 TRUNCATE 대상 테이블이 없습니다. 마이그레이션이 적용되지 않았을 수 있습니다.',
      );
    }
    const list = tables.map((t) => `"${t.replace(/"/g, '""')}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  } finally {
    await client.end();
  }
}
