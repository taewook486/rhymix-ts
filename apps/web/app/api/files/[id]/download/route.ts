/**
 * GET /api/files/[id]/download?variant=thumb|small|medium|large|original
 *
 * @MX:NOTE [AUTO]: SPEC-FILE-001 REQ-FILE-076
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '@rhymix-ts/file';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const fileId = parseInt(id, 10);
  if (isNaN(fileId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const attachment = await prisma.fileAttachment.findUnique({
    where: { id: fileId, isvalid: true },
  });
  if (!attachment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const storage = getStorage();
  const variant = req.nextUrl.searchParams.get('variant') ?? 'original';
  const storageKey =
    variant === 'original'
      ? attachment.storageKey
      : `${attachment.storageKey}.${variant}.webp`;

  // For local backend: stream directly
  if (storage.streamRead) {
    const stream = storage.streamRead(storageKey);
    if (!stream) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const { ReadableStream } = await import('node:stream/web');
    const { Readable } = await import('node:stream');
    const webStream = Readable.toWeb(stream) as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': variant === 'original' ? attachment.mimeType : 'image/webp',
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.sourceFilename)}"`,
      },
    });
  }

  // For S3 backend: redirect to presigned URL
  const url = await storage.getDownloadUrl({ key: storageKey });
  return NextResponse.redirect(url);
}
