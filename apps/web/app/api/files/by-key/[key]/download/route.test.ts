/**
 * GET /api/files/by-key/[key]/download — SPEC-LEGACY-PARITY-001 감사 결함 D6.
 *
 * 다운로드 응답에 X-Content-Type-Options: nosniff 가 없으면 브라우저가
 * Content-Type 스니핑으로 본문을 임의 해석할 수 있다. 저장소 본문은 업로드
 * 시 검증했다 해도 전송 계층에서의 콘텐츠 스니핑 방지가 별도로 필요하다.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';

// packages/file 모킹 — 로컬 백엔드 streamRead 경로만 노출한다
const fileMocks = vi.hoisted(() => ({
  storage: {
    streamRead: vi.fn(),
  },
}));

vi.mock('@rhymix-ts/file', () => ({
  getStorage: () => fileMocks.storage,
}));

// 첨부 권한 검사용 메모리 DB — 키가 FileAttachment 에 없으면(메뉴 버튼 이미지 등) 허용된다.
const dbMocks = vi.hoisted(() => ({
  tables: {
    fileAttachment: [] as Array<Record<string, unknown>>,
    document: [] as Array<Record<string, unknown>>,
    board: [] as Array<Record<string, unknown>>,
    comment: [] as Array<Record<string, unknown>>,
  },
  session: null as unknown,
}));

function table(name: 'fileAttachment' | 'document' | 'board' | 'comment') {
  const find = async (args?: { where?: Record<string, unknown> }) =>
    dbMocks.tables[name].find((r) =>
      Object.entries(args?.where ?? {}).every(([k, v]) =>
        v !== null && typeof v === 'object' ? true : r[k] === v,
      ),
    ) ?? null;
  return { findUnique: vi.fn(find), findFirst: vi.fn(find) };
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    fileAttachment: table('fileAttachment'),
    document: table('document'),
    board: table('board'),
    comment: table('comment'),
  },
}));

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(async () => dbMocks.session),
}));

import { GET } from './route';

function requestDownload(key = '2026/08/uuid-1'): Promise<Response> {
  const params = Promise.resolve({ key: encodeURIComponent(key) });
  return GET(new Request('http://localhost/api/files/by-key/x/download') as never, {
    params,
  }) as Promise<Response>;
}

describe('GET /api/files/by-key/[key]/download (D6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileMocks.storage.streamRead.mockImplementation(() => Readable.from(['file-bytes']));
    dbMocks.session = null;
    dbMocks.tables.fileAttachment = [];
    dbMocks.tables.document = [];
    dbMocks.tables.board = [];
    dbMocks.tables.comment = [];
  });

  it('D6-1: 다운로드 응답에 X-Content-Type-Options: nosniff 가 설정된다', async () => {
    const res = await requestDownload();

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('D6-2: 기존 다운로드 헤더(octet-stream + attachment)는 유지된다', async () => {
    const res = await requestDownload();

    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Disposition')).toBe('attachment');
  });

  it('D6-3: 저장 키는 decodeURIComponent 로 복원되어 streamRead 에 전달된다', async () => {
    await requestDownload();

    expect(fileMocks.storage.streamRead).toHaveBeenCalledWith('2026/08/uuid-1');
  });

  // -------------------------------------------------------------------------
  // 첨부 권한 — /api/files/[id]/download 와 같은 규칙
  // -------------------------------------------------------------------------

  function seedAttachment(opts: { docStatus?: string; unattached?: boolean } = {}) {
    dbMocks.tables.board = [{ id: 5, moduleInstanceId: 50, permissions: {} }];
    dbMocks.tables.document = [
      { id: 100, boardId: 5, authorId: 1, status: opts.docStatus ?? 'PUBLIC', deletedAt: null },
    ];
    dbMocks.tables.fileAttachment = [
      {
        id: 7,
        isvalid: true,
        documentId: opts.unattached ? null : 100,
        commentId: null,
        memberId: '1',
        storageKey: 'attachments/2026/11/abc.png',
      },
    ];
  }

  it('AUTH-1: 다른 사람의 TEMP 글 첨부 키는 404 이고 저장소를 읽지 않는다', async () => {
    seedAttachment({ docStatus: 'TEMP' });
    dbMocks.session = { user: { id: '2', isAdmin: false } };

    const res = await requestDownload('attachments/2026/11/abc.png');

    expect(res.status).toBe(404);
    expect(fileMocks.storage.streamRead).not.toHaveBeenCalled();
  });

  it('AUTH-2: 변형 키(.thumb.webp)도 원본 첨부와 같은 규칙으로 거부된다', async () => {
    seedAttachment({ docStatus: 'TEMP' });

    const res = await requestDownload('attachments/2026/11/abc.png.thumb.webp');

    expect(res.status).toBe(404);
    expect(fileMocks.storage.streamRead).not.toHaveBeenCalled();
  });

  it('AUTH-3: 글에 붙지 않은 첨부 키는 업로더가 아니면 404', async () => {
    seedAttachment({ unattached: true });
    dbMocks.session = { user: { id: '2', isAdmin: false } };

    const res = await requestDownload('attachments/2026/11/abc.png');

    expect(res.status).toBe(404);
  });

  it('AUTH-4: 공개 글의 첨부 키는 비회원도 받는다', async () => {
    seedAttachment();

    const res = await requestDownload('attachments/2026/11/abc.png');

    expect(res.status).toBe(200);
    expect(fileMocks.storage.streamRead).toHaveBeenCalledWith('attachments/2026/11/abc.png');
  });

  it('AUTH-5: 업로더 본인은 붙지 않은 첨부 키를 받는다', async () => {
    seedAttachment({ unattached: true });
    dbMocks.session = { user: { id: '1', isAdmin: false } };

    const res = await requestDownload('attachments/2026/11/abc.png');

    expect(res.status).toBe(200);
  });

  it('AUTH-6: FileAttachment 에 없는 키(메뉴 버튼 이미지 등)는 지금처럼 허용된다', async () => {
    seedAttachment({ docStatus: 'TEMP' }); // 다른 첨부가 있어도 무관한 키는 영향받지 않는다

    const res = await requestDownload('2026/08/menu-button-uuid');

    expect(res.status).toBe(200);
  });

  it('AUTH-7: 거부 응답은 없는 키와 구분되지 않는다', async () => {
    seedAttachment({ docStatus: 'TEMP' });
    fileMocks.storage.streamRead.mockReturnValueOnce(null);

    const denied = await requestDownload('attachments/2026/11/abc.png');
    const missing = await requestDownload('2026/08/does-not-exist');

    expect(denied.status).toBe(missing.status);
    expect(await denied.text()).toBe(await missing.text());
  });
});
