/**
 * GET /api/files/[id]/download — 첨부 다운로드 권한 (결함 수리).
 *
 * 글 보기 화면(packages/board/src/routes/view-page.tsx)과 같은 규칙으로
 * 세션·글 상태·게시판 view 권한을 검사해야 한다. 거부는 존재를 알리지 않도록
 * 모두 404 로 응답한다.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// 메모리 DB — 구현이 findUnique/findFirst 어느 쪽을 쓰든 같은 행을 돌려준다.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  tables: {
    fileAttachment: [] as Row[],
    document: [] as Row[],
    board: [] as Row[],
    comment: [] as Row[],
  },
  session: null as unknown,
}));

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) return true; // 관계·연산자 조건은 무시
    return row[k] === v;
  });
}

function model(name: 'fileAttachment' | 'document' | 'board' | 'comment') {
  const find = async (args?: { where?: Row }) =>
    db.tables[name].find((r) => matches(r, args?.where)) ?? null;
  return { findUnique: vi.fn(find), findFirst: vi.fn(find) };
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    fileAttachment: model('fileAttachment'),
    document: model('document'),
    board: model('board'),
    comment: model('comment'),
  },
}));

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(async () => db.session),
}));

const storage = vi.hoisted(() => ({
  streamRead: vi.fn(),
  getDownloadUrl: vi.fn(),
}));

vi.mock('@rhymix-ts/file', () => ({
  getStorage: () => storage,
}));

import { GET } from './route';

// ---------------------------------------------------------------------------
// 픽스처
// ---------------------------------------------------------------------------

const AUTHOR_ID = 1;
const OTHER_ID = 2;
const ADMIN_ID = 9;

function user(id: number, isAdmin = false, groups?: Array<{ id: number }>) {
  return { user: { id: String(id), isAdmin, groups } };
}

function seed(opts: {
  docStatus?: string;
  docDeletedAt?: Date | null;
  boardPermissions?: Record<string, number[]> | null;
  attachment?: Partial<Row>;
  comment?: Row | null;
} = {}) {
  const board: Row = {
    id: 5,
    moduleInstanceId: 50,
    permissions: opts.boardPermissions ?? {},
  };
  const doc: Row = {
    id: 100,
    boardId: 5,
    authorId: AUTHOR_ID,
    status: opts.docStatus ?? 'PUBLIC',
    deletedAt: opts.docDeletedAt ?? null,
    board,
  };
  db.tables.board = [board];
  db.tables.document = [doc];
  db.tables.comment = opts.comment ? [opts.comment] : [];
  db.tables.fileAttachment = [
    {
      id: 7,
      isvalid: true,
      documentId: 100,
      commentId: null,
      memberId: String(AUTHOR_ID),
      storageKey: 'attachments/2026/11/abc.png',
      mimeType: 'image/png',
      sourceFilename: 'a.png',
      ...opts.attachment,
    },
  ];
}

async function download(id = '7', query = ''): Promise<Response> {
  const params = Promise.resolve({ id });
  return (await GET(new NextRequest(`http://localhost/api/files/${id}/download${query}`), {
    params,
  })) as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.session = null;
  storage.streamRead.mockImplementation(() => Readable.from(['file-bytes']));
  storage.getDownloadUrl.mockResolvedValue('https://example.test/signed');
  seed();
});

// ---------------------------------------------------------------------------
// 재현: 지금은 200 이 나와 실패해야 하는 경우
// ---------------------------------------------------------------------------

describe('GET /api/files/[id]/download — 거부 (404, 존재 노출 없음)', () => {
  it('(a) 다른 사람의 TEMP 글 첨부', async () => {
    seed({ docStatus: 'TEMP' });
    db.session = user(OTHER_ID);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('(a-2) 비회원의 TEMP 글 첨부', async () => {
    seed({ docStatus: 'TEMP' });
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('(b) 삭제된 글의 첨부', async () => {
    seed({ docDeletedAt: new Date('2026-11-01T00:00:00Z') });
    db.session = user(OTHER_ID);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('(c) view 권한이 없는 게시판의 첨부를 비회원이 받는 경우', async () => {
    seed({ boardPermissions: { view: [1] } }); // 회원(1)만 허용, 비회원(0)은 거부
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('(c-2) view 권한 그룹에 속하지 않는 회원', async () => {
    seed({ boardPermissions: { view: [3] } });
    db.session = user(OTHER_ID, false, [{ id: 2 }]);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('(d) 글에 아직 붙지 않은 첨부를 남이 받는 경우', async () => {
    seed({ attachment: { documentId: null, commentId: null, memberId: String(AUTHOR_ID) } });
    db.session = user(OTHER_ID);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('(d-2) 글에 붙지 않은 첨부를 비회원이 받는 경우', async () => {
    seed({ attachment: { documentId: null, commentId: null } });
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('SECRET 글의 첨부는 작성자·관리자 외에는 거부', async () => {
    seed({ docStatus: 'SECRET' });
    db.session = user(OTHER_ID);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('댓글 첨부는 댓글이 속한 글(TEMP)의 규칙을 따른다', async () => {
    seed({
      docStatus: 'TEMP',
      attachment: { documentId: null, commentId: 300 },
      comment: { id: 300, documentId: 100, authorId: OTHER_ID, deletedAt: null, isSecret: false },
    });
    db.session = user(OTHER_ID);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('삭제된 댓글의 첨부는 거부', async () => {
    seed({
      attachment: { documentId: null, commentId: 300 },
      comment: {
        id: 300,
        documentId: 100,
        authorId: OTHER_ID,
        deletedAt: new Date('2026-11-01T00:00:00Z'),
        isSecret: false,
      },
    });
    db.session = user(OTHER_ID);
    const res = await download();
    expect(res.status).toBe(404);
  });

  it('거부 응답 본문은 존재 여부를 구분할 수 없다 (없는 id 와 동일)', async () => {
    seed({ docStatus: 'TEMP' });
    db.session = user(OTHER_ID);
    const denied = await download('7');
    const missing = await download('999');
    expect(denied.status).toBe(missing.status);
    expect(await denied.text()).toBe(await missing.text());
  });

  it('파일 바이트를 읽기 전에 거부한다 (streamRead 미호출)', async () => {
    seed({ docStatus: 'TEMP' });
    db.session = user(OTHER_ID);
    await download();
    expect(storage.streamRead).not.toHaveBeenCalled();
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
  });
});

describe('GET /api/files/[id]/download — variant 허용 목록', () => {
  it.each(['../../etc/passwd', 'huge', 'thumb/../x', ''])('허용되지 않은 variant "%s" 는 400', async (v) => {
    const res = await download('7', `?variant=${encodeURIComponent(v)}`);
    expect(res.status).toBe(400);
  });

  it.each(['thumb', 'small', 'medium', 'large'])('variant "%s" 는 허용되고 변형 키를 읽는다', async (v) => {
    const res = await download('7', `?variant=${v}`);
    expect(res.status).toBe(200);
    expect(storage.streamRead).toHaveBeenCalledWith(`attachments/2026/11/abc.png.${v}.webp`);
  });
});

// ---------------------------------------------------------------------------
// 회귀 방지: 정상 접근은 계속 200
// ---------------------------------------------------------------------------

describe('GET /api/files/[id]/download — 허용 (200)', () => {
  it('공개 글의 첨부는 비회원도 받는다', async () => {
    const res = await download();
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('TEMP 글 첨부는 작성자가 받는다', async () => {
    seed({ docStatus: 'TEMP' });
    db.session = user(AUTHOR_ID);
    expect((await download()).status).toBe(200);
  });

  it('TEMP 글 첨부는 관리자가 받는다', async () => {
    seed({ docStatus: 'TEMP' });
    db.session = user(ADMIN_ID, true);
    expect((await download()).status).toBe(200);
  });

  it('SECRET 글 첨부는 작성자가 받는다', async () => {
    seed({ docStatus: 'SECRET' });
    db.session = user(AUTHOR_ID);
    expect((await download()).status).toBe(200);
  });

  it('view 권한 그룹에 속한 회원은 받는다 (첫 그룹 기준)', async () => {
    seed({ boardPermissions: { view: [3] } });
    db.session = user(OTHER_ID, false, [{ id: 3 }]);
    expect((await download()).status).toBe(200);
  });

  it('그룹이 없는 회원은 그룹 1 로 취급한다', async () => {
    seed({ boardPermissions: { view: [1] } });
    db.session = user(OTHER_ID);
    expect((await download()).status).toBe(200);
  });

  it('붙지 않은 첨부는 업로더가 받는다', async () => {
    seed({ attachment: { documentId: null, commentId: null, memberId: String(OTHER_ID) } });
    db.session = user(OTHER_ID);
    expect((await download()).status).toBe(200);
  });

  it('붙지 않은 첨부는 관리자가 받는다', async () => {
    seed({ attachment: { documentId: null, commentId: null } });
    db.session = user(ADMIN_ID, true);
    expect((await download()).status).toBe(200);
  });

  it('공개 글에 속한 댓글의 첨부는 비회원도 받는다', async () => {
    seed({
      attachment: { documentId: null, commentId: 300 },
      comment: { id: 300, documentId: 100, authorId: OTHER_ID, deletedAt: null, isSecret: false },
    });
    expect((await download()).status).toBe(200);
  });

  it('존재하지 않는 id 는 404, 숫자가 아닌 id 는 400', async () => {
    expect((await download('999')).status).toBe(404);
    expect((await download('abc')).status).toBe(400);
  });
});
