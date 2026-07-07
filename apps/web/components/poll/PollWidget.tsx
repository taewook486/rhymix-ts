/**
 * PollWidget — 독립 설문 위젯 컴포넌트 (SPEC-POLL-001)
 *
 * REQ-POLL-004: 페이지/레이아웃 어디에나 배치 가능한 독립 설문 위젯
 * AC-POLL-005: 설문 위젯을 페이지에 배치하면 설문이 렌더된다
 */
'use client';

import { PollDisplay } from './PollDisplay';

interface PollWidgetProps {
  pollId: number;
  memberId?: number | null;
  voterIp?: string | null;
  title?: string;
  showTitle?: boolean;
}

export function PollWidget({
  pollId,
  memberId,
  voterIp,
  title,
  showTitle = true,
}: PollWidgetProps) {
  return (
    <div className="poll-widget">
      {showTitle && title && (
        <h2 className="text-xl font-bold mb-4">{title}</h2>
      )}
      <PollDisplay pollId={pollId} memberId={memberId} voterIp={voterIp} />
    </div>
  );
}

export default PollWidget;
