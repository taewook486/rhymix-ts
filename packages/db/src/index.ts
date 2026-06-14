import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// SPEC-AUTH-001 Slice D2: Prisma 는 타입과 런타임 (tagged template `Prisma.sql`) 모두 사용되므로
// `import { Prisma } from '@prisma/client'` 를 그대로 재내보낸다.
export { Prisma, PrismaClient } from '@prisma/client';

// SPEC-INSTALL-001 REQ-INSTALL-053: advisory lock (procInstall 동시 실행 차단).
export { acquireInstallLock, type InstallLock } from './install/lock';

// SPEC-INSTALL-001 REQ-INSTALL-014, 015: 트랜잭션 시드.
export { seedInstall, type SeedInput, type SeedResult } from './install/seed';
