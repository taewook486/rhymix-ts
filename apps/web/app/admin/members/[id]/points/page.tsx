/**
 * 회원 포인트 관리 페이지 — SPEC-POINT-001 REQ-POINT-060.
 *
 * Server Component. 특정 회원의 포인트 잔액, 이력, 수동 조정 기능.
 * @MX:SPEC: SPEC-POINT-001 REQ-POINT-060
 */
import { notFound } from 'next/navigation';
import { prisma } from '@rhymix-ts/db';
import { PointService, getSitePointConfig } from '@rhymix-ts/point';
import { PointAdjustForm } from './PointAdjustForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberPointsPage({ params }: PageProps) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) notFound();

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, nickName: true, pointBalance: true },
  });
  if (!member) notFound();

  const svc = new PointService(prisma);
  const { items: history } = await svc.getHistory({ memberId, limit: 50 });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">포인트 관리 — {member.nickName}</h1>

      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">현재 잔액</p>
        <p className="text-3xl font-bold">{member.pointBalance.toLocaleString()} P</p>
      </div>

      <PointAdjustForm memberId={member.id} />

      <section>
        <h2 className="mb-2 text-lg font-semibold">이력 (최근 50건)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">일시</th>
              <th className="py-2 text-left">유형</th>
              <th className="py-2 text-right">변동</th>
              <th className="py-2 text-left">사유</th>
            </tr>
          </thead>
          <tbody>
            {(history as Array<{
              id: number;
              createdAt: Date;
              sourceType: string;
              amount: number;
              reason: string;
            }>).map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2">{row.createdAt.toLocaleString('ko-KR')}</td>
                <td className="py-2">{row.sourceType}</td>
                <td
                  className={`py-2 text-right ${
                    row.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {row.amount >= 0 ? '+' : ''}
                  {row.amount}
                </td>
                <td className="py-2">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
