'use client';
/**
 * 설문 생성/수정 폼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-084.
 */
import { useState } from 'react';
import { useActionState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createPollAction, updatePollAction, type ActionState } from './actions';
import { Button, Input, Label, Checkbox, Textarea } from '@rhymix-ts/ui/components';

const initialActionState: ActionState = {};

type PollOptionFormValue = {
  key: string;
  label: string;
};

export type PollFormInitialValue = {
  id?: number;
  title: string;
  description?: string | null;
  allowGuestVote: boolean;
  allowMultipleChoice: boolean;
  duplicateVotePolicy: 'by-member' | 'by-ip' | 'by-cookie';
  startAt: Date | string;
  endAt: Date | string;
  options?: { label: string }[];
};

function toDateTimeLocalValue(value: Date | string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

let optionKeySeq = 0;
function nextOptionKey(): string {
  optionKeySeq += 1;
  return `option-${optionKeySeq}`;
}

export function PollForm({ initial }: { initial?: PollFormInitialValue }) {
  const isEdit = initial?.id !== undefined;
  const action = isEdit ? updatePollAction : createPollAction;
  const [state, formAction, isPending] = useActionState(action, initialActionState);

  const [options, setOptions] = useState<PollOptionFormValue[]>(() => {
    const initialOptions = initial?.options ?? [{ label: '' }, { label: '' }];
    return initialOptions.map((option) => ({ key: nextOptionKey(), label: option.label }));
  });

  const addOption = () => {
    setOptions((prev) => [...prev, { key: nextOptionKey(), label: '' }]);
  };

  const removeOption = (key: string) => {
    setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.key !== key) : prev));
  };

  const updateOptionLabel = (key: string, label: string) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, label } : o)));
  };

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {state.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600" role="status">저장되었습니다.</p>
      )}

      {isEdit && <input type="hidden" name="id" value={initial?.id} />}

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" defaultValue={initial?.title ?? ''} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ''}
        />
      </div>

      <div className="space-y-2">
        <Label>설문 옵션</Label>
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.key} className="flex gap-2">
              <Input
                name="optionLabel"
                value={option.label}
                onChange={(e) => updateOptionLabel(option.key, e.target.value)}
                placeholder="옵션 내용"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(option.key)}
                disabled={options.length <= 2}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="w-4 h-4 mr-2" />
          옵션 추가
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="allowMultipleChoice"
          name="allowMultipleChoice"
          defaultChecked={initial?.allowMultipleChoice ?? false}
        />
        <Label htmlFor="allowMultipleChoice">복수 선택 허용</Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="allowGuestVote"
          name="allowGuestVote"
          defaultChecked={initial?.allowGuestVote ?? false}
        />
        <Label htmlFor="allowGuestVote">비회원 투표 허용</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duplicateVotePolicy">중복 투표 방지 방식</Label>
        <select
          id="duplicateVotePolicy"
          name="duplicateVotePolicy"
          defaultValue={initial?.duplicateVotePolicy ?? 'by-member'}
          className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm"
        >
          <option value="by-member">회원 기준 (1인 1투표)</option>
          <option value="by-ip">IP 기준</option>
          <option value="by-cookie">쿠키 기준</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startAt">시작 시각</Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(initial?.startAt)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endAt">종료 시각</Label>
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(initial?.endAt)}
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isEdit ? '수정' : '생성'}
      </Button>
    </form>
  );
}
