/**
 * 수동 포인트 조정 API — SPEC-POINT-001 REQ-POINT-060.
 *
 * POST /admin/api/points/adjust
 *
 * @MX:SPEC: SPEC-POINT-001 REQ-POINT-060
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rhymix-ts/db';
import { PointService } from '@rhymix-ts/point';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { memberId, amount, reason } = body as {
      memberId: number;
      amount: number;
      reason: string;
    };

    if (!memberId || !Number.isInteger(amount) || !reason) {
      return NextResponse.json(
        { message: 'Invalid input' },
        { status: 400 }
      );
    }

    const svc = new PointService(prisma);

    if (amount > 0) {
      await svc.add({
        memberId,
        amount,
        reason,
        sourceType: 'MANUAL',
      });
    } else if (amount < 0) {
      await svc.subtract({
        memberId,
        amount: Math.abs(amount),
        reason,
        sourceType: 'MANUAL',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Point adjust error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
