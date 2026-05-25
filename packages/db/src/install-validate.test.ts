/**
 * Specification + integration tests for validateDbConnection.
 * Covers REQ-INSTALL-013 (superuser reject, auth, permission probe, table collision).
 *
 * Unit tests use a manual `pg.Client` substitute — Slice C does not introduce
 * the heavy `pg-mem` runtime, but mocks the four documented failure paths
 * plus a happy path.
 *
 * Integration tests run against the local Postgres at 127.0.0.1:5444 and are
 * skipped when SKIP_DB_TESTS=1 is set in the environment.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DbConfig } from './install-validate';

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

import { validateDbConnection } from './install-validate';

const baseConfig: DbConfig = {
  host: '127.0.0.1',
  port: 5444,
  user: 'rhymix',
  pass: 'rhymix',
  database: 'rhymix_ts',
  schema: 'public',
};

describe('validateDbConnection (unit)', () => {
  beforeEach(() => {
    ClientCtor.mockClear();
    clientFactory.connect.mockReset();
    clientFactory.end.mockReset();
    clientFactory.query.mockReset();
  });

  afterEach(() => vi.clearAllMocks());

  it('the system shall reject installation with a superuser account', async () => {
    const result = await validateDbConnection({ ...baseConfig, user: 'POSTGRES' });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('superuser-rejected');
    expect(ClientCtor).not.toHaveBeenCalled();
  });

  it('the system shall allow superuser when explicitly opted-in', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockResolvedValue({ rows: [] });
    clientFactory.end.mockResolvedValue(undefined);
    const result = await validateDbConnection(
      { ...baseConfig, user: 'postgres' },
      { allowSuperuser: true },
    );
    expect(result.ok).toBe(true);
  });

  it('the system shall return auth-failed when connect throws an authentication error', async () => {
    const err = Object.assign(new Error('password authentication failed'), {
      code: '28P01',
    });
    clientFactory.connect.mockRejectedValue(err);
    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('auth-failed');
  });

  it('the system shall return unreachable when connect fails with a network error', async () => {
    const err = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    clientFactory.connect.mockRejectedValue(err);
    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('unreachable');
  });

  it('the system shall return insufficient-privilege when CREATE TABLE fails', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockImplementation((sql: string) => {
      if (sql.includes('_rhymix_ts_perm_check')) {
        return Promise.reject(
          Object.assign(new Error('permission denied'), { code: '42501' }),
        );
      }
      return Promise.resolve({ rows: [] });
    });
    clientFactory.end.mockResolvedValue(undefined);
    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('insufficient-privilege');
  });

  it('the system shall return tables-exist when reserved tables already exist', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockImplementation((sql: string) => {
      if (sql.includes('_rhymix_ts_perm_check')) return Promise.resolve({ rows: [] });
      if (sql.includes('pg_tables')) {
        return Promise.resolve({
          rows: [{ tablename: 'users' }, { tablename: 'documents' }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    clientFactory.end.mockResolvedValue(undefined);
    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(false);
    const collision = result.errors.find((e) => e.code === 'tables-exist');
    expect(collision).toBeDefined();
    expect(collision?.details?.collidingTables).toEqual(['users', 'documents']);
  });

  it('the system shall return ok when all checks pass on an empty schema', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockResolvedValue({ rows: [] });
    clientFactory.end.mockResolvedValue(undefined);
    const result = await validateDbConnection(baseConfig);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(clientFactory.end).toHaveBeenCalled();
  });

  it('the system shall set a 5 second statement_timeout on the connection', async () => {
    clientFactory.connect.mockResolvedValue(undefined);
    clientFactory.query.mockResolvedValue({ rows: [] });
    clientFactory.end.mockResolvedValue(undefined);
    await validateDbConnection(baseConfig);
    const calls = ClientCtor.mock.calls as unknown as unknown[][];
    const ctorArgs = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(ctorArgs?.statement_timeout).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// 통합 테스트 — 실제 Postgres에 접속. SKIP_DB_TESTS=1로 비활성화 가능.
// ---------------------------------------------------------------------------

const skipIntegration = process.env.SKIP_DB_TESTS === '1';

describe.skipIf(skipIntegration)('validateDbConnection (integration)', () => {
  beforeEach(() => {
    vi.doUnmock('pg');
    vi.resetModules();
  });

  it('the system shall succeed against a real empty schema', async () => {
    vi.doUnmock('pg');
    vi.resetModules();
    const real = await import('./install-validate');
    const pgMod = await import('pg');
    const Client = (pgMod as unknown as { Client: new (cfg: unknown) => any }).Client;

    // 격리된 스키마 생성/삭제로 서로 다른 테스트가 충돌하지 않도록 함.
    const admin = new Client({
      host: '127.0.0.1',
      port: 5444,
      user: 'rhymix',
      password: 'rhymix',
      database: 'rhymix_ts',
    });
    await admin.connect();
    const schemaName = `rhymix_ts_validate_${Date.now()}`;
    try {
      await admin.query(`CREATE SCHEMA ${schemaName}`);
      const result = await real.validateDbConnection({
        host: '127.0.0.1',
        port: 5444,
        user: 'rhymix',
        pass: 'rhymix',
        database: 'rhymix_ts',
        schema: schemaName,
      });
      expect(result.ok).toBe(true);
    } finally {
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      await admin.end();
    }
  });

  it('the system shall report unreachable for a closed port', async () => {
    vi.doUnmock('pg');
    vi.resetModules();
    const real = await import('./install-validate');
    const result = await real.validateDbConnection({
      host: '127.0.0.1',
      port: 5,
      user: 'rhymix',
      pass: 'rhymix',
      database: 'rhymix_ts',
      schema: 'public',
    });
    expect(result.ok).toBe(false);
    expect(['unreachable', 'auth-failed']).toContain(result.errors[0]?.code);
  });
});
