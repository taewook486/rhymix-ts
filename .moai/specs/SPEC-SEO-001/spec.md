---
id: SPEC-SEO-001
title: SEO 기반 구축 — sitemap.xml / robots.txt / Open Graph / JSON-LD
version: 1.0.0
status: in-progress
created: 2026-06-27
updated: 2026-07-19
author: MoAI gap-analysis
priority: P2
phase: 5
parent: MASTER-PLAN-002
depends-on:
  - SPEC-DOCUMENT-001
  - SPEC-BOARD-UI-001
issue_number: TBD
language: ko
---

# SPEC-SEO-001 — SEO 기반 구축 (Phase 5 / P2)

## HISTORY

- 2026-06-27 (v1.0.0): 최초 작성. 레거시 Rhymix는 sitemap 모듈과 SEO 설정으로 검색 엔진 최적화를 지원. 뉴버전은 Next.js App Router를 사용하므로 Metadata API, sitemap.ts, robots.ts로 네이티브 구현이 가능하다. 현재 SEO 관련 구현이 전혀 없어 신규 작성.

---

## 1. Goal & Audience

### 1.1 Goal

**검색 엔진이 뉴버전 사이트를 올바르게 크롤링하고 인덱싱할 수 있다**:

- Next.js Metadata API로 페이지별 title/description/OG 태그를 설정한다.
- `/sitemap.xml` — 동적으로 생성되는 사이트맵 (게시물 목록 포함).
- `/robots.txt` — 크롤러 규칙 (관리자에서 편집 가능).
- 게시물 상세 페이지에 JSON-LD 구조화 데이터를 삽입한다.
- 관리자 설정에서 사이트 전역 SEO 설정을 관리한다.

### 1.2 Non-Goals

- Google Search Console / Naver Search Advisor API 연동 — 외부 서비스
- A/B 테스트 SEO — 범위 외
- AMP 페이지 — 현대 웹에서 불필요

---

## 2. Requirements

### REQ-SEO-001: 동적 Metadata

```
THE SYSTEM SHALL 각 페이지 유형에 대해 Next.js generateMetadata()를 구현한다:
  - 게시판 목록: title="{게시판명} | {사이트명}", description=게시판 소개
  - 게시물 상세: title="{제목} | {사이트명}", description=본문 첫 160자, og:image=첫 이미지
  - 사용자 프로필: title="{닉네임} | {사이트명}"
  - 검색 결과: title="'{검색어}' 검색 결과 | {사이트명}"
```

### REQ-SEO-002: sitemap.xml

```
THE SYSTEM SHALL /sitemap.xml 을 Next.js sitemap.ts로 구현한다
AND 정적 라우트: /, /login, /signup, /search
AND 동적 라우트: 각 게시판 /{mid}, 각 게시물 /{mid}/{id} (최대 50,000개)
AND 게시물 lastmod를 updatedAt 컬럼으로 설정한다
AND changefreq: daily (게시판), weekly (게시물)
AND 사이트맵 크기 초과 시 sitemap index로 분할한다 (50,000개 초과)
```

### REQ-SEO-003: robots.txt

```
THE SYSTEM SHALL /robots.txt 를 제공한다
AND 기본 내용:
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /api
  Sitemap: {SITE_URL}/sitemap.xml
AND 관리자 > 사이트 설정 > SEO에서 robots.txt 내용을 직접 편집할 수 있다
```

### REQ-SEO-004: Open Graph + Twitter Card

```
WHEN 게시물 상세 페이지가 SNS에 공유될 때
THE SYSTEM SHALL 다음 meta 태그를 생성한다:
  og:title, og:description, og:image, og:url, og:type=article
  twitter:card=summary_large_image
  article:published_time, article:modified_time, article:author
```

### REQ-SEO-005: JSON-LD 구조화 데이터

```
THE SYSTEM SHALL 게시물 상세 페이지 <head>에 JSON-LD를 삽입한다:
  @type: "Article"
  headline: 제목
  datePublished, dateModified
  author: { @type: "Person", name: 닉네임 }
  publisher: { @type: "Organization", name: 사이트명 }
```

### REQ-SEO-006: 관리자 SEO 설정

```
THE SYSTEM SHALL 관리자 > 사이트 설정 > SEO 탭에서:
  - 사이트 기본 설명 (description meta 태그용)
  - 기본 OG 이미지 URL
  - Google Analytics ID (UA-/G-) — 자동으로 <Script> 삽입
  - Naver 사이트 인증 코드
  - robots.txt 직접 편집 영역
을 제공한다
```

---

## 3. Acceptance Criteria

| AC ID | 기준 |
|---|---|
| AC-SEO-001 | /board/1 에서 view-source 시 og:title에 게시물 제목이 포함된다 |
| AC-SEO-002 | /sitemap.xml 접속 시 유효한 XML 사이트맵이 반환된다 |
| AC-SEO-003 | /robots.txt 접속 시 Disallow: /admin 을 포함한 규칙이 반환된다 |
| AC-SEO-004 | 게시물 상세 페이지 소스에 JSON-LD Article 스키마가 존재한다 |
| AC-SEO-005 | 관리자에서 기본 설명 변경 시 홈페이지 meta description에 반영된다 |
| AC-SEO-006 | Google Analytics ID 입력 시 모든 페이지에 GA 스크립트가 삽입된다 |

---

## 4. Technical Approach

### Next.js 구현 파일

```
apps/web/app/
├── sitemap.ts                  # 동적 sitemap.xml
├── robots.ts                   # robots.txt
├── layout.tsx                  # 전역 metadata 기본값
└── [mid]/[id]/page.tsx         # generateMetadata() 구현
```

### 구조화 데이터 컴포넌트

```typescript
// apps/web/components/seo/ArticleJsonLd.tsx
export function ArticleJsonLd({ document }: { document: Document }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: document.title,
    // ...
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
```
