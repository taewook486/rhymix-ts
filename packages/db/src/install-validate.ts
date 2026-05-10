/**
 * DB 접속/권한/스키마 충돌 검증 — REQ-INSTALL-013.
 *
 * 4개 단계의 순차적 검사를 수행합니다:
 *   1) 슈퍼유저 거부 (allowSuperuser 옵션 시 우회)
 *   2) 5초 statement_timeout으로 접속 시도
 *   3) `_rhymix_ts_perm_check` 임시 테이블 생성/삭제 권한 검사
 *   4) `users`/`documents`/`comments`/`modules`/`sites` 테이블 충돌 검사
 *
 * Slice C 단계에서는 DB에 영구 변경을 가하지 않습니다 — 권한 검사를 위한
 * `CREATE TABLE`은 즉시 `DROP TABLE`로 회수되며, REQ-INSTALL-050과 호환됩니다.
 *
 * @MX:ANCHOR: 위저드 → 영구 DB 변경 직전의 마지막 안전 게이트 (fan_in: validateDbConfig action, 통합 테스트, 향후 admin gate).
 * @MX:REASON: 이 검증을 통과하지 못한 DB 설정으로는 procInstall이 실행되지 않는다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-013, REQ-INSTALL-050
 */
import pg from 'pg';

import type { DbConfig } from '@rhymix-ts/core';

/** 차단되는 슈퍼유저 계정명 (대소문자 무시). */
const SUPERUSER_NAMES = new Set(['postgres', 'root', 'admin']);

/** 충돌 검사 대상 — Prisma 모델 이름과 동기화. */
const RESERVED_TABLES = ['users', 'documents', 'comments', 'modules', 'sites'] as const;

export type DbValidationCode =
  | 'superuser-rejected'
  | 'auth-failed'
  | 'unreachable'
  | 'insufficient-privilege'
  | 'tables-exist';

export interface DbValidationIssue {
  code: DbValidationCode;
  message: string;
  details?: { collidingTables?: string[] };
}

export interface DbValidationResult {
  ok: boolean;
  errors: DbValidationIssue[];
}

export interface ValidateOptions {
  /** 개발 환경 등에서 슈퍼유저 차단을 우회. */
  allowSuperuser?: boolean;
  /**
   * Schema가 사전에 `db push`로 적용된 개발 환경에서 예약 테이블 충돌을
   * 무시. 비어있는 테이블이라면 seed가 그대로 INSERT 가능. production에서는
   * 절대 활성화하지 말 것.
   */
  allowExistingTables?: boolean;
}

/**
 * 접속 실패 에러를 auth-failed / unreachable로 분류.
 * Postgres `28P01`(invalid_password)·`28000`(invalid_authorization) 계열은 인증 실패.
 */
function classifyConnectError(err: unknown): DbValidationIssue {
  const e = err as { code?: string; message?: string };
  const code = e?.code ?? '';
  if (code === '28P01' || code === '28000' || /password|authentication/i.test(e?.message ?? '')) {
    return {
      code: 'auth-failed',
      message: e?.message ?? '인증에 실패했습니다.',
    };
  }
  return {
    code: 'unreachable',
    message: e?.message ?? '데이터베이스에 접속할 수 없습니다.',
  };
}

/**
 * 위저드 3단계에서 사용자 입력 DB 설정의 유효성을 종단간 검증.
 */
export async function validateDbConnection(
  config: DbConfig,
  opts: ValidateOptions = {},
): Promise<DbValidationResult> {
  // 1) 슈퍼유저 거부 — 접속 시도 전에 빠르게 차단.
  if (!opts.allowSuperuser && SUPERUSER_NAMES.has(config.user.toLowerCase())) {
    return {
      ok: false,
      errors: [
        {
          code: 'superuser-rejected',
          message:
            '슈퍼유저 계정으로 설치할 수 없습니다. 전용 데이터베이스 사용자를 생성하세요.',
        },
      ],
    };
  }

  // 2) 접속 시도 — 5초 statement_timeout 강제.
  const ClientCtor = (pg as unknown as { Client: new (cfg: unknown) => pg.Client }).Client;
  const client = new ClientCtor({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.pass,
    database: config.database,
    statement_timeout: 5000,
    connectionTimeoutMillis: 5000,
  });

  try {
    try {
      await client.connect();
    } catch (err) {
      return { ok: false, errors: [classifyConnectError(err)] };
    }

    // 3) 권한 검사 — 임시 테이블 생성/삭제.
    try {
      await client.query(
        'CREATE TABLE IF NOT EXISTS _rhymix_ts_perm_check (id INT)',
      );
      await client.query('DROP TABLE _rhymix_ts_perm_check');
    } catch (err) {
      const e = err as { message?: string };
      return {
        ok: false,
        errors: [
          {
            code: 'insufficient-privilege',
            message:
              e?.message ??
              '대상 스키마에 테이블 생성 권한이 없습니다. CREATE/DROP 권한이 필요합니다.',
          },
        ],
      };
    }

    // 4) 예약 테이블 충돌 검사 — opts.allowExistingTables=true면 우회.
    const result = await client.query(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = $1 AND tablename = ANY($2)`,
      [config.schema, [...RESERVED_TABLES]],
    );
    const collidingTables = (result.rows as Array<{ tablename: string }>).map(
      (r) => r.tablename,
    );
    if (collidingTables.length > 0 && !opts.allowExistingTables) {
      return {
        ok: false,
        errors: [
          {
            code: 'tables-exist',
            message: `대상 스키마에 이미 다음 테이블이 존재합니다: ${collidingTables.join(', ')}`,
            details: { collidingTables },
          },
        ],
      };
    }

    return { ok: true, errors: [] };
  } finally {
    try {
      await client.end();
    } catch {
      // 연결 자체가 실패한 경우 end()가 다시 던질 수 있어 무시.
    }
  }
}
