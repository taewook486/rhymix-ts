/**
 * build-feed.test.ts — SPEC-FEED-001 Slice A (T-004)
 *
 * buildFeed() 공유 빌더 검증 — RSS 2.0 / Atom 1.0 매핑, full-vs-excerpt, 날짜 포맷,
 * 카테고리/태그, 댓글 링크, 채널 메타데이터, XML escaping.
 *
 * REQ-FEED-006, 010~018, 021. AC-FEED-A2(atom entry published/id/author),
 * AC-FEED-A3(full vs excerpt).
 */
import { describe, it, expect } from 'vitest';
import { buildFeed, type FeedDocument } from '../build-feed.js';
import type { BoardFeedConfig } from '../config.js';

function makeDoc(overrides: Partial<FeedDocument> = {}): FeedDocument {
  return {
    id: 1,
    title: '첫 번째 글',
    content: '<p>본문 전체 내용입니다.</p>',
    contentText: '본문 전체 내용입니다. '.repeat(30), // 길게 만들어 excerpt 테스트
    regdate: new Date('2026-06-01T00:00:00.000Z'),
    lastUpdate: new Date('2026-06-02T00:00:00.000Z'),
    authorNickName: '홍길동',
    commentCount: 0,
    categoryTitle: null,
    tags: [],
    ...overrides,
  };
}

function makeConfig(overrides: Partial<BoardFeedConfig> = {}): BoardFeedConfig {
  return {
    enabled: true,
    itemCount: 20,
    fullContent: false,
    excerptLength: 50,
    ...overrides,
  };
}

const baseArgs = {
  instance: { mid: 'notice', browserTitle: null as string | null },
  board: { name: '공지사항', description: '공지 게시판입니다' },
  baseUrl: 'https://example.com',
};

describe('buildFeed - RSS 2.0 (SPEC-FEED-001 T-004)', () => {
  it('RSS-1: channel 메타데이터가 올바르게 매핑된다 (REQ-FEED-018)', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig({ description: '커스텀 설명', copyright: '(c) 2026' }),
      documents: [],
    });

    expect(xml).toContain('<title>공지사항</title>');
    expect(xml).toContain('<link>https://example.com/notice</link>');
    expect(xml).toContain('커스텀 설명');
    expect(xml).toContain('(c) 2026');
  });

  it('RSS-2: browserTitle 이 있으면 board.name 보다 우선한다', () => {
    const xml = buildFeed({
      format: 'rss',
      instance: { mid: 'notice', browserTitle: '브라우저 타이틀' },
      board: baseArgs.board,
      baseUrl: baseArgs.baseUrl,
      feedConfig: makeConfig(),
      documents: [],
    });
    expect(xml).toContain('<title>브라우저 타이틀</title>');
  });

  it('RSS-3: item 필드(title/link/guid/pubDate/dc:creator)가 매핑된다 (REQ-FEED-010)', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc()],
    });

    expect(xml).toContain('<title>첫 번째 글</title>');
    expect(xml).toContain('<link>https://example.com/notice/1</link>');
    expect(xml).toContain('<guid isPermaLink="true">https://example.com/notice/1</guid>');
    expect(xml).toContain('<dc:creator>홍길동</dc:creator>');
    // RFC-822 pubDate (regdate = 2026-06-01T00:00:00.000Z)
    expect(xml).toMatch(/<pubDate>.*2026.*<\/pubDate>/);
  });

  it('RSS-4 (AC-FEED-A3): fullContent=false 면 description 이 excerptLength 발췌다', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig({ fullContent: false, excerptLength: 10 }),
      documents: [makeDoc({ contentText: '0123456789ABCDEFGHIJ' })],
    });

    // 발췌는 10자로 잘려야 한다 (CDATA 내부에 위치)
    expect(xml).toContain('<![CDATA[0123456789]]>');
    expect(xml).not.toContain('ABCDEFGHIJ');
  });

  it('RSS-5 (AC-FEED-A3): fullContent=true 면 description 이 본문 전체다', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig({ fullContent: true }),
      documents: [makeDoc({ content: '<p>전체 본문 HTML</p>' })],
    });

    expect(xml).toContain('<![CDATA[<p>전체 본문 HTML</p>]]>');
  });

  it('RSS-6: category(board.name + categoryTitle + tags) 가 매핑된다 (REQ-FEED-015)', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ categoryTitle: '질문', tags: ['ts', 'react'] })],
    });

    expect(xml).toContain('<category>공지사항</category>');
    expect(xml).toContain('<category>질문</category>');
    expect(xml).toContain('<category>ts</category>');
    expect(xml).toContain('<category>react</category>');
  });

  it('RSS-7: commentCount > 0 이면 comments 링크가 포함된다 (REQ-FEED-016)', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ commentCount: 3 })],
    });
    expect(xml).toContain('<comments>https://example.com/notice/1#comment</comments>');
  });

  it('RSS-8: commentCount = 0 이면 comments 링크가 없다', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ commentCount: 0 })],
    });
    expect(xml).not.toContain('<comments>');
  });

  it('RSS-9: 문서 개수만큼 <item> 엘리먼트가 생성된다 (well-formed)', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ id: 1 }), makeDoc({ id: 2 }), makeDoc({ id: 3 })],
    });
    const itemCount = (xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(3);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
  });

  it('RSS-10: title/content 의 XML 특수문자가 안전하게 처리된다 (REQ-FEED-017)', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig({ fullContent: true }),
      documents: [
        makeDoc({
          title: '<script>alert(1)</script> & "quote"',
          content: 'body with ]]> injection attempt',
        }),
      ],
    });

    expect(xml).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quote&quot;');
    // ]]> 인젝션이 CDATA 를 조기 종료시키지 않는다
    expect(xml).not.toContain(']]> injection attempt</description>');
  });
});

describe('buildFeed - Atom 1.0 (SPEC-FEED-001 T-004)', () => {
  it('ATOM-1 (AC-FEED-A2): entry 에 published(RFC-3339)/id/author 가 존재한다', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc()],
    });

    expect(xml).toContain('<id>https://example.com/notice/1</id>');
    expect(xml).toContain('<published>2026-06-01T00:00:00.000Z</published>');
    expect(xml).toContain('<updated>2026-06-02T00:00:00.000Z</updated>');
    expect(xml).toContain('<name>홍길동</name>');
    expect(xml).toContain('<link rel="alternate" href="https://example.com/notice/1"/>');
  });

  it('ATOM-2: feed 레벨 메타데이터(title/id/updated)가 매핑된다', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc()],
    });

    expect(xml).toContain('<title>공지사항</title>');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
  });

  it('ATOM-3 (AC-FEED-A3): fullContent=false 면 summary 가 발췌, content 는 없다', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig({ fullContent: false, excerptLength: 5 }),
      documents: [makeDoc({ contentText: 'ABCDEFGHIJ' })],
    });

    expect(xml).toContain('<summary type="text">');
    expect(xml).toContain('<![CDATA[ABCDE]]>');
    expect(xml).not.toContain('<content type="html">');
  });

  it('ATOM-3b (AC-FEED-A3): fullContent=true 면 content type=html 이 본문 전체를 담는다', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig({ fullContent: true }),
      documents: [makeDoc({ content: '<p>전체 본문</p>' })],
    });

    expect(xml).toContain('<content type="html">');
    expect(xml).toContain('<![CDATA[<p>전체 본문</p>]]>');
  });

  it('ATOM-4: commentCount > 0 이면 rel="replies" 링크가 포함된다 (REQ-FEED-016)', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ commentCount: 2 })],
    });
    expect(xml).toContain('<link rel="replies" href="https://example.com/notice/1#comment"/>');
  });

  it('ATOM-5: category term 속성으로 매핑된다 (REQ-FEED-015)', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ categoryTitle: '질문', tags: ['ts'] })],
    });

    expect(xml).toContain('<category term="공지사항"/>');
    expect(xml).toContain('<category term="질문"/>');
    expect(xml).toContain('<category term="ts"/>');
  });

  it('ATOM-6: 문서 개수만큼 <entry> 가 생성된다', () => {
    const xml = buildFeed({
      format: 'atom',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ id: 1 }), makeDoc({ id: 2 })],
    });
    const entryCount = (xml.match(/<entry>/g) ?? []).length;
    expect(entryCount).toBe(2);
  });
});

describe('buildFeed - author nickname fallback (REQ-FEED-013)', () => {
  it('FALLBACK-1: authorNickName 이 없으면 익명으로 대체된다', () => {
    const xml = buildFeed({
      format: 'rss',
      ...baseArgs,
      feedConfig: makeConfig(),
      documents: [makeDoc({ authorNickName: null })],
    });
    expect(xml).toContain('<dc:creator>익명</dc:creator>');
  });
});
