/**
 * 글로벌 헤더 — 도메인 기본 메뉴를 읽어 GNB를 렌더링하는 Server Component.
 */
import Link from 'next/link';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { DarkModeToggle } from '@/components/theme/DarkModeToggle';

export async function GlobalHeader() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  if (!Number.isFinite(domainId) || domainId <= 0) return null;

  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { defaultMenuId: true },
  });

  const items = domain?.defaultMenuId
    ? await prisma.menuItem.findMany({
        where: { menuId: domain.defaultMenuId, parentId: null },
        orderBy: { listOrder: 'asc' },
        select: { id: true, title: true, url: true },
      })
    : [];

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="mx-auto max-w-6xl flex items-center gap-6 px-6 py-3">
        <Link href="/" className="text-lg font-bold text-blue-700 shrink-0">
          Rhymix-TS
        </Link>
        <nav aria-label="주 메뉴">
          <ul className="flex gap-4">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.url ?? '#'}
                  className="text-sm text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <DarkModeToggle />
          <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
