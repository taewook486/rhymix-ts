/**
 * 사이트 포인트 설정 API — SPEC-POINT-001 REQ-POINT-062.
 *
 * POST /admin/api/site/points/config
 *
 * @MX:SPEC: SPEC-POINT-001 REQ-POINT-062
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rhymix-ts/db';
import { setSitePointConfig } from '@rhymix-ts/point';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await setSitePointConfig(prisma, body);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Point config save error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
