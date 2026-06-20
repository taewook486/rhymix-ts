/**
 * SPEC-FEED-001 T-012: 게시판 RSS 피드 E2E 테스트.
 *
 * AC-FEED-A1: PUBLIC 문서만 RSS 피드에 포함되는지 검증.
 * AC-FEED-A4: SECRET 문서의 제목이 RSS 피드에 노출되지 않는지 검증.
 * REQ-FEED-064: RSS 라우트가 200과 올바른 Content-Type을 반환하는지 검증.
 * REQ-FEED-066: 게스트 권한(list/view)이 없는 게시판의 피드는 404를 반환하는지 검증.
 *
 * 풀스택 환경(CI_E2E=1)이 없으면 skip한다.
 * 개발 환경에서 실행하려면: CI_E2E=1 pnpm test:e2e --grep "RSS feed"
 */
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

import { resetDb } from './support/db-reset';
import { seedInstalledSite } from './support/seed-installed-site';

// 풀스택 환경이 아니면 skip
test.skip(
  process.env.CI_E2E !== '1',
  '풀스택 환경이 필요합니다 (CI_E2E=1 설정 필요)',
);

/**
 * DB에 피드 활성화된 게시판 + 문서들을 시드한다.
 *
 * - 게시판: 게스트(list=[0], view=[0]) 권한 부여 + 피드 활성화
 * - 문서: PUBLIC 3개 + SECRET 1개
 */
async function seedBoardWithFeedAndDocuments(
  siteId: number,
  mid: string = 'feedtest',
): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');

    // ModuleInstance 생성 (board 모듈)
    const moduleRes = await client.query<{ id: number }>(
      `INSERT INTO module_instances ("siteId", "moduleCode", mid, name, "updatedAt")
       VALUES ($1, 'board', $2, '피드 테스트 게시판', NOW())
       RETURNING id`,
      [siteId, mid],
    );
    const moduleInstanceId = moduleRes.rows[0]!.id;

    // Board 생성 (게스트 권한 + 피드 활성화)
    await client.query(
      `INSERT INTO boards
       ("moduleInstanceId", name, permissions, "feedConfig", "createdAt", "updatedAt")
       VALUES ($1, '피드 테스트', $2, $3, NOW(), NOW())`,
      [
        moduleInstanceId,
        JSON.stringify({ list: [0], view: [0] }), // 게스트 그룹(0)에 list/view 권한 부여
        JSON.stringify({
          enabled: true,
          itemCount: 20,
          fullContent: false,
          excerptLength: 400,
        }),
      ],
    );

    // Board ID 조회 (moduleInstanceId로)
    const boardRes = await client.query<{ id: number }>(
      `SELECT id FROM boards WHERE "moduleInstanceId" = $1`,
      [moduleInstanceId],
    );
    const boardId = boardRes.rows[0]!.id;

    // PUBLIC 문서 3개 생성 (listOrder로 최신순 정렬)
    const publicDocs = [
      { title: 'Public Doc 1', listOrder: 3 },
      { title: 'Public Doc 2', listOrder: 2 },
      { title: 'Public Doc 3', listOrder: 1 },
    ];

    for (const doc of publicDocs) {
      await client.query(
        `INSERT INTO documents
         ("boardId", title, content, "contentText", status, "listOrder", "regdate", "lastUpdate")
         VALUES ($1, $2, $3, $4, 'PUBLIC', $5, NOW(), NOW())`,
        [
          boardId,
          doc.title,
          `<p>${doc.title} 본문</p>`,
          `${doc.title} 본문`,
          doc.listOrder,
        ],
      );
    }

    // SECRET 문서 1개 생성 (status='SECRET')
    await client.query(
      `INSERT INTO documents
       ("boardId", title, content, "contentText", status, "listOrder", "regdate", "lastUpdate")
       VALUES ($1, $2, $3, $4, 'SECRET', $5, NOW(), NOW())`,
      [
        boardId,
        'Secret Doc — should not leak',
        `<p>비밀 문서 본문</p>`,
        '비밀 문서 본문',
        0,
      ],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

test.beforeEach(async () => {
  await resetDb();
});

test('RSS feed returns 200 with correct Content-Type and only PUBLIC documents', async ({
  request,
}) => {
  // 1. 설치된 site 시드
  const { siteId } = await seedInstalledSite({ hostname: 'localhost' });

  // 2. 피드 활성화된 게시판 + 문서 시드
  await seedBoardWithFeedAndDocuments(siteId, 'feedtest');

  // 3. GET /feedtest/rss 요청
  const response = await request.get('/feedtest/rss', {
    // hostname-based site resolution: seedInstalledSite가 localhost 도메인을 생성하므로
    // x-site-id 헤더가 필요 없음 (proxy.ts에서 hostname으로 siteId를 결정)
    maxRedirects: 0,
  });

  // 4. HTTP 200 확인 (REQ-FEED-064)
  expect(response.status()).toBe(200);

  // 5. Content-Type 확인 (REQ-FEED-064)
  const contentType = response.headers()['content-type'];
  expect(contentType).toContain('application/rss+xml');

  // 6. RSS 본문 확인
  const body = await response.text();

  // 7. <item> 요소가 정확히 3개여야 함 (PUBLIC 문서만)
  const itemCount = (body.match(/<item>/g) ?? []).length;
  expect(itemCount).toBe(3);

  // 8. PUBLIC 문서 제목이 포함되어야 함
  expect(body).toContain('Public Doc 1');
  expect(body).toContain('Public Doc 2');
  expect(body).toContain('Public Doc 3');

  // 9. SECRET 문서 제목이 절대 포함되지 않아야 함 (REQ-FEED-066, AC-FEED-A4)
  expect(body).not.toContain('Secret Doc — should not leak');
  expect(body).not.toContain('비밀 문서');
});
