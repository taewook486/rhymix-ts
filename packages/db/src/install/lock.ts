/**
 * Postgres advisory lock 헬퍼 — SPEC-INSTALL-001 / REQ-INSTALL-053.
 *
 * `procInstall` 진입 직전 다중 동시 설치 시도를 차단하기 위해 세션-스코프
 * advisory lock을 사용합니다. `pg_try_advisory_lock`은 비차단(non-blocking)
 * 변형으로, 이미 잠겨 있으면 즉시 false를 반환하므로 "다른 설치가 진행 중"
 * 상황을 빠르게 식별할 수 있습니다.
 *
 * 키 결정: 임의 BIGINT 대신 `hashtext('rhymix_ts_install')`을 사용하여
 * 문자열 키와 1:1 매핑되도록 합니다. `pg_try_advisory_lock`/`pg_advisory_unlock`
 * 모두 같은 해시 키를 입력으로 받습니다.
 *
 * Prisma 사용 형태: 파라미터 인젝션 위험을 차단하기 위해 `Prisma.sql`
 * tagged template로 호출합니다(상수 키지만 안전한 API를 일관되게 사용).
 *
 * @MX:ANCHOR: 설치 직전 동시 실행 차단의 단일 게이트 (fan_in: performInstall, 통합 테스트, 향후 admin tooling).
 * @MX:REASON: 본 락이 동작하지 않으면 procInstall이 동시 실행되어 부분 시드/유니크 위반이 발생한다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-053
 */
import { Prisma, type PrismaClient } from '@prisma/client';

/** 트랜잭션 클라이언트도 받을 수 있도록 약한 인터페이스. */
type RawClient = Pick<PrismaClient, '$queryRaw'>;

export interface InstallLock {
  /** 락 획득 여부. false면 release()는 no-op. */
  acquired: boolean;
  /** 획득한 락을 즉시 해제. acquired=false인 경우 no-op. */
  release: () => Promise<void>;
}

/**
 * `pg_try_advisory_lock(hashtext('rhymix_ts_install'))`을 시도합니다.
 * 비차단 형태이므로 이미 잠긴 경우 즉시 `acquired=false`를 반환합니다.
 */
export async function acquireInstallLock(prisma: RawClient): Promise<InstallLock> {
  const rows = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>(
    Prisma.sql`SELECT pg_try_advisory_lock(hashtext('rhymix_ts_install'))`,
  );
  const acquired = rows?.[0]?.pg_try_advisory_lock === true;
  if (!acquired) {
    return { acquired: false, release: async () => undefined };
  }
  return {
    acquired: true,
    release: async () => {
      await prisma.$queryRaw<Array<{ pg_advisory_unlock: boolean }>>(
        Prisma.sql`SELECT pg_advisory_unlock(hashtext('rhymix_ts_install'))`,
      );
    },
  };
}
