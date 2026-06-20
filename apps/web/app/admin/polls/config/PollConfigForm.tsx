'use client';
/**
 * 설문 전역 설정 폼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-086.
 */
import { useActionState } from 'react';
import { updatePollConfigAction, type ActionState } from './actions';
import { Button, Checkbox, Label } from '@rhymix-ts/ui/components';

const initialActionState: ActionState = {};

export function PollConfigForm({
  initial,
}: {
  initial: { allowGuestVote: boolean; duplicateVotePolicy: 'by-member' | 'by-ip' | 'by-cookie' };
}) {
  const [state, formAction, isPending] = useActionState(
    updatePollConfigAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="space-y-6 max-w-md">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600" role="status">저장되었습니다.</p>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="allowGuestVote"
          name="allowGuestVote"
          defaultChecked={initial.allowGuestVote}
        />
        <Label htmlFor="allowGuestVote">비회원 투표 허용 (신규 설문 기본값)</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duplicateVotePolicy">중복 투표 방지 방식 (신규 설문 기본값)</Label>
        <select
          id="duplicateVotePolicy"
          name="duplicateVotePolicy"
          defaultValue={initial.duplicateVotePolicy}
          className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm"
        >
          <option value="by-member">회원 기준 (1인 1투표)</option>
          <option value="by-ip">IP 기준</option>
          <option value="by-cookie">쿠키 기준</option>
        </select>
      </div>

      <Button type="submit" disabled={isPending}>
        저장
      </Button>
    </form>
  );
}
