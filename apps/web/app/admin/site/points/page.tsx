/**
 * 사이트 포인트 설정 페이지 — SPEC-POINT-001 REQ-POINT-062.
 *
 * Server Component. sitePointConfig 조회/수정.
 * @MX:SPEC: SPEC-POINT-001 REQ-POINT-062
 */
import { prisma } from '@rhymix-ts/db';
import { getSitePointConfig, setSitePointConfig } from '@rhymix-ts/point';
import { PointConfigForm } from './PointConfigForm';

export const dynamic = 'force-dynamic';

export default async function SitePointsPage() {
  const config = await getSitePointConfig(prisma);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">사이트 포인트 설정</h1>

      <PointConfigForm initialConfig={config} />
    </div>
  );
}
