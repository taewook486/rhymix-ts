// SPEC-NOTIFICATION-001 REQ-NOTIF-001: NotificationService 핵심 로직
// @MX:ANCHOR (fan_in: 3) — list, markRead, markAllRead 모두 이 클래스를 호출

import type { PrismaClient, Prisma, Notification } from '@prisma/client';
import {
  NotificationRecipientNotFoundError,
  NotificationForbiddenError,
} from './errors';
import type {
  NotificationCreateInput,
  NotificationListInput,
  NotificationMarkReadInput,
  NotificationMarkAllReadInput,
  NotificationCountUnreadInput,
  NotificationPreferenceUpsertInput,
} from './schemas';

// cursor encoding/decoding (PointService 패턴 참조)
function encodeCursor(createdAt: Date, id: number): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: number } {
  const { createdAt, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  return { createdAt: new Date(createdAt), id };
}

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  private db(tx?: Prisma.TransactionClient): PrismaClient | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  /**
   * 전역 알림 게이트용 SiteSetting 조회 (fail-open).
   *
   * SiteSetting의 실제 unique 제약은 siteId+key 복합키(siteId_key)이므로
   * key 단독 조회가 불가능하다 — 먼저 siteId를 해석해야 한다
   * (apps/web/server/api/routers/admin/settings.ts의 resolveSiteId와 동일 패턴,
   * 이 코드베이스는 사실상 단일 사이트 운영을 전제하므로 멀티테넌트 siteId
   * 스레딩은 여기서 다루지 않는다).
   *
   * @MX:NOTE: [M6 sync-audit F1] 사이트 미해석(Site 행 없음) 또는 조회 자체가
   *   실패(DB 미가용 등)하면 null을 반환해 "설정 없음"과 동일하게 취급한다
   *   (기본값 all-enabled). 이 게이트는 알림 발송을 보조적으로 억제하는
   *   기능이지 필수 관문이 아니므로, 게이트 조회 실패가 실제 알림 발송을
   *   막아서는 안 된다 — apps/web/server/api/trpc.ts의
   *   enforceAdminAccessControl "설정 조회 자체가 실패하면 fail-open" 관례와
   *   동일 원칙을 적용한다.
   */
  private async resolveGlobalEventsSetting(
    db: PrismaClient | Prisma.TransactionClient,
  ): Promise<{ value: Prisma.JsonValue } | null> {
    try {
      const site = await db.site.findFirst({ orderBy: { id: 'asc' } });
      if (!site) {
        return null;
      }
      return await db.siteSetting.findUnique({
        where: { siteId_key: { siteId: site.id, key: 'notification.globalEvents' } },
      });
    } catch {
      return null; // 조회 실패 → fail-open
    }
  }

  /**
   * REQ-NOTIF-002/003/004/008: 알림 생성
   * - self-notification 제외 (actor === recipient)
   * - 전역 알림 게이트 (REQ-CPAR-027: 전역 비활성 시 억제, 개인 설정보다 우선)
   * - preference 게이트 (disabled 카테고리는 생성하지 않음)
   * - 탈퇴/비활성 회원에 대한 알림 생성 건너뜀 (REQ-NOTIF-005 + EC-3)
   *
   * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-026~028
   * @MX:REASON: [M6] 전역 알림 게이트는 create() 진입부에서 검사하며,
   *   SiteSetting 조회는 고빈도 경로이므로 향후 요청 단위 memoize 검토 필요
   *
   * @returns 생성된 알림 ID 또는 skip 시 undefined
   */
  async create(input: NotificationCreateInput, tx?: Prisma.TransactionClient): Promise<number | undefined> {
    const db = this.db(tx);

    // REQ-CPAR-027: 전역 알림 게이트 (개인 preference보다 우선)
    // @MX:NOTE: SiteSetting 조회는 고빈도 경로이므로 요청 단위로 memoize 검토 필요
    // SiteSetting에서 'notification.globalEvents' 키로 저장된 설정 조회 (siteId+key 복합키, fail-open)
    const globalEventsSetting = await this.resolveGlobalEventsSetting(db);

    // 기본값: 모든 이벤트 활성 (true)
    const globalEvents = (globalEventsSetting?.value as { comment?: boolean; reply?: boolean; mention?: boolean; message?: boolean }) ?? {
      comment: true,
      reply: true,
      mention: true,
      message: true,
    };

    // 카테고리별 전역 활성/비활성 체크
    const categoryEnabled = (() => {
      switch (input.category) {
        case 'COMMENT':
          return globalEvents.comment ?? true;
        case 'COMMENT_REPLY':
          return globalEvents.reply ?? true;
        case 'MENTION':
          return globalEvents.mention ?? true;
        case 'MESSAGE':
          return globalEvents.message ?? true;
        default:
          return true;
      }
    })();

    // 전역 비활성 시 즉시 skip (개인 설정보다 우선)
    if (!categoryEnabled) {
      return undefined;
    }

    // REQ-NOTIF-004: self-notification 제외
    if (input.actorId === input.recipientId) {
      return undefined;
    }

    // REQ-NOTIF-008: preference 게이트 (disabled 카테고리는 skip)
    // REQ-NOTIF-032: preference 행이 없으면 enabled=true (opt-out 모델)
    const preference = await db.notificationPreference.findUnique({
      where: {
        memberId_category: {
          memberId: input.recipientId,
          category: input.category,
        },
      },
    });

    if (preference && !preference.enabled) {
      return undefined;
    }

    // EC-3: 탈퇴/비활성 회원 확인 (건너뜀, 에러 아님)
    const recipient = await db.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true },
    });

    if (!recipient) {
      return undefined;
    }

    // 중복 알림 방지 (동일 sourceType+sourceId+recipientId)
    const existing = await db.notification.findUnique({
      where: {
        sourceType_sourceId_recipientId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          recipientId: input.recipientId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const notification = await db.notification.create({
      data: {
        recipientId: input.recipientId,
        category: input.category,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        actorId: input.actorId,
        actorNickname: input.actorNickname,
      },
    });

    return notification.id;
  }

  /**
   * REQ-NOTIF-020: 알림 목록 조회 (본인만, 최신순)
   */
  async list(query: NotificationListInput): Promise<{ items: Notification[]; nextCursor: string | null }> {
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { recipientId: query.recipientId };

    if (query.cursor) {
      const { createdAt, id } = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ];
    }

    const items = await this.prisma.notification.findMany({
      where: where as never,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      items.pop();
      const last = items[items.length - 1];
      if (last) {
        nextCursor = encodeCursor(last.createdAt, last.id);
      }
    }

    return { items, nextCursor };
  }

  /**
   * REQ-NOTIF-023: 단일 알림 읽음 처리 (본인만)
   * REQ-NOTIF-021: 회원 간 격리 (actor가 recipient가 아니면 거부)
   */
  async markRead(input: NotificationMarkReadInput): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: input.notificationId },
      select: { recipientId: true },
    });

    if (!notification) {
      throw new NotificationRecipientNotFoundError(input.notificationId);
    }

    // REQ-NOTIF-021: 본인 확인
    if (notification.recipientId !== input.actorMemberId) {
      throw new NotificationForbiddenError('Cannot mark another member\'s notification as read');
    }

    await this.prisma.notification.update({
      where: { id: input.notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * REQ-NOTIF-024: 전체 읽음 처리 (본인의 미읽음 알림만)
   */
  async markAllRead(input: NotificationMarkAllReadInput): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: input.recipientId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * REQ-NOTIF-025: 미읽음 카운트 조회
   */
  async countUnread(query: NotificationCountUnreadInput): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        recipientId: query.recipientId,
        read: false,
      },
    });

    return count;
  }

  /**
   * REQ-NOTIF-033: preference upsert (카테고리별 on/off)
   */
  async upsertPreference(input: NotificationPreferenceUpsertInput, tx?: Prisma.TransactionClient): Promise<void> {
    const db = this.db(tx);

    // 멤버 존재 확인
    const member = await db.user.findUnique({
      where: { id: input.memberId },
      select: { id: true },
    });

    if (!member) {
      throw new NotificationRecipientNotFoundError(input.memberId);
    }

    // 각 카테고리별로 upsert
    for (const pref of input.preferences) {
      await db.notificationPreference.upsert({
        where: {
          memberId_category: {
            memberId: input.memberId,
            category: pref.category,
          },
        },
        create: {
          memberId: input.memberId,
          category: pref.category,
          enabled: pref.enabled,
        },
        update: {
          enabled: pref.enabled,
        },
      });
    }
  }
}

export function createNotificationService(prisma: PrismaClient): NotificationService {
  return new NotificationService(prisma);
}
