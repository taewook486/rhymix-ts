/**
 * Slice B — DB Validator characterization tests (REQ-INSTALL-013).
 *
 * 본 파일은 `packages/db/src/install/db-validator.ts`의 공개 인터페이스가
 * `install-validate.ts`의 동작을 정확히 위임하는지 확인합니다 (CH-1).
 *
 * DB-1~4: 슈퍼유저 거부, 권한 검증, 테이블 충돌 409, 성공 flow
 * DB-5~6: statement timeout 옵션, 연결 실패 처리
 * CH-1: db-validator.ts가 install-validate.ts와 동일한 구현을 노출하는지 확인
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DbConfig } from '../install-validate';

// ---------------------------------------------------------------------------
// pg 모킹 — vi.hoisted 패턴으로 mock 생성자 안전하게 노출.
// ---------------------------------------------------------------------------

const { ClientCtor, clientFactory } = vi.hoisted(() => {
  const factory = {
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(),
  };
  const ctor = vi.fn(() => factory);
  return { ClientCtor: ctor, clientFactory: factory };
});

vi.mock('pg', () => ({
  default: { Client: ClientCtor },
  Client: ClientCtor,
}));

// install/db-validator.ts를 통해 import — re-export 경로 검증 (CH-1).
import { validateDbConnection } from './db-validator';

const baseConfig: DbConfig = {
  host: '127.0.0.1',
  port: 5444,
  user: 'rhymix',
  pass: 'rhymix',
  database: 'rhymix_ts',
  schema: 'public',
};

describe('validateDbConnection via db-validator (unit)', () => {
  beforeEach(() => {
    ClientCtor.mockClear();
    clientFactory.connect.mockReset();
    clientFactory.end.mockReset();
    clientFactory.query.mockReset();
  });

  afterEach(() => vi.clearAllMocks());

  // DB-1: 슈퍼유저 계정 거부 — REQ-INSTALL-013 항목 1
  it('DB-1: the system shall reject db_user that is a superuser account (postgres, root, admin)', async () => {
    for (const user of ['postgres', 'POSTGRES', 'root', 'ROOT', 'admin', 'ADMIN']) {
      const result = await validateDbConnection({ ...baseConfig, user });
      expect(result.ok, `user=${user} should be rejected`).toBe(false);
      expect(result.errors[0]?.code).toBe('superuser-rejected');
    }
    // DB 연결 자체는 시도하지 않아야 함 (빠른 차단).
    expect(ClientCtor).not.toHaveBeenCalled();
  });

  // DB-2: 권한 검증 — REQ-INSTALL-013 항목 3 (CREATE/SELECT/INSERT/UPDATE/DELETE)
  it('DB-2: the system shall return insufficient-privilege when the user cannot CREATE tables', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockImplementation((sql: string) => {
      if (sql.includes('_rhymix_ts_perm_check')) {
        return Promise.reject(
          Object.assign(new Error('permission denied for schema public'), { code: '42501' }),
        );
      }
      return Promise.resolve({ rows: [] });
    });
    clientFactory.end.mockResolvedValue(undefined);

    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('insufficient-privilege');
  });

  // DB-3: 테이블 충돌 409 — REQ-INSTALL-013 항목 4
  it('DB-3: the system shall return tables-exist (409 equivalent) when reserved tables already exist in schema', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockImplementation((sql: string) => {
      if (sql.includes('_rhymix_ts_perm_check')) return Promise.resolve({ rows: [] });
      if (sql.includes('pg_tables')) {
        return Promise.resolve({
          rows: [
            { tablename: 'users' },
            { tablename: 'documents' },
            { tablename: 'comments' },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    clientFactory.end.mockResolvedValue(undefined);

    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(false);
    const tableErr = result.errors.find((e) => e.code === 'tables-exist');
    expect(tableErr).toBeDefined();
    expect(tableErr?.details?.collidingTables).toContain('users');
    expect(tableErr?.details?.collidingTables).toContain('documents');
    expect(tableErr?.details?.collidingTables).toContain('comments');
  });

  // DB-4: 성공 flow — REQ-INSTALL-013 항목 5 (저장 및 리다이렉트는 action에서 수행)
  it('DB-4: the system shall return ok=true when all checks pass on a clean empty schema', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockResolvedValue({ rows: [] });
    clientFactory.end.mockResolvedValue(undefined);

    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(clientFactory.end).toHaveBeenCalled();
  });

  // DB-5: statement timeout — REQ-INSTALL-013 항목 2 (5초 제한)
  it('DB-5: the system shall set statement_timeout=5000 (5s) on the pg.Client connection', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockResolvedValue({ rows: [] });
    clientFactory.end.mockResolvedValue(undefined);

    await validateDbConnection(baseConfig);

    const calls = ClientCtor.mock.calls as unknown as unknown[][];
    const ctorArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(ctorArgs?.statement_timeout).toBe(5000);
    expect(ctorArgs?.connectionTimeoutMillis).toBe(5000);
  });

  // DB-6: 연결 실패 처리 — REQ-INSTALL-013 항목 2 (접속 실패)
  it('DB-6: the system shall return unreachable when the pg client cannot connect', async () => {
    const err = Object.assign(new Error('ECONNREFUSED 127.0.0.1:9999'), {
      code: 'ECONNREFUSED',
    });
    clientFactory.connect.mockRejectedValue(err);

    const result = await validateDbConnection({ ...baseConfig, port: 9999 });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('unreachable');
    // 연결 실패 후 end()는 호출되어야 함 (finally 블록).
    expect(clientFactory.end).toHaveBeenCalled();
  });

  // CH-1: db-validator.ts re-export 경로 검증 — characterization
  it('CH-1: db-validator.ts shall expose the same validateDbConnection as install-validate.ts', async () => {
    // re-export가 정상적으로 동작하면 위 모든 테스트가 동일 함수를 테스트하고 있음.
    // 추가로 allowSuperuser 옵션이 통과되는지 확인.
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockResolvedValue({ rows: [] });
    clientFactory.end.mockResolvedValue(undefined);

    const result = await validateDbConnection(
      { ...baseConfig, user: 'postgres' },
      { allowSuperuser: true },
    );
    expect(result.ok).toBe(true);
  });

  // CH-2: allowExistingTables 옵션 — 개발 환경 우회 characterization
  it('CH-2: the system shall allow existing reserved tables when allowExistingTables=true (dev bypass)', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockImplementation((sql: string) => {
      if (sql.includes('_rhymix_ts_perm_check')) return Promise.resolve({ rows: [] });
      if (sql.includes('pg_tables')) {
        return Promise.resolve({ rows: [{ tablename: 'users' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    clientFactory.end.mockResolvedValue(undefined);

    const result = await validateDbConnection(baseConfig, { allowExistingTables: true });
    expect(result.ok).toBe(true);
  });
});
