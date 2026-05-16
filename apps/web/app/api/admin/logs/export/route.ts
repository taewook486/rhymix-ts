/**
 * AdminLog CSV 내보내기 Route Handler — SPEC-ADMIN-001 Slice E-3.
 *
 * GET /api/admin/logs/export?actorId=&action=&target=&from=&to=
 * 관리자 세션 확인 후 AdminLog 를 CSV 로 스트리밍 반환한다.
 *
 * @MX:NOTE: [AUTO] CSV 내보내기는 tRPC 가 아닌 Route Handler 로 구현.
 *           tRPC 는 스트리밍 응답 + Content-Disposition 헤더 설정에 부적합하므로
 *           Next.js Route Handler 를 사용한다 (REQ-ADMIN-072).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-072
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@rhymix-ts/db';

export async function GET(req: NextRequest) {
  // 1. 세션 확인
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  // 2. isAdmin 확인
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user?.isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 3. 쿼리 파라미터 파싱
  const { searchParams } = new URL(req.url);
  const actorId = searchParams.get('actorId');
  const action = searchParams.get('action');
  const target = searchParams.get('target');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // 4. AdminLog 조회
  const logs = await prisma.adminLog.findMany({
    where: {
      ...(actorId ? { actorId: Number(actorId) } : {}),
      ...(action ? { action: { contains: action } } : {}),
      ...(target ? { target: { contains: target } } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  // 5. CSV 빌드
  const header = 'id,actorId,action,target,ip,userAgent,createdAt\n';
  const rows = logs
    .map((r) =>
      [
        String(r.id),
        r.actorId ?? '',
        r.action,
        r.target,
        r.ip ?? '',
        (r.userAgent ?? '').replace(/,/g, ';'),
        r.createdAt.toISOString(),
      ].join(','),
    )
    .join('\n');
  const csv = header + rows;

  // 6. 응답
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="admin-logs-${date}.csv"`,
    },
  });
}
