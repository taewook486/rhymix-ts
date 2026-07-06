/**
 * ArticleJsonLd 컴포넌트 — SPEC-SEO-001 REQ-SEO-005
 *
 * JSON-LD 구조화 데이터를 게시물 상세 페이지 <head>에 삽입한다.
 * @type: "Article"
 * headline: 제목
 * datePublished, dateModified
 * author: { @type: "Person", name: 닉네임 }
 * publisher: { @type: "Organization", name: 사이트명 }
 *
 * @MX:SPEC SPEC-SEO-001 REQ-SEO-005
 * @MX:NOTE 이 컴포넌트는 apps/web/app/[mid]/[id]/page.tsx에서 사용됩니다.
 *       SPEC-TAG-001 팀이 해당 파일을 소유하므로 직접 수정하지 말고,
 *       팀 리더에게 통합 준비 완료를 알려주십시오.
 */
import React from 'react';

interface Document {
  title: string;
  content: string;
  regdate: Date;
  lastUpdate: Date;
  nickName: string | null;
}

interface SiteConfig {
  title: string;
  url: string;
}

interface ArticleJsonLdProps {
  document: Document;
  siteConfig: SiteConfig;
}

/**
 * JSON-LD Article 스키마를 렌더링하는 컴포넌트
 *
 * @param document - 게시물 정보
 * @param siteConfig - 사이트 설정
 */
export function ArticleJsonLd({ document, siteConfig }: ArticleJsonLdProps) {
  // 본문의 첫 160자를 description으로 사용
  const description = document.content.slice(0, 160);

  // 닉네임이 없으면 게스트로 처리
  const authorName = document.nickName || 'Guest';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: document.title,
    description,
    datePublished: document.regdate.toISOString(),
    dateModified: document.lastUpdate.toISOString(),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.title,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': siteConfig.url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
