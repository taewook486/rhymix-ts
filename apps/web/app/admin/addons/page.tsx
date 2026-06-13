import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { prisma } from '@rhymix-ts/db';
import { listAllAddonsWithConfig } from '@rhymix-ts/core/addons';
import AddonsClient from './AddonsClient';

/**
 * 관리자 애드온 페이지 — REQ-ADDON-050
 *
 * 등록된 모든 애드온 목록을 표시하고 활성/비활성 토글, priority 변경 기능을 제공한다.
 */
export default async function AdminAddonsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect('/login');

  // 관리자 페이지는 비활성화된 애드온도 포함하여 전체 목록을 표시한다 (REQ-ADDON-050)
  const addons = await listAllAddonsWithConfig(prisma);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">애드온 관리</h1>

      <AddonsClient addons={addons} />
    </div>
  );
}
