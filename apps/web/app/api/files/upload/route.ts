/**
 * POST /api/files/upload — multipart 파일 업로드 라우트
 *
 * @MX:NOTE [AUTO]: SPEC-FILE-001 REQ-FILE-021, 022, 075 구현.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-021
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { getStorage, getScanner } from '@rhymix-ts/file';
import {
  assertMimeAllowed,
  assertSizeAllowed,
  UnsupportedMimeTypeError,
  FileTooLargeError,
} from '@rhymix-ts/file';
import { processImage, isImageMimeType } from '@rhymix-ts/file';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const fileSize = file.size;

    // MIME and size validation
    assertMimeAllowed(mimeType);
    assertSizeAllowed(mimeType, fileSize);

    const storage = getStorage();
    const scanner = getScanner();

    // Generate storage key
    const date = new Date();
    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const storageKey = `${dateStr}/${randomUUID()}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write to storage (for local backend)
    if (storage.write) {
      await storage.write({ key: storageKey, body: buffer, contentType: mimeType });
    } else {
      // S3: would need presigned URL flow — not implemented in this route for S3
      // S3 upload is handled by the existing requestUpload/completeUpload tRPC procedure
      return NextResponse.json(
        { error: 'S3 direct upload not supported via this endpoint' },
        { status: 501 },
      );
    }

    // Virus scan
    const scanResult = await scanner.scan({
      storageKey,
      storage,
      knownContentType: mimeType,
      knownSize: fileSize,
    });

    if (!scanResult.clean) {
      await storage.delete(storageKey).catch(() => {});
      return NextResponse.json(
        { error: 'Virus detected', threats: scanResult.threats },
        { status: 422 },
      );
    }

    // Image processing
    let width: number | null = null;
    let height: number | null = null;
    if (isImageMimeType(mimeType)) {
      const imgResult = await processImage({
        storage,
        storageKey,
        originalBuffer: buffer,
        mimeType,
      });
      width = imgResult.width || null;
      height = imgResult.height || null;
    }

    // Get uploadTargetType and uploadTargetId from formData (optional)
    const uploadTargetType = formData.get('uploadTargetType') as string | null;
    const uploadTargetIdStr = formData.get('uploadTargetId') as string | null;
    const uploadTargetId = uploadTargetIdStr ? parseInt(uploadTargetIdStr, 10) : null;

    // Determine final target type and IDs
    let finalTargetType: 'DOCUMENT' | 'COMMENT' = 'DOCUMENT'; // default
    let finalDocumentId: number | null = null;
    let finalCommentId: number | null = null;

    if (uploadTargetType === 'comment' && uploadTargetId) {
      finalTargetType = 'COMMENT';
      finalCommentId = uploadTargetId;
    } else if (uploadTargetType === 'document' && uploadTargetId) {
      finalTargetType = 'DOCUMENT';
      finalDocumentId = uploadTargetId;
    }
    // If no target provided, create orphan attachment (DOCUMENT type with null documentId)

    // Save to DB
    const attachment = await prisma.fileAttachment.create({
      data: {
        storageKey,
        sourceFilename: file.name,
        uploadedFilename: storageKey.split('/').pop() ?? storageKey,
        mimeType,
        fileSize: BigInt(fileSize),
        uploadTargetType: finalTargetType,
        isvalid: true,
        memberId: session.user.id.toString(),
        documentId: finalDocumentId,
        commentId: finalCommentId,
        width,
        height,
      },
    });

    return NextResponse.json({ id: attachment.id, storageKey }, { status: 201 });
  } catch (err) {
    if (err instanceof UnsupportedMimeTypeError) {
      return NextResponse.json({ error: err.message }, { status: 415 });
    }
    if (err instanceof FileTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
