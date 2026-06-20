/**
 * 알림 Server Actions — SPEC-NOTIFICATION-001 Slice A.
 *
 * (member)/notifications 페이지와 GlobalHeader의 NotificationBell이 공유한다.
 *
 * @MX:SPEC: SPEC-NOTIFICATION-001 REQ-NOTIF-023, REQ-NOTIF-024
 */
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { createNotificationService } from '@rhymix-ts/notification';

function resolveUserId(userId: string | number): number {
  return typeof userId === 'string' ? Number.parseInt(userId, 10) : userId;
}

export async function markOneRead(notificationId: number): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/notifications');
  }

  const userId = resolveUserId(session.user.id);
  const notificationService = createNotificationService(prisma);

  try {
    await notificationService.markRead({
      notificationId,
      actorMemberId: userId,
    });
  } catch (error) {
    // NotificationForbiddenError 또는 NotificationRecipientNotFoundError
    // 무시하고 사용자에게 피드백을 제공하지 않음 (보안: 존재 여부 노출 방지)
    console.error('Failed to mark notification as read:', error);
  }

  revalidatePath('/notifications');
}

export async function markAllRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/notifications');
  }

  const userId = resolveUserId(session.user.id);
  const notificationService = createNotificationService(prisma);
  await notificationService.markAllRead({ recipientId: userId });

  revalidatePath('/notifications');
}
