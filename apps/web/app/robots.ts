/**
 * Next.js App Router robots.txt — SPEC-SEO-001 REQ-SEO-003, AC-SEO-003.
 *
 * 기본 규칙:
 *   User-agent: *
 *   Allow: /
 *   Disallow: /admin
 *   Disallow: /api
 *   Sitemap: {SITE_URL}/sitemap.xml
 *
 * 관리자 > 사이트 설정 > SEO 에서 robotsTxtCustomContent 가 설정된 경우,
 * 해당 내용을 파싱하여 규칙으로 반영한다 (REQ-SEO-003).
 *
 * @MX:SPEC SPEC-SEO-001 REQ-SEO-003
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getSeoSettings } from '@rhymix-ts/admin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * robots.txt 규칙을 생성한다.
 * Next.js 가 /robots.txt 에서 자동으로 텍스트로 직렬화한다.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettings({ prisma });
  const customContent = settings.robotsTxtCustomContent?.trim();

  if (customContent) {
    return parseCustomRobots(customContent, SITE_URL);
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

/**
 * 관리자가 입력한 raw robots.txt 텍스트를 MetadataRoute.Robots 구조로 파싱한다.
 * User-agent / Allow / Disallow / Sitemap 디렉티브를 인식한다.
 */
function parseCustomRobots(text: string, siteUrl: string): MetadataRoute.Robots {
  const lines = text.split('\n');
  const ruleGroups: Array<{
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }> = [];
  let current: {
    userAgent: string[];
    allow: string[];
    disallow: string[];
  } | null = null;
  let sitemap: string | undefined;

  const flushCurrent = () => {
    if (current && current.userAgent.length > 0) {
      ruleGroups.push({
        userAgent: current.userAgent.length === 1 ? current.userAgent[0]! : current.userAgent,
        allow: current.allow.length > 0 ? current.allow : undefined,
        disallow: current.disallow.length > 0 ? current.disallow : undefined,
      });
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'user-agent') {
      if (current && current.allow.length === 0 && current.disallow.length === 0) {
        // 연속된 User-agent 그룹 (같은 규칙 공유)
        current.userAgent.push(value);
      } else {
        flushCurrent();
        current = { userAgent: [value], allow: [], disallow: [] };
      }
    } else if (key === 'allow' && current) {
      current.allow.push(value);
    } else if (key === 'disallow' && current) {
      current.disallow.push(value);
    } else if (key === 'sitemap') {
      sitemap = value;
    }
  }
  flushCurrent();

  // 커스텀 내용에 Sitemap 라인이 없으면 기본 사이트맵 참조 추가.
  const resolvedSitemap = sitemap || `${siteUrl}/sitemap.xml`;

  return {
    rules: ruleGroups.length > 0 ? ruleGroups : { userAgent: '*' },
    sitemap: resolvedSitemap,
  };
}
