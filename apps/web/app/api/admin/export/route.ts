/**
 * 사이트 설정 내보내기 Route Handler — SPEC-ADMIN-001 Slice H-1.
 *
 * GET /api/admin/export
 * 관리자 세션 확인 후 Site/Domain/Menu/ModuleInstance 를 JSON 번들로 반환한다.
 *
 * @MX:NOTE: [AUTO] BigInt(AdminLog.id 등)는 JSON.stringify 에서 직렬화 오류 발생.
 *           BigInt replacer 를 적용한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-080
 */
import { auth } from '@/lib/auth/config';
import { prisma } from '@rhymix-ts/db';

// BigInt 직렬화 replacer
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export async function GET(req: Request): Promise<Response> {
  // 1. 세션 확인
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  // 2. 관리자 권한 확인
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // 3. 데이터 수집
  const [site, domains, menus, moduleInstances] = await Promise.all([
    prisma.site.findFirst({ orderBy: { id: 'asc' } }),
    prisma.domain.findMany({ orderBy: { id: 'asc' } }),
    prisma.menu.findMany({
      orderBy: { id: 'asc' },
      include: { items: { orderBy: { listOrder: 'asc' } } },
    }),
    prisma.moduleInstance.findMany({ orderBy: { id: 'asc' } }),
  ]);

  // 4. 번들 생성
  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    site,
    domains,
    menus,
    moduleInstances,
  };

  // 5. 응답
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(bundle, bigIntReplacer), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="rhymix-export-${date}.json"`,
    },
  });
}
