/**
 * poll 위젯 — SPEC-POLL-001 REQ-POLL-004
 *
 * 페이지/레이아웃 어디에나 배치 가능한 독립 설문 위젯.
 * 읽기 전용 미리보기(질문 + 결과 막대)만 표시하고, 실시간 투표는
 * 지원하지 않는다 — packages/core는 apps/web 전용 tRPC 클라이언트에
 * 의존할 수 없기 때문. 연결된 게시물이 있으면 그리로 이동하는 링크를 보여준다.
 *
 * @MX:SPEC: SPEC-POLL-001 REQ-POLL-004
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import type { WidgetDefinition, WidgetRenderContext } from '../../types';

const pollResultOptionSchema = z.object({
  id: z.number(),
  label: z.string(),
  voteCount: z.number(),
  percentage: z.number(),
});

// @MX:NOTE: [AUTO] 위젯 props 스키마 — Zod 런타임 검증
export const pollWidgetPropsSchema = z.object({
  /** 연결할 설문 ID (위젯 설정값) */
  pollId: z.coerce.number().int().positive(),
  /** 설문 제목 표시 여부 (기본 true) */
  showTitle: z.coerce.boolean().default(true).optional(),
  /**
   * 렌더 파이프라인이 resolveContextProps로 주입하는 설문 결과.
   * 토큰 속성으로는 전달될 수 없으므로 항상 optional — 미주입/설문 없음 시
   * 빈 상태 UI를 표시한다.
   */
  results: z
    .object({
      title: z.string(),
      description: z.string().nullable().optional(),
      totalVotes: z.number(),
      options: z.array(pollResultOptionSchema),
      voteUrl: z.string().nullable(),
    })
    .optional(),
});

export type PollWidgetProps = z.infer<typeof pollWidgetPropsSchema>;

/**
 * REQ-POLL-004: 독립 설문 위젯 — 질문 + 결과 막대 그래프를 표시하고,
 * 연결된 게시물이 있으면 투표하러 가기 링크를 보여준다.
 */
export function PollRegistryWidget(props: PollWidgetProps) {
  const { showTitle = true, results } = props;

  if (!results) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded text-center text-gray-500">
        설문을 찾을 수 없습니다.
      </div>
    );
  }

  const { title, description, totalVotes, options, voteUrl } = results;

  return (
    <div className="border rounded-lg p-4 bg-white" data-testid="poll-registry-widget">
      {showTitle && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

      <p className="text-sm font-medium mb-2">총 투표수: {totalVotes}표</p>

      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{option.label}</span>
              <span>
                {option.voteCount}표 ({option.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {voteUrl && (
        <Link
          href={voteUrl}
          className="inline-block mt-4 text-sm text-blue-600 hover:underline"
        >
          투표하러 가기 →
        </Link>
      )}
    </div>
  );
}

// @MX:ANCHOR: [AUTO] pollWidget — 빌트인 등록 배럴에서 fan_in >= 3
// @MX:REASON: registerBuiltinWidgets, 렌더 파이프라인, 테스트에서 참조
// @MX:SPEC: SPEC-POLL-001 REQ-POLL-004
export const pollWidget: WidgetDefinition<PollWidgetProps> = {
  name: 'poll',
  displayName: '설문조사',
  description: '지정한 설문의 질문과 실시간 결과를 표시하는 위젯 (읽기 전용, 투표는 원문 게시물에서)',
  propsSchema: pollWidgetPropsSchema,
  Component: PollRegistryWidget,
  defaultProps: {
    showTitle: true,
  },
  category: 'content',
  resolveContextProps: async (
    ctx: WidgetRenderContext,
    props?: PollWidgetProps,
  ): Promise<Partial<PollWidgetProps>> => {
    const pollId = props?.pollId;
    if (pollId == null) return {};

    const poll = await ctx.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!poll) return {};

    const votes = await ctx.prisma.pollVote.findMany({
      where: { pollId },
      select: { pollOptionId: true },
    });
    const totalVotes = votes.length;
    const voteCountByOption = new Map<number, number>();
    for (const vote of votes) {
      voteCountByOption.set(
        vote.pollOptionId,
        (voteCountByOption.get(vote.pollOptionId) ?? 0) + 1,
      );
    }

    const options = poll.options.map((option) => {
      const voteCount = voteCountByOption.get(option.id) ?? 0;
      return {
        id: option.id,
        label: option.label,
        voteCount,
        percentage: totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0,
      };
    });

    // 연결된 게시물이 있으면 투표 링크를 만든다 (없으면 결과만 표시).
    const documentPoll = await ctx.prisma.documentPoll.findFirst({
      where: { pollId },
      select: {
        documentId: true,
        document: {
          select: { board: { select: { moduleInstance: { select: { mid: true } } } } },
        },
      },
    });
    const voteUrl =
      documentPoll?.document.board.moduleInstance.mid != null
        ? `/${documentPoll.document.board.moduleInstance.mid}/${documentPoll.documentId}`
        : null;

    return {
      results: {
        title: poll.title,
        description: poll.description,
        totalVotes,
        options,
        voteUrl,
      },
    };
  },
};
