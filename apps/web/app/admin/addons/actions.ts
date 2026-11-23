'use server';

import { adminServerActionCheck } from '@/lib/auth/admin-guard';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@rhymix-ts/db';
import {
  toggleAddon as coreToggleAddon,
  setAddonPriority as coreSetAddonPriority,
} from '@rhymix-ts/core/addons';

/**
 * Addon 활성/비활성 토글 Server Action — REQ-ADDON-051
 *
 * 관리자 권한 검사 후 addon의 활성 상태를 토글하고 AdminLog를 기록한다.
 */
export async function toggleAddonAction(
  name: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const guard = await adminServerActionCheck();
  if (!guard.ok) {
    redirect('/login');
  }

  try {
    await coreToggleAddon(name, enabled, prisma);
    revalidatePath('/admin/addons');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Addon priority 변경 Server Action — REQ-ADDON-052
 *
 * 관리자 권한 검사 후 addon의 실행 순서(priority)를 변경하고 AdminLog를 기록한다.
 */
export async function reorderAddonAction(
  name: string,
  priority: number
): Promise<{ success: boolean; error?: string }> {
  const guard = await adminServerActionCheck();
  if (!guard.ok) {
    redirect('/login');
  }

  try {
    await coreSetAddonPriority(name, priority, prisma);
    revalidatePath('/admin/addons');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
