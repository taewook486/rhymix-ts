/**
 * Slice B — Advisory Lock characterization tests (REQ-INSTALL-053).
 *
 * advisory-lock.ts가 lock.ts를 올바르게 re-export하는지 검증합니다 (AL-1~2).
 * 본 파일은 lock.test.ts의 단위 테스트를 보완하여 advisory-lock.ts 경로를
 * 통해 동일한 동작이 보장됨을 characterization합니다.
 *
 * AL-1: advisory lock 획득 성공
 * AL-2: advisory lock 해제 (release() 호출 시 pg_advisory_unlock 실행)
 */
import { describe, expect, it, vi } from 'vitest';

// `@prisma/client`는 prisma generate 없이 PrismaClient 초기화에 실패한다.
// 본 단위 테스트는 $queryRaw만 필요하므로 Prisma.sql만 최소 mock한다.
vi.mock('@prisma/client', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
}));

// advisory-lock.ts 경로를 통해 import (CH-1: re-export 경로 검증).
import { acquireInstallLock } from './advisory-lock';

interface FakePrisma {
  $queryRaw: ReturnType<typeof vi.fn>;
}

describe('acquireInstallLock via advisory-lock.ts (unit)', () => {
  // AL-1: pg_advisory_lock 획득 성공 — REQ-INSTALL-053
  it('AL-1: the system shall return acquired=true and a release function when pg_try_advisory_lock succeeds', async () => {
    const prisma: FakePrisma = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ pg_try_advisory_lock: true }]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acquireInstallLock(prisma as any);
    expect(result.acquired).toBe(true);
    expect(typeof result.release).toBe('function');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  // AL-2: pg_advisory_lock 해제 — REQ-INSTALL-053
  it('AL-2: the system shall call pg_advisory_unlock when release() is called after successful acquisition', async () => {
    const prisma: FakePrisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])   // acquire
        .mockResolvedValueOnce([{ pg_advisory_unlock: true }]),      // release
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acquireInstallLock(prisma as any);
    expect(result.acquired).toBe(true);
    await result.release();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  // AL-1 보완: 이미 락이 걸린 경우 non-blocking 거부
  it('the system shall return acquired=false without blocking when advisory lock is already held', async () => {
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
});
