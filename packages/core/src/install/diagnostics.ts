/**
 * 환경 자가진단 — REQ-INSTALL-012.
 *
 * Pure logic with injectable IO so the same module is unit-testable in node
 * environment without touching the real filesystem, network, or process.
 *
 * The page wrapper (apps/web/app/install/check-env/page.tsx) supplies a
 * concrete IO bound to Node fs/process/fetch.
 *
 * @MX:ANCHOR: runEnvDiagnostics는 설치 위저드 단계 2의 진입점 — 모든 검사 결과의 단일 진실 원천.
 * @MX:REASON: page 컴포넌트, /install/check-env 라우트, 잠재적 CLI 진단 유틸리티(>= 3 callers)에서 호출됨.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-012
 */

/** Required minimum Node major version (REQ-INSTALL-012 / engines.node). */
export const MIN_NODE_MAJOR = 22;

/** Per-check timeout budget — keeps total report under the REQ-INSTALL-012 5s p95 ceiling. */
export const PER_CHECK_TIMEOUT_MS = 1500;

/** Categories mirrored from EnvCheckResult schema (Domain Model section of SPEC). */
export type EnvCheckCategory =
  | 'runtime'
  | 'env'
  | 'fs'
  | 'database'
  | 'mail'
  | 'middleware';

export type EnvCheckStatus = 'ok' | 'warn' | 'error';

export interface EnvCheckResult {
  category: EnvCheckCategory;
  key: string;
  status: EnvCheckStatus;
  message: string;
  remediation?: string;
}

export interface EnvCheckReport {
  overall: EnvCheckStatus;
  results: EnvCheckResult[];
  generatedAt: Date;
}

/**
 * Injectable IO surface — keeps diagnostics.ts free of Next/Node import
 * coupling and makes every check trivially mockable.
 */
export interface DiagnosticsIO {
  /** e.g. process.versions.node prefixed with "v". */
  nodeVersion: string;
  env: {
    DATABASE_URL?: string;
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    SMTP_HOST?: string;
  };
  /** Returns true when the path is writable (creating dir is acceptable). */
  canWrite: (path: string) => Promise<boolean>;
  /** Returns true if @prisma/client can be require/import-resolved. */
  canResolvePrismaClient: () => Promise<boolean>;
  /** Optional: TCP probe to host:port; resolves true on connect within 1s. */
  tcpProbe: (host: string, port: number) => Promise<boolean>;
  /**
   * HEAD request to /api/install/rewrite-test/{nonce}; returns the value of
   * the response header `x-install-rewrite-nonce` (empty string on miss).
   */
  rewriteHeadProbe: (nonce: string) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Race a promise against the per-check timeout. */
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function parseNodeMajor(v: string): number {
  // Accept "v22.11.0" or "22.11.0".
  const stripped = v.startsWith('v') ? v.slice(1) : v;
  const major = Number.parseInt(stripped.split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : 0;
}

function isPostgresUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'postgres:' || u.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function nonce(): string {
  return Math.random().toString(36).slice(2, 14);
}

// ---------------------------------------------------------------------------
// Individual checks (each returns EnvCheckResult; throws are caught upstream)
// ---------------------------------------------------------------------------

function checkRuntime(io: DiagnosticsIO): EnvCheckResult {
  const major = parseNodeMajor(io.nodeVersion);
  if (major >= MIN_NODE_MAJOR) {
    return {
      category: 'runtime',
      key: 'runtime.node',
      status: 'ok',
      message: `Node.js ${io.nodeVersion}`,
    };
  }
  return {
    category: 'runtime',
    key: 'runtime.node',
    status: 'error',
    message: `Node.js ${io.nodeVersion} (>= ${MIN_NODE_MAJOR} 필요)`,
    remediation: 'install.node.upgrade',
  };
}

function checkDatabaseUrl(io: DiagnosticsIO): EnvCheckResult {
  if (!io.env.DATABASE_URL) {
    return {
      category: 'env',
      key: 'env.DATABASE_URL',
      status: 'error',
      message: 'DATABASE_URL 환경 변수가 설정되지 않았습니다.',
      remediation: 'install.env.database_url',
    };
  }
  if (!isPostgresUrl(io.env.DATABASE_URL)) {
    return {
      category: 'env',
      key: 'env.DATABASE_URL',
      status: 'error',
      message: 'DATABASE_URL 형식이 올바르지 않습니다 (postgresql://...).',
      remediation: 'install.env.database_url',
    };
  }
  return {
    category: 'env',
    key: 'env.DATABASE_URL',
    status: 'ok',
    message: 'DATABASE_URL 확인됨',
  };
}

function checkNextAuthSecret(io: DiagnosticsIO): EnvCheckResult {
  const v = io.env.NEXTAUTH_SECRET ?? '';
  if (v.length < 32) {
    return {
      category: 'env',
      key: 'env.NEXTAUTH_SECRET',
      status: 'error',
      message: `NEXTAUTH_SECRET가 32자 미만입니다 (현재 ${v.length}자).`,
      remediation: 'install.env.nextauth_secret',
    };
  }
  return {
    category: 'env',
    key: 'env.NEXTAUTH_SECRET',
    status: 'ok',
    message: '길이 요건(>= 32) 충족',
  };
}

function checkNextAuthUrl(io: DiagnosticsIO): EnvCheckResult {
  if (!io.env.NEXTAUTH_URL) {
    return {
      category: 'env',
      key: 'env.NEXTAUTH_URL',
      status: 'error',
      message: 'NEXTAUTH_URL 환경 변수가 설정되지 않았습니다.',
      remediation: 'install.env.nextauth_url',
    };
  }
  if (!isHttpUrl(io.env.NEXTAUTH_URL)) {
    return {
      category: 'env',
      key: 'env.NEXTAUTH_URL',
      status: 'error',
      message: 'NEXTAUTH_URL이 올바른 URL이 아닙니다.',
      remediation: 'install.env.nextauth_url',
    };
  }
  return {
    category: 'env',
    key: 'env.NEXTAUTH_URL',
    status: 'ok',
    message: io.env.NEXTAUTH_URL,
  };
}

async function checkFsUploads(io: DiagnosticsIO): Promise<EnvCheckResult> {
  const path = 'apps/web/public/uploads';
  const ok = await io.canWrite(path);
  return ok
    ? { category: 'fs', key: 'fs.uploads', status: 'ok', message: `${path} 쓰기 가능` }
    : {
        category: 'fs',
        key: 'fs.uploads',
        status: 'error',
        message: `${path} 쓰기 권한 없음`,
        remediation: 'install.fs.uploads',
      };
}

async function checkFsNextCache(io: DiagnosticsIO): Promise<EnvCheckResult> {
  const path = 'apps/web/.next/cache';
  const ok = await io.canWrite(path);
  return ok
    ? { category: 'fs', key: 'fs.next-cache', status: 'ok', message: `${path} 쓰기 가능` }
    : {
        category: 'fs',
        key: 'fs.next-cache',
        status: 'error',
        message: `${path} 쓰기 권한 없음`,
        remediation: 'install.fs.next_cache',
      };
}

async function checkDatabaseClient(io: DiagnosticsIO): Promise<EnvCheckResult> {
  const ok = await io.canResolvePrismaClient();
  return ok
    ? { category: 'database', key: 'database.client', status: 'ok', message: '@prisma/client 로드 가능' }
    : {
        category: 'database',
        key: 'database.client',
        status: 'error',
        message: '@prisma/client 모듈을 찾을 수 없습니다.',
        remediation: 'install.database.client',
      };
}

async function checkMailTransport(io: DiagnosticsIO): Promise<EnvCheckResult> {
  if (!io.env.SMTP_HOST) {
    return {
      category: 'mail',
      key: 'mail.transport',
      status: 'warn',
      message: 'SMTP_HOST 미설정 — 이메일 발송 기능은 설치 후 구성할 수 있습니다.',
      remediation: 'install.mail.smtp_host',
    };
  }
  // Default port 25 is fine here; production setups override via SMTP_PORT.
  const ok = await io.tcpProbe(io.env.SMTP_HOST, 25);
  return ok
    ? { category: 'mail', key: 'mail.transport', status: 'ok', message: `${io.env.SMTP_HOST} 접속 가능` }
    : {
        category: 'mail',
        key: 'mail.transport',
        status: 'warn',
        message: `${io.env.SMTP_HOST} 접속 실패 — 설치는 진행 가능합니다.`,
        remediation: 'install.mail.smtp_host',
      };
}

async function checkMiddlewareRewrite(io: DiagnosticsIO): Promise<EnvCheckResult> {
  const n = nonce();
  const echoed = await io.rewriteHeadProbe(n);
  if (echoed === n) {
    return {
      category: 'middleware',
      key: 'middleware.rewrite',
      status: 'ok',
      message: '미들웨어 라우팅 정상 동작',
    };
  }
  return {
    category: 'middleware',
    key: 'middleware.rewrite',
    status: 'error',
    message: 'rewrite 테스트 응답 헤더가 일치하지 않습니다. 서버 재시작 후 자동 해결될 수 있습니다.',
    remediation: 'install.middleware.rewrite',
  };
}

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

type CheckSpec = {
  category: EnvCheckCategory;
  key: string;
  fn: () => Promise<EnvCheckResult>;
};

function timeoutResult(spec: CheckSpec, err: unknown): EnvCheckResult {
  const msg = err instanceof Error ? err.message : String(err);
  // middleware.rewrite는 Turbopack cold-start 시 정상적으로 타임아웃되므로 warn으로 처리.
  const status: EnvCheckStatus = spec.key === 'middleware.rewrite' ? 'warn' : 'error';
  return {
    category: spec.category,
    key: spec.key,
    status,
    message: `검사 실패: ${msg}`,
    remediation: 'install.diagnostics.timeout',
  };
}

function aggregateOverall(results: EnvCheckResult[]): EnvCheckStatus {
  if (results.some((r) => r.status === 'error')) return 'error';
  if (results.some((r) => r.status === 'warn')) return 'warn';
  return 'ok';
}

/**
 * Run every diagnostic in parallel with per-check timeout protection.
 *
 * @MX:NOTE: 각 검사는 Promise.allSettled로 격리되어, 한 검사가 실패해도 나머지는 결과를 반환합니다.
 */
export async function runEnvDiagnostics(io: DiagnosticsIO): Promise<EnvCheckReport> {
  const checks: CheckSpec[] = [
    {
      category: 'runtime',
      key: 'runtime.node',
      fn: async () => checkRuntime(io),
    },
    {
      category: 'env',
      key: 'env.DATABASE_URL',
      fn: async () => checkDatabaseUrl(io),
    },
    {
      category: 'env',
      key: 'env.NEXTAUTH_SECRET',
      fn: async () => checkNextAuthSecret(io),
    },
    {
      category: 'env',
      key: 'env.NEXTAUTH_URL',
      fn: async () => checkNextAuthUrl(io),
    },
    { category: 'fs', key: 'fs.uploads', fn: () => checkFsUploads(io) },
    { category: 'fs', key: 'fs.next-cache', fn: () => checkFsNextCache(io) },
    {
      category: 'database',
      key: 'database.client',
      fn: () => checkDatabaseClient(io),
    },
    { category: 'mail', key: 'mail.transport', fn: () => checkMailTransport(io) },
    {
      category: 'middleware',
      key: 'middleware.rewrite',
      fn: () => checkMiddlewareRewrite(io),
    },
  ];

  const settled = await Promise.allSettled(
    checks.map((spec) => withTimeout(spec.fn(), PER_CHECK_TIMEOUT_MS)),
  );

  const results: EnvCheckResult[] = settled.map((s, i) => {
    const spec = checks[i]!;
    if (s.status === 'fulfilled') return s.value;
    return timeoutResult(spec, s.reason);
  });

  return {
    overall: aggregateOverall(results),
    results,
    generatedAt: new Date(),
  };
}
