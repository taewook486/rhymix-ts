// @vitest-environment jsdom
/**
 * ArticleJsonLd 컴포넌트 테스트 — SPEC-SEO-001 REQ-SEO-005
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ArticleJsonLd } from './ArticleJsonLd';

describe('ArticleJsonLd', () => {
  it('JSON-LD 스크립트를 렌더링한다', () => {
    const document = {
      title: '테스트 게시물',
      content: '본문 내용',
      regdate: new Date('2024-01-01T10:00:00Z'),
      lastUpdate: new Date('2024-01-02T11:00:00Z'),
      nickName: 'testuser',
    };
    const siteConfig = {
      title: 'Test Site',
      url: 'https://example.com',
    };

    const { container } = render(
      <ArticleJsonLd document={document} siteConfig={siteConfig} />,
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();

    const jsonLd = JSON.parse(script!.textContent || '{}');
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.headline).toBe('테스트 게시물');
    expect(jsonLd.datePublished).toBe('2024-01-01T10:00:00.000Z');
    expect(jsonLd.dateModified).toBe('2024-01-02T11:00:00.000Z');
    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      name: 'testuser',
    });
    expect(jsonLd.publisher).toEqual({
      '@type': 'Organization',
      name: 'Test Site',
    });
  });

  it('게시물 내용의 첫 160자를 description으로 사용한다', () => {
    const longContent = 'A'.repeat(200);
    const document = {
      title: '테스트',
      content: longContent,
      regdate: new Date('2024-01-01T10:00:00Z'),
      lastUpdate: new Date('2024-01-02T11:00:00Z'),
      nickName: 'testuser',
    };
    const siteConfig = {
      title: 'Test Site',
      url: 'https://example.com',
    };

    const { container } = render(
      <ArticleJsonLd document={document} siteConfig={siteConfig} />,
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script!.textContent || '{}');

    expect(jsonLd.description.length).toBeLessThanOrEqual(160);
    expect(jsonLd.description).toBe(longContent.slice(0, 160));
  });

  it('닉네임이 없으면 게스트로 처리한다', () => {
    const document = {
      title: '테스트',
      content: '내용',
      regdate: new Date('2024-01-01T10:00:00Z'),
      lastUpdate: new Date('2024-01-02T11:00:00Z'),
      nickName: null,
    };
    const siteConfig = {
      title: 'Test Site',
      url: 'https://example.com',
    };

    const { container } = render(
      <ArticleJsonLd document={document} siteConfig={siteConfig} />,
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script!.textContent || '{}');

    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      name: 'Guest',
    });
  });
});
