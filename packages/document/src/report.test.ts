/**
 * packages/board/src/report.test.ts — SPEC-CONTENT-001 Slice D
 *
 * R-1 ~ R-6: reportDocument, resolveReport, listReports 도메인 함수 검증.
 *
 * REQ-CONTENT-091: 신고 row 생성, 동일 사용자 중복 차단.
 */
import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// reportDocument
// ---------------------------------------------------------------------------

describe('reportDocument', () => {
  it('R-1: reportDocument 정상 → row 생성, resolved = false', async () => {
    const { reportDocument } = await import('./report.js');

    const fakeReport = {
      id: 1, documentId: 10, reporterId: '42', reason: '스팸', resolved: false,
    };

    const mockPrisma = {
      documentReport: {
        findFirst: vi.fn().mockResolvedValue(null), // 중복 없음
        create: vi.fn().mockResolvedValue(fakeReport),
        count: vi.fn().mockResolvedValue(1), // SPEC-SPAM-001: 임계치(기본 5) 미만
      },
      siteSetting: {
        findUnique: vi.fn().mockResolvedValue(null), // 스팸 필터 설정 없음 → 기본값 사용
      },
    };

    const result = await reportDocument(
      { documentId: 10, reporterId: '42', reporterIp: null, reason: '스팸' },
      { prisma: mockPrisma as never },
    );

    expect(result.resolved).toBe(false);
    expect(result.documentId).toBe(10);
    expect(mockPrisma.documentReport.create).toHaveBeenCalledOnce();
  });

  it('R-2: 동일 사용자 동일 문서 중복 신고 → DuplicateReportError', async () => {
    const { reportDocument, DuplicateReportError } = await import('./report.js');

    const existingReport = { id: 1, documentId: 10, reporterId: '42' };

    const mockPrisma = {
      documentReport: {
        findFirst: vi.fn().mockResolvedValue(existingReport),
        create: vi.fn(),
      },
    };

    await expect(
      reportDocument(
        { documentId: 10, reporterId: '42', reporterIp: null, reason: '스팸' },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(DuplicateReportError);

    // create 는 호출되지 않아야 함
    expect(mockPrisma.documentReport.create).not.toHaveBeenCalled();
  });

  it('R-3: 다른 사용자 동일 문서 → 정상 생성 (사용자 단위 unique)', async () => {
    const { reportDocument } = await import('./report.js');

    const fakeReport = { id: 2, documentId: 10, reporterId: '99', reason: '욕설', resolved: false };

    const mockPrisma = {
      documentReport: {
        findFirst: vi.fn().mockResolvedValue(null), // 다른 사용자는 중복 없음
        create: vi.fn().mockResolvedValue(fakeReport),
        count: vi.fn().mockResolvedValue(1), // SPEC-SPAM-001: 임계치(기본 5) 미만
      },
      siteSetting: {
        findUnique: vi.fn().mockResolvedValue(null), // 스팸 필터 설정 없음 → 기본값 사용
      },
    };

    const result = await reportDocument(
      { documentId: 10, reporterId: '99', reporterIp: null, reason: '욕설' },
      { prisma: mockPrisma as never },
    );

    expect(result.reporterId).toBe('99');
    expect(mockPrisma.documentReport.create).toHaveBeenCalledOnce();
  });

  it('R-4: documentId / commentId 모두 누락 → ZodError', async () => {
    const { reportDocument } = await import('./report.js');

    const mockPrisma = { documentReport: { findFirst: vi.fn(), create: vi.fn() } };

    await expect(
      reportDocument(
        // documentId, commentId 모두 없음
        { reporterId: '42', reporterIp: null, reason: '스팸' } as never,
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// resolveReport
// ---------------------------------------------------------------------------

describe('resolveReport', () => {
  it('R-5: resolveReport admin → resolved = true', async () => {
    const { resolveReport } = await import('./report.js');

    const updatedReport = { id: 1, resolved: true };

    const mockPrisma = {
      documentReport: {
        update: vi.fn().mockResolvedValue(updatedReport),
      },
    };

    const result = await resolveReport(
      { reportId: 1, actor: { isAdmin: true, userId: 100, userGroupSrl: 1 } },
      { prisma: mockPrisma as never },
    );

    expect(result.resolved).toBe(true);
  });

  it('R-5b: resolveReport 비admin → BoardPermissionDeniedError', async () => {
    const { resolveReport } = await import('./report.js');
    const { BoardPermissionDeniedError } = await import('./document.js');

    const mockPrisma = { documentReport: { update: vi.fn() } };

    await expect(
      resolveReport(
        { reportId: 1, actor: { isAdmin: false, userId: 42, userGroupSrl: 1 } },
        { prisma: mockPrisma as never },
      ),
    ).rejects.toThrow(BoardPermissionDeniedError);
  });
});

// ---------------------------------------------------------------------------
// listReports
// ---------------------------------------------------------------------------

describe('listReports', () => {
  it('R-6: listReports admin, resolved=false 필터 → 미해결 신고만 반환', async () => {
    const { listReports } = await import('./report.js');

    const fakeReports = [
      { id: 1, resolved: false, documentId: 10 },
      { id: 2, resolved: false, documentId: 20 },
    ];

    const mockPrisma = {
      documentReport: {
        findMany: vi.fn().mockResolvedValue(fakeReports),
        count: vi.fn().mockResolvedValue(2),
      },
    };

    const result = await listReports(
      { resolved: false, page: 1, limit: 20, actor: { isAdmin: true, userId: 100, userGroupSrl: 1 } },
      { prisma: mockPrisma as never },
    );

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    // resolved: false 필터 전달 확인
    const findCall = mockPrisma.documentReport.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(findCall?.where?.resolved).toBe(false);
  });
});
