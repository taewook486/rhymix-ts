'use client';
/**
 * 설문 ↔ 게시물 연결 폼 (Client Component) — SPEC-POLL-001 REQ-POLL-001.
 */
import { useActionState } from 'react';
import {
  attachPollToDocumentAction,
  detachPollFromDocumentAction,
  type ActionState,
} from '../../actions';
import { Button, Input, Label } from '@rhymix-ts/ui/components';

const initialActionState: ActionState = {};

export function DocumentLinkForm({
  pollId,
  linkedDocumentId,
}: {
  pollId: number;
  linkedDocumentId: number | null;
}) {
  const [attachState, attachFormAction, attachPending] = useActionState(
    attachPollToDocumentAction,
    initialActionState,
  );
  const [detachState, detachFormAction, detachPending] = useActionState(
    detachPollFromDocumentAction,
    initialActionState,
  );

  const errorMessage = attachState.error ?? detachState.error;

  return (
    <div className="space-y-2 border border-zinc-200 rounded-lg p-4 max-w-xl">
      <Label>게시물 연결</Label>

      {linkedDocumentId != null ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-700">
            현재 게시물 #{linkedDocumentId}에 연결되어 있습니다.
          </p>
          <form action={detachFormAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <input type="hidden" name="documentId" value={linkedDocumentId} />
            <Button type="submit" variant="outline" size="sm" disabled={detachPending}>
              연결 해제
            </Button>
          </form>
        </div>
      ) : (
        <form action={attachFormAction} className="flex items-end gap-2">
          <input type="hidden" name="pollId" value={pollId} />
          <div className="space-y-1">
            <Label htmlFor="documentId">게시물 ID</Label>
            <Input id="documentId" name="documentId" type="number" min={1} required className="w-32" />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={attachPending}>
            연결
          </Button>
        </form>
      )}

      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
