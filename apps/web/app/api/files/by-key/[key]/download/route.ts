/**
 * GET /api/files/by-key/[key]/download
 * LocalDiskStorage가 발급한 URL (/api/files/by-key/{encoded-key}/download) 처리
 *
 * @MX:NOTE [AUTO]: SPEC-FILE-001 REQ-FILE-052 — local backend download URL
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '@rhymix-ts/file';
import { canReadAttachment, getAccessSession } from '@/app/api/files/_lib/can-read-attachment';

/** 이미지 변형 파일 키: `{storageKey}.{variant}.webp` (packages/file/src/image-pipeline.ts) */
const VARIANT_KEY = /^(.+)\.(?:thumb|small|medium|large)\.webp$/;

/**
 * 이 키가 FileAttachment 의 저장 키(또는 그 변형)이면 해당 첨부를 돌려준다.
 * 메뉴 버튼 이미지처럼 FileAttachment 행이 없는 파일은 null — 지금처럼 허용한다.
 */
async function findAttachmentByKey(storageKey: string) {
  const exact = await prisma.fileAttachment.findFirst({ where: { storageKey } });
  if (exact) return exact;
  const base = VARIANT_KEY.exec(storageKey)?.[1];
  return base ? prisma.fileAttachment.findFirst({ where: { storageKey: base } }) : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  const { key } = await params;
  const storageKey = decodeURIComponent(key);

  // 첨부 파일의 키이면 [id] 라우트와 같은 규칙으로 판정한다. 거부는 존재 노출 없이 404.
  const attachment = await findAttachmentByKey(storageKey);
  if (attachment && !(await canReadAttachment(attachment, await getAccessSession()))) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

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
