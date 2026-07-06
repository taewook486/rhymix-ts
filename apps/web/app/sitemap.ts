/**
 * Next.js App Router 동적 sitemap — SPEC-SEO-001 REQ-SEO-002, AC-SEO-002.
 *
 * 정적 라우트 + 게시판(/{mid}) + 게시물(/{mid}/{id}) 을 포함한다.
 * 게시물은 최대 50,000개까지 lastUpdate 내림차순으로 포함한다.
 * 관리자 설정에서 sitemapEnabled 가 false 면 빈 배열을 반환한다.
 *
 * @MX:SPEC SPEC-SEO-001 REQ-SEO-002
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getSeoSettings } from '@rhymix-ts/admin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITEMAP_MAX_ENTRIES = 50000;

/**
 * sitemap.xml 엔트리를 생성한다.
 * Next.js 가 /sitemap.xml 에서 자동으로 XML 로 직렬화한다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSeoSettings({ prisma });

  // @MX:NOTE: [AUTO] 관리자가 sitemap 비활성화하면 빈 sitemap 반환 (REQ-SEO-002).
  if (!settings.sitemapEnabled) {
    return [];
  }

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // 정적 라우트
  const staticRoutes = ['/', '/login', '/signup', '/search'];
  for (const path of staticRoutes) {
    entries.push({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: path === '/' ? 1.0 : 0.8,
    });
  }

  // 게시판 라우트 (/{mid}) — changefreq: daily
  const boards = await prisma.board.findMany({
    select: {
      updatedAt: true,
      moduleInstance: { select: { mid: true } },
    },
  });

  for (const board of boards) {
    const mid = board.moduleInstance?.mid;
    if (!mid) continue;
    entries.push({
      url: `${SITE_URL}/${mid}`,
      lastModified: board.updatedAt,
      changeFrequency: 'daily',
      priority: 0.9,
    });
  }

  // 게시물 라우트 (/{mid}/{id}) — changefreq: weekly, lastmod from lastUpdate
  // @MX:WARN: [AUTO] 50,000개 제한 — 초과 시 별도 sitemap index 파일 필요.
  // @MX:REASON: 단일 sitemap.ts 로는 50,000 엔트리까지만 처리한다.
  //             초과분은 향후 sitemap1.ts / sitemap2.ts 분할로 지원 예정.
  const remainingCapacity = Math.max(0, SITEMAP_MAX_ENTRIES - entries.length);
  if (remainingCapacity > 0) {
    const documents = await prisma.document.findMany({
      where: {
        status: 'PUBLIC',
        deletedAt: null,
      },
      select: {
        id: true,
        lastUpdate: true,
        board: {
          select: {
            moduleInstance: { select: { mid: true } },
          },
        },
      },
      orderBy: { lastUpdate: 'desc' },
      take: remainingCapacity,
    });

    for (const doc of documents) {
      const mid = doc.board?.moduleInstance?.mid;
      if (!mid) continue;
      entries.push({
        url: `${SITE_URL}/${mid}/${doc.id}`,
        lastModified: doc.lastUpdate,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
