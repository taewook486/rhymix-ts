'use server';

import { Prisma } from '@rhymix-ts/db';
import { assertAdminServerAction } from '@/lib/auth/admin-guard';
import {
  getLayoutsForTheme as _getLayouts,
  getSkinsForLayout as _getSkins,
} from './admin-helpers';

export async function getLayoutsForTheme(
  themeId: string,
): Promise<Prisma.LayoutGetPayload<Record<string, never>>[]> {
  // D-7: 관리자 화면(사이트 디자인) 전용 — 가드 없이 DB 를 읽던 것을 관리자 가드 뒤로 옮긴다.
  await assertAdminServerAction();
  return _getLayouts(themeId);
}

export async function getSkinsForLayout(
  layoutId: string,
  themeId: string,
): Promise<Prisma.SkinGetPayload<Record<string, never>>[]> {
  await assertAdminServerAction();
  return _getSkins(layoutId, themeId);
}
