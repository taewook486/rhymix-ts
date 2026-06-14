'use server';

import { Prisma } from '@rhymix-ts/db';
import {
  getLayoutsForTheme as _getLayouts,
  getSkinsForLayout as _getSkins,
} from './admin-helpers';

export async function getLayoutsForTheme(
  themeId: string,
): Promise<Prisma.LayoutGetPayload<Record<string, never>>[]> {
  return _getLayouts(themeId);
}

export async function getSkinsForLayout(
  layoutId: string,
  themeId: string,
): Promise<Prisma.SkinGetPayload<Record<string, never>>[]> {
  return _getSkins(layoutId, themeId);
}
