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

import { GET } from './route';

function requestDownload(): Promise<Response> {
  const params = Promise.resolve({ key: encodeURIComponent('2026/08/uuid-1') });
  return GET(new Request('http://localhost/api/files/by-key/x/download') as never, { params });
}

describe('GET /api/files/by-key/[key]/download (D6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileMocks.storage.streamRead.mockReturnValue(Readable.from(['file-bytes']));
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
});
