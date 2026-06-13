import type { PrismaClient } from '@prisma/client';
import { PointSiteConfigSchema, type PointSiteConfig } from './schemas.js';

// 항상 id=1인 단일 행을 upsert
export async function getSitePointConfig(prisma: PrismaClient): Promise<PointSiteConfig> {
  const row = await prisma.sitePointConfig.findUnique({ where: { id: 1 } });
  if (!row) return PointSiteConfigSchema.parse({});
  return PointSiteConfigSchema.parse({
    signupBonus: row.signupBonus,
    clampToZero: row.clampToZero,
    allowNegativeBalance: row.allowNegativeBalance,
    defaultLevel: row.defaultLevel,
  });
}

export async function setSitePointConfig(
  prisma: PrismaClient,
  config: Partial<PointSiteConfig>,
): Promise<PointSiteConfig> {
  const current = await getSitePointConfig(prisma);
  const merged = PointSiteConfigSchema.parse({ ...current, ...config });
  await prisma.sitePointConfig.upsert({
    where: { id: 1 },
    update: merged,
    create: { id: 1, ...merged },
  });
  return merged;
}
