/**
 * [mid] 동적 라우팅 페이지 — SPEC-ADMIN-001 Slice B.
 *
 * x-site-id 헤더에서 siteId 를 읽고, URL 파라미터 mid 로 모듈 인스턴스를 조회한다.
 * 인스턴스가 없으면 notFound() 를 호출한다.
 *
 * @MX:NOTE: [AUTO] 모든 모듈 인스턴스 페이지의 진입점.
 * @MX:TODO: [AUTO] Slice C 에서 def.routes.index(props) 위임으로 교체 예정.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-012
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getModuleInstanceByMid } from '@rhymix-ts/core/modules';
import { prisma } from '@/lib/db/prisma';

interface MidPageProps {
  params: Promise<{ mid: string }>;
}

export default async function MidPage({ params }: MidPageProps) {
  const { mid } = await params;
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    notFound();
  }

  const instance = await getModuleInstanceByMid(siteId, mid, { prisma });
  if (!instance) {
    notFound();
  }

  // Slice B placeholder — Slice C 에서 def.routes.index(...) 위임으로 교체.
  return (
    <main>
      <h1>{instance.name}</h1>
      <p>module={instance.moduleCode} mid={instance.mid}</p>
    </main>
  );
}
