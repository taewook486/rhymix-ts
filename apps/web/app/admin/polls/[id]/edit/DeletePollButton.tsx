'use client';
/**
 * 설문 삭제 버튼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-084 보조.
 */
import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { deletePollAction, type ActionState } from '../../actions';
import { Button } from '@rhymix-ts/ui/components';

const initialActionState: ActionState = {};

export function DeletePollButton({ id }: { id: number }) {
  const [state, formAction, isPending] = useActionState(deletePollAction, initialActionState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      {state.error && <p className="text-sm text-red-600 mb-2" role="alert">{state.error}</p>}
      <Button type="submit" variant="destructive" disabled={isPending}>
        <Trash2 className="w-4 h-4 mr-2" />
        설문 삭제
      </Button>
    </form>
  );
}
