/**
 * report.ts — SPEC-CONTENT-001 Slice D
 *
 * Document/Comment 신고 도메인 함수.
 *
 * @MX:NOTE [AUTO]: 중복 차단이 application-level only — DB unique 제약 없음.
 * @MX:REASON: findFirst + create 사이의 race window. DB-level unique 추가는 Slice E 마이그레이션 이월.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-091
 */
import { z } from 'zod';
import type { PrismaClient, DocumentReport } from '@prisma/client';
import { BoardPermissionDeniedError } from './document';

// ---------------------------------------------------------------------------
// 에러
// ---------------------------------------------------------------------------

export class DuplicateReportError extends Error {
  readonly code = 'DUPLICATE_REPORT';
  constructor(targetType: 'document' | 'comment', targetId: number) {
    super(`Already reported ${targetType} ${targetId}`);
    this.name = 'DuplicateReportError';
  }
}

// ---------------------------------------------------------------------------
// 스키마
// ---------------------------------------------------------------------------

const ReportDocumentSchema = z
  .object({
    documentId: z.number().int().positive().optional(),
    commentId: z.number().int().positive().optional(),
    reporterId: z.string().min(1),
    reporterIp: z.string().nullable().default(null),
    reason: z.string().min(1).max(500),
  })
  .refine(
    (d) => d.documentId !== undefined || d.commentId !== undefined,
    { message: 'documentId 또는 commentId 중 하나는 필수' },
  );

export type ReportDocumentInput = z.input<typeof ReportDocumentSchema>;

// ---------------------------------------------------------------------------
// reportDocument
// ---------------------------------------------------------------------------

/**
 * 문서 또는 댓글을 신고한다.
 * 동일 (documentId, reporterId) 조합이 이미 있으면 DuplicateReportError.
 */
export async function reportDocument(
  input: ReportDocumentInput,
  ctx: { prisma: PrismaClient },
): Promise<DocumentReport> {
  const parsed = ReportDocumentSchema.parse(input);

  // 중복 검사 — application level
  const existing = await ctx.prisma.documentReport.findFirst({
    where: {
      ...(parsed.documentId !== undefined ? { documentId: parsed.documentId } : {}),
      ...(parsed.commentId !== undefined ? { commentId: parsed.commentId } : {}),
      reporterId: parsed.reporterId,
    },
  });

  if (existing) {
    const targetType = parsed.documentId !== undefined ? 'document' : 'comment';
    const targetId = (parsed.documentId ?? parsed.commentId)!;
    throw new DuplicateReportError(targetType, targetId);
  }

  const report = await ctx.prisma.documentReport.create({
    data: {
      documentId: parsed.documentId ?? null,
      commentId: parsed.commentId ?? null,
      reporterId: parsed.reporterId,
      reporterIp: parsed.reporterIp,
      reason: parsed.reason,
      resolved: false,
    },
  });

  // SPEC-SPAM-001 AC-SPAM-003: 신고 임계치 초과 시 자동 비공개 처리
  // 스팸 필터 설정 조회
  const spamSettings = await ctx.prisma.siteSetting.findUnique({
    where: { siteId_key: { siteId: 1, key: 'spam_filter' } },
  });

  const spamConfig = (spamSettings?.value as any) || {
    reportThresholdDocument: 5,
    reportThresholdComment: 5,
  };

  // 게시물 신고 임계치 확인
  if (parsed.documentId !== undefined) {
    const reportCount = await ctx.prisma.documentReport.count({
      where: {
        documentId: parsed.documentId,
        resolved: false,
      },
    });

    if (reportCount > spamConfig.reportThresholdDocument) {
      // 게시물을 SECRET 상태로 변경 (비공개 처리)
      await ctx.prisma.document.update({
        where: { id: parsed.documentId },
        data: { status: 'SECRET' },
      });

      // 스팸 검토 큐에 추가
      const { SpamFilter } = await import('@rhymix-ts/spam');
      const spamFilter = new SpamFilter(ctx.prisma);
      await spamFilter.addToReviewQueue(
        1, // siteId
        'document',
        parsed.documentId,
        'report_threshold' as any,
        { reporterCount: reportCount },
      );
    }
  }

  // 댓글 신고 임계치 확인
  if (parsed.commentId !== undefined) {
    const reportCount = await ctx.prisma.documentReport.count({
      where: {
        commentId: parsed.commentId,
      },
    });

    if (reportCount > spamConfig.reportThresholdComment) {
      // 댓글을 비공개 처리. Comment.status 는 Prisma CommentStatus enum 이 아니라
      // @rhymix-ts/comment 의 숫자 코드(PUBLIC=1, SECRET=2)를 그대로 쓰는 레거시 Int 컬럼이다.
      // packages/comment 가 packages/document 에 의존하므로 순환 참조를 피하기 위해 상수를 import 하지 않고
      // 값을 직접 사용한다 — @rhymix-ts/comment 의 CommentStatus.SECRET 과 동일한 값이어야 한다.
      const COMMENT_STATUS_SECRET = 2;
      await ctx.prisma.comment.update({
        where: { id: parsed.commentId },
        data: { status: COMMENT_STATUS_SECRET },
      });

      // 스팸 검토 큐에 추가
      const { SpamFilter } = await import('@rhymix-ts/spam');
      const spamFilter = new SpamFilter(ctx.prisma);
      await spamFilter.addToReviewQueue(
        1, // siteId
        'comment',
        parsed.commentId,
        'report_threshold' as any,
        { reporterCount: reportCount },
      );
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// resolveReport
// ---------------------------------------------------------------------------

const ActorSchema = z.object({
  isAdmin: z.boolean(),
  userId: z.number().int().positive(),
  userGroupSrl: z.number().int().min(0),
});

export type AdminActor = z.infer<typeof ActorSchema>;

/**
 * 신고를 해결 처리한다 (admin 전용).
 */
export async function resolveReport(
  input: { reportId: number; actor: AdminActor },
  ctx: { prisma: PrismaClient },
): Promise<DocumentReport> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('resolve_report');
  }

  return ctx.prisma.documentReport.update({
    where: { id: input.reportId },
    data: { resolved: true },
  });
}

// ---------------------------------------------------------------------------
// listReports
// ---------------------------------------------------------------------------

export interface ListReportsInput {
  resolved?: boolean;
  targetType?: 'document' | 'comment';
  page?: number;
  limit?: number;
  actor: AdminActor;
}

export interface ListReportsResult {
  items: DocumentReport[];
  total: number;
}

/**
 * 신고 목록을 조회한다 (admin 전용).
 */
export async function listReports(
  input: ListReportsInput,
  ctx: { prisma: PrismaClient },
): Promise<ListReportsResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('list_reports');
  }

  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (input.resolved !== undefined) {
    where.resolved = input.resolved;
  }
  if (input.targetType === 'document') {
    where.documentId = { not: null } as unknown;
  } else if (input.targetType === 'comment') {
    where.commentId = { not: null } as unknown;
  }

  const [items, total] = await Promise.all([
    ctx.prisma.documentReport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { regdate: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
      },
    }),
    ctx.prisma.documentReport.count({ where }),
  ]);

  return { items, total };
}
