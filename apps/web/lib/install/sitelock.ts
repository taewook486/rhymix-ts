/**
 * SiteLock 상태 조회 — REQ-INSTALL-024.
 *
 * SiteSetting 테이블에서 sitelock_enabled / sitelock_allowlist 두 키를 읽어
 * proxy 미들웨어가 503 차단 결정에 사용할 정규화된 형태로 반환한다.
 *
 * 설치 전 단계에서는 site_settings 테이블이 존재하지 않을 수 있으므로
 * Prisma P2021/P2010 오류는 안전한 기본값({enabled:false, allowlist:[]})으로 흡수한다.
 *
 * @MX:ANCHOR: getSiteLockStatus는 proxy.ts에서 매 요청마다 호출되는 단일 진실 원천.
 * @MX:REASON: SiteLock 결정 로직이 분산되면 우회 경로가 생길 위험이 있어 한 곳에 집중.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-024
 * @MX:WARN: react cache()로 요청 단위 메모이제이션 — 동일 요청 내 중복 호출도 1회 쿼리.
 * @MX:REASON: 요청당 1회를 보장하지 않으면 high-traffic 환경에서 DB 부하 폭증.
 */
import { cache } from 'react';

import { prisma } from '@rhymix-ts/db';

export interface SiteLockStatus {
  enabled: boolean;
  allowlist: string[];
}

const DEFAULT_STATUS: SiteLockStatus = { enabled: false, allowlist: [] };

async function readSiteLock(): Promise<SiteLockStatus> {
  let rows: Array<{ key: string; value: unknown }> = [];
  try {
    rows = (await prisma.siteSetting.findMany({
      where: { key: { in: ['sitelock_enabled', 'sitelock_allowlist'] } },
      select: { key: true, value: true },
    })) as Array<{ key: string; value: unknown }>;
  } catch (err) {
    // P2021: 테이블 미존재 (설치 전), P2010: DB 도달 불가 — 안전한 기본값으로 흡수.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2021' || code === 'P2010') {
      return DEFAULT_STATUS;
    }
    throw err;
  }

  let enabled = false;
  let allowlist: string[] = [];

  for (const row of rows) {
    if (row.key === 'sitelock_enabled') {
      enabled = row.value === true;
    } else if (row.key === 'sitelock_allowlist') {
      // 값은 JSON 컬럼 — 배열이 아닐 경우 안전하게 빈 배열로 처리.
      if (Array.isArray(row.value)) {
        allowlist = row.value.filter((entry): entry is string => typeof entry === 'string');
      }
    }
  }

  return { enabled, allowlist };
}

/** 요청 단위 메모이제이션된 접근자 (Next.js App Router). */
export const getSiteLockStatus = cache(readSiteLock);
