/**
 * apps/web/app/tags/page.tsx — SPEC-TAG-001 (REQ-TAG-005)
 *
 * 전체 태그 목록 페이지 (태그 클라우드)
 *
 * @MX:SPEC: SPEC-TAG-001 REQ-TAG-005
 */
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

/**
 * REQ-TAG-005: 전체 태그 목록 페이지
 */
export default async function TagsPage() {
  const h = await headers();
  const siteIdStr = h.get('x-site-id');
  const siteId = siteIdStr != null ? Number(siteIdStr) : NaN;

  if (!Number.isFinite(siteId) || siteId <= 0) {
    notFound();
  }

  // 전체 태그 목록 조회
  const tags = await prisma.tag.findMany({
    orderBy: [
      { count: 'desc' },
      { name: 'asc' },
    ],
  });

  // 폰트 크기 계산을 위한 최대/최소값
  const maxCount = Math.max(...tags.map((t) => t.count), 1);
  const minCount = Math.min(...tags.map((t) => t.count), 0);

  function getFontSize(count: number): number {
    if (maxCount === minCount) {
      return 16; // 기본 크기
    }
    const minFontSize = 12;
    const maxFontSize = 32;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minFontSize + ratio * (maxFontSize - minFontSize);
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">태그 클라우드</h1>
      <p className="text-gray-600 text-sm mb-6">
        전체 <strong>{tags.length}</strong>개의 태그
      </p>

      {tags.length === 0 ? (
        <p className="text-gray-500">등록된 태그가 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-3 p-6 bg-gray-50 dark:bg-gray-800 rounded">
          {tags.map((tag) => {
            const fontSize = getFontSize(tag.count);
            return (
              <Link
                key={tag.id}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                className="inline-block hover:underline transition-all text-blue-600 dark:text-blue-400"
                style={{
                  fontSize: `${fontSize}px`,
                  opacity: 0.6 + (tag.count / maxCount) * 0.4,
                }}
              >
                #{tag.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Link href="/admin/tags" className="text-sm text-blue-600 hover:underline">
          ← 관리자 페이지에서 태그 관리
        </Link>
      </div>
    </div>
  );
}
