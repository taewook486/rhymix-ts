/**
 * GET /api/files/by-key/[key]/download
 * LocalDiskStorage가 발급한 URL (/api/files/by-key/{encoded-key}/download) 처리
 *
 * @MX:NOTE [AUTO]: SPEC-FILE-001 REQ-FILE-052 — local backend download URL
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@rhymix-ts/file';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  const { key } = await params;
  const storageKey = decodeURIComponent(key);

  const storage = getStorage();
  if (!storage.streamRead) {
    return NextResponse.json({ error: 'Not supported for this backend' }, { status: 501 });
  }

  const stream = storage.streamRead(storageKey);
  if (!stream) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const { Readable } = await import('node:stream');
  const { ReadableStream } = await import('node:stream/web');
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment',
      // 감사 결함 D6 — 콘텐츠 스니핑 방지 (저장된 본문의 임의 해석 차단)
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
