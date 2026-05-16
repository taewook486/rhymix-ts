/**
 * 홈 페이지 — SPEC-ADMIN-001 Slice B.
 *
 * x-domain-id 헤더에서 domainId 를 읽고, Domain.indexModuleInstanceId 로
 * 인덱스 모듈 인스턴스의 mid 를 조회한 뒤 redirect 한다.
 *
 * 설정 미완료 시나리오 (헤더 없음 / indexModuleInstance 없음) 는 welcome 화면 표시.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-013
 */
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';

export default async function RootPage() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  if (!Number.isFinite(domainId) || domainId <= 0) {
    // 설치 미완 또는 호스트 매칭 실패
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Rhymix-TS</h1>
        <p className="mt-4 text-lg">
          TypeScript + Next.js 16 redesign of Rhymix CMS.
        </p>
        <p className="mt-2 text-sm">
          Status: <strong>scaffolded — install pending</strong>.
        </p>
      </main>
    );
  }

  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      indexModuleInstance: { select: { mid: true } },
    },
  });

  if (domain?.indexModuleInstance?.mid) {
    redirect(`/${domain.indexModuleInstance.mid}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Rhymix-TS</h1>
      <p className="mt-4 text-lg">사이트 인덱스 모듈이 설정되지 않았습니다.</p>
    </main>
  );
}
