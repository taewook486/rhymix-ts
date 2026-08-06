/**
 * SPEC-BOARD-UI-001 E2E 시드 헬퍼.
 *
 * 게시판 UI 인수 테스트에 필요한 픽스처를 직접 DB에 삽입합니다.
 *
 * 생성 항목:
 *  - board 모듈 인스턴스 1개 (mid='testboard')
 *  - boards 행 1개
 *  - 공지글 1개 (isNotice=true)
 *  - 일반 공개 문서 21개 (기본 20개/페이지 기준: 21번째 항목은 2페이지)
 *    - [0]: 고추천(votedCount=100) + 첨부파일 있음 (AC-BUI-005, AC-BUI-009)
 *    - [1]: 중간 추천(votedCount=50)
 *    - [5]: 유일 검색 키워드 포함 (AC-BUI-004)
 *    - 나머지: votedCount=0
 *  - 비밀글 1개 (status='SECRET') + 비밀글 작성자 계정 (AC-BUI-006)
 *  - regularDocIds[0]에 연결된 file_attachments 행 (AC-BUI-009)
 *
 * 주의:
 *  - db-reset.ts resetDb() 이후 호출해야 합니다.
 *  - TRUNCATE module_instances CASCADE가 boards → documents → file_attachments를
 *    연쇄 삭제하므로 별도 정리 불필요합니다.
 */
import { Client } from 'pg';
import { hashPassword } from '@rhymix-ts/auth';

/** AC-BUI-004 제목 검색에 사용할 고유 키워드 */
export const SEARCH_UNIQUE_KEYWORD = 'BOARD_SEARCH_UNIQUE_E2E_7x9q';

/** 비밀글 작성자 계정 정보 */
export const SECRET_AUTHOR = {
  userId: 'secretauthor',
  password: 'secretpass123',
  nickName: '비밀작성자',
} as const;

export interface SeedBoardFixturesResult {
  mid: string;
  moduleInstanceId: number;
  boardId: number;
  /** 공지 문서 ID */
  noticeDocId: number;
  /**
   * 일반 공개 문서 ID 배열 (21개).
   *  [0] = 고추천(votedCount=100) + 첨부파일
   *  [1] = 중간추천(votedCount=50)
   *  [5] = 고유 검색 키워드 포함
   */
  regularDocIds: number[];
  /** 비밀글 문서 ID */
  secretDocId: number;
  /** 비밀글 작성자 DB 기본키 */
  secretAuthorDbId: number;
  /** 첨부파일이 있는 문서 ID (regularDocIds[0]와 동일) */
  withAttachmentDocId: number;
  /** 최고 추천수 문서 ID (regularDocIds[0]와 동일) */
  highVoteDocId: number;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL이 설정되어 있지 않습니다.');
  return url;
}

/**
 * SPEC-BOARD-UI-001 E2E 픽스처 전체를 시드합니다.
 *
 * @param siteId seedInstalledSite()가 반환한 siteId
 * @param mid 게시판 URL 식별자 (기본값: 'testboard')
 */
export async function seedBoardFixtures(
  siteId: number,
  mid = 'testboard',
): Promise<SeedBoardFixturesResult> {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');

    // ── 1. 비밀글 작성자 계정 생성 ─────────────────────────────────────
    const passwordHash = await hashPassword(SECRET_AUTHOR.password);
    const secretAuthorRes = await client.query<{ id: number }>(
      `INSERT INTO users
         ("userId", "emailAddress", "passwordHash", "passwordVersion",
          "nickName", status, "isAdmin", denied, "updatedAt")
       VALUES ($1, $2, $3, 'argon2id-v1', $4,
         'APPROVED', false, false, NOW())
       RETURNING id`,
      [
        SECRET_AUTHOR.userId,
        `${SECRET_AUTHOR.userId}@e2e.local`,
        passwordHash,
        SECRET_AUTHOR.nickName,
      ],
    );
    const secretAuthorDbId = secretAuthorRes.rows[0]!.id;

    // ── 2. board 모듈 인스턴스 생성 ─────────────────────────────────────
    const moduleRes = await client.query<{ id: number }>(
      `INSERT INTO module_instances
         ("siteId", "moduleCode", mid, name, "updatedAt")
       VALUES ($1, 'board', $2, '테스트 게시판', NOW())
       RETURNING id`,
      [siteId, mid],
    );
    const moduleInstanceId = moduleRes.rows[0]!.id;

    // ── 3. boards 행 생성 ─────────────────────────────────────────────
    // permissions: list/view 는 게스트(group 0) 허용 — 비로그인 접근 가능
    const boardRes = await client.query<{ id: number }>(
      `INSERT INTO boards
         ("moduleInstanceId", name, permissions, "createdAt", "updatedAt")
       VALUES ($1, '테스트 게시판', $2, NOW(), NOW())
       RETURNING id`,
      [moduleInstanceId, JSON.stringify({ list: [0], view: [0] })],
    );
    const boardId = boardRes.rows[0]!.id;

    // ── 4. 공지글 1개 생성 ───────────────────────────────────────────
    // listOrder를 매우 크게 설정해 일반 글보다 항상 상단에 정렬되도록 함
    const baseOrder = Date.now();
    const noticeRes = await client.query<{ id: number }>(
      `INSERT INTO documents
         ("boardId", title, content, "contentText", status, "isNotice",
          "nickName", "votedCount", "readedCount", "uploadedCount",
          "listOrder", "updateOrder", regdate, "lastUpdate")
       VALUES ($1, $2, $3, $4, 'PUBLIC', true,
          '공지작성자', 0, 10, 0,
          $5::bigint, $5::bigint, NOW(), NOW())
       RETURNING id`,
      [
        boardId,
        '[공지] E2E 테스트 공지사항',
        '<p>공지 내용입니다.</p>',
        '공지 내용입니다.',
        String(baseOrder + 100000),
      ],
    );
    const noticeDocId = noticeRes.rows[0]!.id;

    // ── 5. 일반 공개 문서 21개 생성 ─────────────────────────────────
    // listOrder 내림차순: i=0 이 가장 최신 (가장 먼저 표시)
    const regularDocIds: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      const listOrderVal = String(baseOrder + 90000 - i * 1000);
      let title: string;
      let votedCount: number;
      let uploadedCount: number;

      if (i === 0) {
        // 고추천 + 첨부파일 (AC-BUI-005, AC-BUI-009)
        title = '고추천 첨부파일 게시글';
        votedCount = 100;
        uploadedCount = 1;
      } else if (i === 1) {
        title = '중간추천 게시글';
        votedCount = 50;
        uploadedCount = 0;
      } else if (i === 5) {
        // 제목 검색 테스트 (AC-BUI-004)
        title = `${SEARCH_UNIQUE_KEYWORD} 게시글`;
        votedCount = 0;
        uploadedCount = 0;
      } else {
        title = `일반 게시글 ${String(i + 1).padStart(2, '0')}`;
        votedCount = 0;
        uploadedCount = 0;
      }

      const docRes = await client.query<{ id: number }>(
        `INSERT INTO documents
           ("boardId", title, content, "contentText", status, "isNotice",
            "nickName", "votedCount", "readedCount", "uploadedCount",
            "listOrder", "updateOrder", regdate, "lastUpdate")
         VALUES ($1, $2, $3, $4, 'PUBLIC', false,
            '테스트작성자', $5, 0, $6,
            $7::bigint, $7::bigint, NOW(), NOW())
         RETURNING id`,
        [
          boardId,
          title,
          `<p>${title} 내용</p>`,
          `${title} 내용`,
          votedCount,
          uploadedCount,
          listOrderVal,
        ],
      );
      regularDocIds.push(docRes.rows[0]!.id);
    }

    // ── 6. 비밀글 1개 생성 (status='SECRET') ───────────────────────
    const secretDocRes = await client.query<{ id: number }>(
      `INSERT INTO documents
         ("boardId", title, content, "contentText", status, "isNotice",
          "authorId", "nickName", "votedCount", "readedCount", "uploadedCount",
          "listOrder", "updateOrder", regdate, "lastUpdate")
       VALUES ($1, $2, $3, $4, 'SECRET', false,
          $5, $6, 0, 0, 0,
          $7::bigint, $7::bigint, NOW(), NOW())
       RETURNING id`,
      [
        boardId,
        '비밀글 제목',
        '<p>비밀 내용입니다.</p>',
        '비밀 내용입니다.',
        secretAuthorDbId,
        SECRET_AUTHOR.nickName,
        String(baseOrder + 50000),
      ],
    );
    const secretDocId = secretDocRes.rows[0]!.id;

    // ── 7. 첨부파일 행 생성 (regularDocIds[0]에 연결) ───────────────
    const withAttachmentDocId = regularDocIds[0]!;
    await client.query(
      `INSERT INTO file_attachments
         ("uploadTargetType", "documentId", "sourceFilename", "uploadedFilename",
          "fileSize", "mimeType", "storageKey", regdate)
       VALUES ('DOCUMENT', $1, 'e2e-test.pdf', 'stored-e2e-test.pdf',
          2048, 'application/pdf', 'e2e/stored-e2e-test.pdf', NOW())`,
      [withAttachmentDocId],
    );

    await client.query('COMMIT');

    return {
      mid,
      moduleInstanceId,
      boardId,
      noticeDocId,
      regularDocIds,
      secretDocId,
      secretAuthorDbId,
      withAttachmentDocId,
      highVoteDocId: regularDocIds[0]!,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}
