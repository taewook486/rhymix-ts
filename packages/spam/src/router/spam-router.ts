/**
 * SPEC-SPAM-001: 스팸 필터 Public tRPC Router
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-001~004
 * @MX:ANCHOR: [AUTO] 공개 스팸 체크 API - 문서/댓글 작성 전 호출
 * @MX:REASON: 외부 패키지에서 호출하는 공개 API로서 다중 호출자 예상
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type {
  TRPCRouterRecord,
  AnyProcedure,
} from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import { SpamFilter } from '../filter';

/**
 * 인증 필요 프로시저 컨텍스트 타입
 */
type ProCtx = {
  prisma: PrismaClient;
  session: { user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number }> } };
};

/**
 * tRPC 라우터 팩토리에 전달되는 빌딩 블록 타입
 */
export interface TrpcBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: (record: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protectedProcedure: AnyProcedure | any;
}

/**
 * 스팸 필터용 Public 라우터 생성 함수
 *
 * 구현된 프로시저:
 * - check() - 스팸 검사 수행 (REQ-SPAM-001~004)
 * - checkReportThreshold() - 신고 임계치 검사 (REQ-SPAM-003)
 */
export function createSpamRouter<
  _TProcedure extends AnyProcedure,
  TProtectedProcedure extends AnyProcedure
>(trpc: {
  router: <T extends TRPCRouterRecord>(record: T) => T;
  protectedProcedure: TProtectedProcedure;
}) {
  const { router, protectedProcedure } = trpc;

  return router({
    /**
     * 스팸 검사 수행 (REQ-SPAM-001~004)
     *
     * @MX:ANCHOR: [AUTO] 메인 스팸 체크 진입점 - 다른 패키지에서 호출
     * @MX:REASON: 문서/댓글 작성 전 스팸 검사를 위한 공개 API
     */
    check: (protectedProcedure as any)
      .input(
        z.object({
          type: z.enum(['document', 'comment']),
          content: z.string().min(1),
          title: z.string().optional(),
          siteId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          // 기본 설정 (TODO: SiteSetting에서 조회)
          const config = {
            forbiddenWordsEnabled: true,
            urlBlacklistEnabled: true,
            duplicateContentEnabled: true,
            duplicateContentWindowMinutes: 1,
            reportThresholdDocument: 5,
            reportThresholdComment: 5,
            akismetEnabled: false,
            actionOnSpam: 'queue' as const,
          };

          // IP 주소 추출 (TODO: 실제 요청에서 IP 추출)
          const authorIp = ctx.session.user.id.toString(); // 임시: userId를 IP로 사용

          const spamFilter = new SpamFilter(ctx.prisma);

          const checkInput = {
            type: input.type,
            content: input.content,
            title: input.title,
            authorId: ctx.session.user.id,
            authorIp,
            siteId: input.siteId,
          };

          const result = await spamFilter.check(checkInput, config);

          // 스팸이 감지되고 설정이 'queue'인 경우 검토 큐에 추가
          if (result.isSpam && config.actionOnSpam === 'queue') {
            // 검토 큐 추가는 콘텐츠 생성 후 처리 필요
            // 여기서는 결과만 반환
          }

          return result;
        } catch (err) {
          if (err instanceof Error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
          }
          throw err;
        }
      }),

    /**
     * 신고 임계치 검사 (REQ-SPAM-003)
     *
     * @MX:NOTE: [AUTO] 신고 수가 임계치 초과 시 자동 숨김 처리
     */
    checkReportThreshold: (protectedProcedure as any)
      .input(
        z.object({
          type: z.enum(['document', 'comment']),
          contentId: z.number().int().positive(),
          threshold: z.number().int().min(1).max(100).default(5),
        }),
      )
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          const spamFilter = new SpamFilter(ctx.prisma);
          const isThresholdExceeded = await spamFilter.checkReportThreshold(
            input.type,
            input.contentId,
            input.threshold,
          );

          if (isThresholdExceeded) {
            return {
              exceeded: true,
              action: 'hide',
              message: '신고 수가 임계치를 초과하여 콘텐츠가 숨김 처리되었습니다',
            };
          }

          return { exceeded: false };
        } catch (err) {
          if (err instanceof Error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
          }
          throw err;
        }
      }),
  });
}
