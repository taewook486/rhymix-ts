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

export type { Prisma } from '@prisma/client';
export { PrismaClient } from '@prisma/client';

export {
  validateDbConnection,
  type DbValidationCode,
  type DbValidationIssue,
  type DbValidationResult,
  type ValidateOptions,
} from './install-validate';

// SPEC-INSTALL-001 REQ-INSTALL-053: advisory lock (procInstall 동시 실행 차단).
export { acquireInstallLock, type InstallLock } from './install/lock';

// SPEC-INSTALL-001 REQ-INSTALL-014, 015: 트랜잭션 시드.
export { seedInstall, type SeedInput, type SeedResult } from './install/seed';
