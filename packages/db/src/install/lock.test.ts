/**
 * Advisory lock specification + integration tests — REQ-INSTALL-053.
 *
 * 단위 테스트: `$queryRaw`를 모킹하여 호출 시퀀스/파라미터를 검증합니다.
 * 통합 테스트: `127.0.0.1:5444` Postgres에 실제 연결, `SKIP_DB_TESTS=1`이면
 * 건너뜁니다.
 */
import { describe, expect, it, vi } from 'vitest';

// `@prisma/client`는 prisma generate 없이 PrismaClient 초기화에 실패한다.
// 본 단위 테스트는 $queryRaw만 필요하므로 Prisma.sql만 최소 mock한다.
vi.mock('@prisma/client', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
}));

import { acquireInstallLock } from './lock';

interface FakePrisma {
  $queryRaw: ReturnType<typeof vi.fn>;
}

describe('acquireInstallLock (unit)', () => {
  it('the system shall return acquired=true when pg_try_advisory_lock succeeds', async () => {
    const prisma: FakePrisma = {
      // pg_try_advisory_lock returns boolean t/f; Prisma raw rows shape: [{ pg_try_advisory_lock: true }]
      $queryRaw: vi.fn().mockResolvedValueOnce([{ pg_try_advisory_lock: true }]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acquireInstallLock(prisma as any);
    expect(result.acquired).toBe(true);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('the system shall return acquired=false when pg_try_advisory_lock fails to acquire', async () => {
    const prisma: FakePrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ pg_try_advisory_lock: false }]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acquireInstallLock(prisma as any);
    expect(result.acquired).toBe(false);
    // release on a non-acquired lock must be a noop (no DB call).
    await expect(result.release()).resolves.toBeUndefined();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('the system shall release the lock via pg_advisory_unlock when release() is called after a successful acquire', async () => {
    const prisma: FakePrisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
        .mockResolvedValueOnce([{ pg_advisory_unlock: true }]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acquireInstallLock(prisma as any);
    await result.release();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 통합 테스트 — 실제 Postgres 사용
// ---------------------------------------------------------------------------

// 통합 테스트는 명시적인 환경 플래그가 있을 때만 실행됩니다.
// (PrismaClient 초기화 + 실제 Postgres 의존성을 회피)
const RUN_INTEGRATION = process.env.RUN_DB_INTEGRATION === '1';

describe.skipIf(!RUN_INTEGRATION)('acquireInstallLock (integration)', () => {
  it('the system shall block a second acquisition from a separate connection', async () => {
    // 통합 환경: 두 개의 PrismaClient 인스턴스를 서로 다른 connection으로 사용.
    const { PrismaClient } = await import('@prisma/client');
    const url =
      process.env.DATABASE_URL ??
      'postgresql://rhymix:rhymix@127.0.0.1:5444/rhymix_ts?schema=public';
    const a = new PrismaClient({ datasources: { db: { url } } });
    const b = new PrismaClient({ datasources: { db: { url } } });
    try {
      const lock1 = await acquireInstallLock(a);
      expect(lock1.acquired).toBe(true);
      try {
        const lock2 = await acquireInstallLock(b);
        expect(lock2.acquired).toBe(false);
      } finally {
        await lock1.release();
      }
      // After release, another connection can acquire it.
      const lock3 = await acquireInstallLock(b);
      try {
        expect(lock3.acquired).toBe(true);
      } finally {
        await lock3.release();
      }
    } finally {
      await a.$disconnect();
      await b.$disconnect();
    }
  }, 20000);
});
