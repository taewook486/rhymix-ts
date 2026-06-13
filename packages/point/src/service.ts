// SPEC-POINT-001 REQ-POINT-003: PointService 핵심 로직
// @MX:ANCHOR (fan_in: 4) — add, subtract, getBalance, recompute 모두 이 클래스를 호출

import type { PrismaClient, Prisma } from '@prisma/client';
import { PointAmountInvalidError, PointMemberNotFoundError } from './errors';
import type { PointAddInput, PointHistoryQuery } from './schemas';
import { getSitePointConfig } from './config';

function encodeCursor(createdAt: Date, id: number): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: number } {
  const { createdAt, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  return { createdAt: new Date(createdAt), id };
}

export class PointService {
  constructor(private prisma: PrismaClient) {}

  private db(tx?: Prisma.TransactionClient): PrismaClient | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  // @MX:ANCHOR (fan_in: 3) — document.create, comment.create, signup.bonus 모두 호출
  async add(input: PointAddInput, tx?: Prisma.TransactionClient): Promise<number> {
    // amount validation
    if (!Number.isInteger(input.amount) || !Number.isFinite(input.amount)) {
      throw new PointAmountInvalidError(input.amount);
    }
    if (input.amount === 0) {
      return this.getBalance(input.memberId);
    }

    const db = this.db(tx);

    // member existence check
    const member = await db.user.findUnique({
      where: { id: input.memberId },
      select: { id: true, pointBalance: true },
    });
    if (!member) throw new PointMemberNotFoundError(input.memberId);

    // idempotency check (REQ-POINT-004)
    if (input.sourceId != null) {
      const existing = await db.point.findFirst({
        where: { sourceType: input.sourceType as never, sourceId: input.sourceId },
        select: { id: true },
      });
      if (existing) {
        return member.pointBalance;
      }
    }

    // Create point row + update balance
    await db.point.create({
      data: {
        memberId: input.memberId,
        amount: input.amount,
        reason: input.reason,
        sourceType: input.sourceType as never,
        sourceId: input.sourceId ?? null,
        boardId: input.boardId ?? null,
      },
    });

    const updated = await db.user.update({
      where: { id: input.memberId },
      data: { pointBalance: { increment: input.amount } },
      select: { pointBalance: true },
    });

    return updated.pointBalance;
  }

  // @MX:ANCHOR (fan_in: 2) — purchase, file.upload 등에서 호출
  async subtract(
    input: Omit<PointAddInput, 'amount'> & { amount: number },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    if (!Number.isInteger(input.amount) || !Number.isFinite(input.amount)) {
      throw new PointAmountInvalidError(input.amount);
    }
    if (input.amount === 0) {
      return this.getBalance(input.memberId);
    }

    const db = this.db(tx);

    const member = await db.user.findUnique({
      where: { id: input.memberId },
      select: { id: true, pointBalance: true },
    });
    if (!member) throw new PointMemberNotFoundError(input.memberId);

    // @MX:NOTE (REQ-POINT-005) — clampToZero 설정에 따른 차감 로직
    const config = await getSitePointConfig(this.prisma as PrismaClient);

    let actualAmount = input.amount;
    let reason = input.reason;

    if (!config.allowNegativeBalance) {
      const currentBalance = member.pointBalance;
      if (actualAmount > currentBalance) {
        actualAmount = currentBalance;
        reason = `${reason} (clamped from ${input.amount})`;
      }
    }

    await db.point.create({
      data: {
        memberId: input.memberId,
        amount: -actualAmount,
        reason,
        sourceType: input.sourceType as never,
        sourceId: input.sourceId ?? null,
        boardId: input.boardId ?? null,
      },
    });

    const updated = await db.user.update({
      where: { id: input.memberId },
      data: { pointBalance: { decrement: actualAmount } },
      select: { pointBalance: true },
    });

    return updated.pointBalance;
  }

  // @MX:ANCHOR (fan_in: 3) — admin UI, 포인트 조회, 차감 전 확인
  async getBalance(memberId: number): Promise<number> {
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { pointBalance: true },
    });
    if (!member) throw new PointMemberNotFoundError(memberId);
    return member.pointBalance;
  }

  // @MX:ANCHOR (fan_in: 2) — admin UI, user profile
  async getHistory(query: PointHistoryQuery): Promise<{ items: unknown[]; nextCursor: string | null }> {
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { memberId: query.memberId };
    if (query.sourceType) where.sourceType = query.sourceType;

    if (query.cursor) {
      const { createdAt, id } = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ];
    }

    const items = await this.prisma.point.findMany({
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

  // REQ-POINT-007 (Phase 3 stub — 항상 level 1 반환)
  async getLevel(_memberId: number): Promise<{ level: number; name: string; iconUrl: null; threshold: number }> {
    return { level: 1, name: 'default', iconUrl: null, threshold: 0 };
  }

  // @MX:ANCHOR (fan_in: 2) — admin manual fix, 데이터 정합성 검사
  async recompute(memberId: number, tx?: Prisma.TransactionClient): Promise<number> {
    const db = this.db(tx);

    const result = await db.point.aggregate({
      where: { memberId },
      _sum: { amount: true },
    });

    const newBalance = result._sum.amount ?? 0;

    await db.user.update({
      where: { id: memberId },
      data: { pointBalance: newBalance },
    });

    return newBalance;
  }
}

export function createPointService(prisma: PrismaClient): PointService {
  return new PointService(prisma);
}
