/**
 * admin.dashboard tRPC 라우터 — SPEC-ADMIN-002 Slice 1A + Slice 3E.
 *
 * 대시보드 위젯 데이터 제공:
 * - 방문자 통계 (일별/월별)
 * - 최근 문서 (10개)
 * - 최근 댓글 (10개)
 * - 위젯 표시 여부 (REQ-ADMIN2-008)
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-001, REQ-ADMIN2-002, REQ-ADMIN2-003, REQ-ADMIN2-008, REQ-ADMIN2-010
 */
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { router, protectedAdminProcedure } from '../../trpc';

/**
 * 방문자 통계 조회
 * - 일별/월별 방문자 수
 * - REQ-ADMIN2-001: 대시보드 방문자 통계 위젯
 * - REQ-ADMIN2-009: 집계된 일별 카운터 사용
 * - REQ-ADMIN2-010: 인덱스 기반 쿼리 (date 인덱스 활용)
 */
export const adminDashboardRouter = router({
  /**
   * 최근 방문자 통계 (최근 30일)
   */
  getVisitStats: protectedAdminProcedure
    .input(z.object({
      siteId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      // REQ-ADMIN2-010: 인덱스 기반 쿼리 - date 컬럼 인덱스 활용
      const stats = await ctx.prisma.dailyVisit.findMany({
        where: { siteId: input.siteId },
        orderBy: { date: 'desc' },
        take: 30,
      });

      // 일별/월별 집계 계산
      const daily = stats.map(stat => ({
        date: stat.date.toISOString().split('T')[0]!, // YYYY-MM-DD (non-null assertion)
        uniqueVisitors: stat.uniqueVisitors,
        pageViews: stat.pageViews,
      }));

      // 월별 집계 (Phase 1에서는 간단하게 전체 합계만 제공)
      const monthly = daily.reduce((acc, curr) => {
        const month = curr.date.substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { uniqueVisitors: 0, pageViews: 0 };
        }
        acc[month].uniqueVisitors += curr.uniqueVisitors;
        acc[month].pageViews += curr.pageViews;
        return acc;
      }, {} as Record<string, { uniqueVisitors: number; pageViews: number }>);

      return { daily, monthly };
    }),

  /**
   * 최근 문서 10개 조회
   * - REQ-ADMIN2-002: 최근 문서 위젯
   * - REQ-ADMIN2-010: 인덱스 기반 쿼리 (boardId, status, regdate 인덱스 활용)
   * - REQ-ADMIN2-007: 개별 위젯 장애 격리
   */
  getRecentDocuments: protectedAdminProcedure
    .input(z.object({
      siteId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      // REQ-ADMIN2-010: 복합 인덱스 [boardId, status, regdate(sort: Desc)] 활용
      const documents = await ctx.prisma.document.findMany({
        where: {
          board: {
            moduleInstance: {
              siteId: input.siteId,
              moduleCode: 'board', // 게시판 모듈만
            },
          },
          status: { not: 'TEMP' }, // 임시 저장본 제외
        },
        include: {
          board: {
            include: {
              moduleInstance: true,
            },
          },
          author: {
            select: {
              id: true,
              nickName: true,
            },
          },
        },
        orderBy: { regdate: 'desc' },
        take: 10,
      });

      return documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        author: doc.author?.nickName ?? '알 수 없음',
        boardName: doc.board.moduleInstance.name,
        boardMid: doc.board.moduleInstance.mid,
        regdate: doc.regdate,
      }));
    }),

  /**
   * 최근 댓글 10개 조회
   * - REQ-ADMIN2-003: 최근 댓글 위젯
   * - REQ-ADMIN2-010: 인덱스 기반 쿼리 (documentId, listOrder 인덱스 활용)
   * - REQ-ADMIN2-007: 개별 위젯 장애 격리
   */
  getRecentComments: protectedAdminProcedure
    .input(z.object({
      siteId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      // REQ-ADMIN2-010: documentId, listOrder 인덱스 활용
      // 전체 게시판의 댓글을 regdate 내림차순으로 조회
      // Comment.boardId 는 단순 컬럼이며 Board 관계가 없으므로, document → board 경로로 조인한다.
      const comments = await ctx.prisma.comment.findMany({
        where: {
          document: {
            board: {
              moduleInstance: {
                siteId: input.siteId,
                moduleCode: 'board',
              },
            },
          },
          deletedAt: null, // 삭제되지 않은 댓글만
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              board: {
                select: {
                  moduleInstance: {
                    select: { name: true, mid: true },
                  },
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              nickName: true,
            },
          },
        },
        orderBy: { regdate: 'desc' },
        take: 10,
      });

      return comments.map(comment => ({
        id: comment.id,
        content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
        author: comment.author?.nickName ?? '알 수 없음',
        documentId: comment.documentId,
        documentTitle: comment.document.title,
        boardName: comment.document.board.moduleInstance.name,
        boardMid: comment.document.board.moduleInstance.mid,
        regdate: comment.regdate,
      }));
    }),

  /**
   * 위젯 표시 여부 조회
   * - REQ-ADMIN2-008: 관리자 계정별 위젯 표시 여부 (JSON 형식)
   */
  getWidgetPrefs: protectedAdminProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { dashboardWidgetPrefs: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 기본값 반환 (모든 위젯 표시)
      const prefs = user.dashboardWidgetPrefs as Record<string, boolean> | null;
      return {
        visitStats: prefs?.visitStats ?? true,
        recentDocuments: prefs?.recentDocuments ?? true,
        recentComments: prefs?.recentComments ?? true,
        updateNotification: prefs?.updateNotification ?? true,
        summaryCounterStrip: prefs?.summaryCounterStrip ?? true,
      };
    }),

  /**
   * 위젯 표시 여부 업데이트
   * - REQ-ADMIN2-008: 관리자 계정별 위젯 표시 여부 업데이트
   */
  updateWidgetPrefs: protectedAdminProcedure
    .input(z.object({
      visitStats: z.boolean().optional(),
      recentDocuments: z.boolean().optional(),
      recentComments: z.boolean().optional(),
      updateNotification: z.boolean().optional(),
      summaryCounterStrip: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 기존 설정 가져오기
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { dashboardWidgetPrefs: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 기존 값과 병합
      const existingPrefs = user.dashboardWidgetPrefs as Record<string, boolean> | null;
      const updatedPrefs = {
        ...(existingPrefs || {}),
        ...input,
      };

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { dashboardWidgetPrefs: updatedPrefs as unknown as Prisma.JsonObject },
      });

      return updatedPrefs;
    }),
});
