/**
 * 사이트 설치 상태 조회 — REQ-INSTALL-002, REQ-INSTALL-020.
 *
 * 미들웨어와 페이지 렌더 양쪽에서 호출되므로 React `cache()`로 요청 단위
 * 메모이제이션을 적용합니다. INSTALL_LOCK 환경 변수가 1이면 DB 상태와
 * 무관하게 installed=true를 반환합니다 (방어적 처리).
 *
 * @MX:ANCHOR: getInstallStatus는 미들웨어/페이지/route handler에서 호출되는 단일 진실 원천 (fan_in >= 3).
 * @MX:REASON: middleware.ts, app/install/check-env/page.tsx, 향후 admin 게이트가 이 함수의 결과에 의존함.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-002, REQ-INSTALL-020
 */
import { cache } from 'react';

import { prisma } from '@rhymix-ts/db';

export interface InstallStatus {
  installed: boolean;
  site: { id: number; installedAt: Date | null } | null;
  lockedAt?: Date;
}

async function readStatus(): Promise<InstallStatus> {
  const site = (await prisma.site.findFirst({
    where: { installedAt: { not: null } },
  })) as InstallStatus['site'];

  const envLocked = process.env.INSTALL_LOCK === '1';

  if (site) {
    return { installed: true, site };
  }
  if (envLocked) {
    // DB row missing but env still locked — defensive lock-out.
    return { installed: true, site: null, lockedAt: new Date() };
  }
  return { installed: false, site: null };
}

/** Per-request memoized accessor (Next.js App Router). */
export const getInstallStatus = cache(readStatus);
