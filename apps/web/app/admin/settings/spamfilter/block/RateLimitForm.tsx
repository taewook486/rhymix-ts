'use client';
/**
 * 속도 제한 설정 폼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-123.
 */
import { useState } from 'react';
import { useActionState } from 'react';
import { updateRateLimitAction, type ActionState } from './actions';
import { Button } from '@rhymix-ts/ui/components';
import { Input } from '@rhymix-ts/ui/components';
import { Checkbox } from '@rhymix-ts/ui/components';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@rhymix-ts/ui/components';
import { toast } from 'sonner';

const initialActionState: ActionState = {};

type SpamRule = {
  id: number;
  actionType: string;
  maxSubmissions: number;
  windowSeconds: number;
  enabled: boolean;
};

export function RateLimitForm({ initialRules }: { initialRules: SpamRule[] }) {
  const [rules, setRules] = useState(initialRules);

  // Track local state for each rule
  const [localStates, setLocalStates] = useState<Record<number, { max: number; window: number }>>(
    rules.reduce((acc, rule) => ({
      ...acc,
      [rule.id]: { max: rule.maxSubmissions, window: rule.windowSeconds }
    }), {})
  );

  const [updateState, updateRuleFormAction, isPending] = useActionState(
    updateRateLimitAction,
    initialActionState,
  );

  return (
    <div className="space-y-6">
      {updateState.error && (
        <p className="text-sm text-red-600" role="alert">{updateState.error}</p>
      )}
      {updateState.success && (
        <p className="text-sm text-green-600" role="status">속도 제한 설정이 저장되었습니다.</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>액션</TableHead>
            <TableHead>제한 (회/초)</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const localState = localStates[rule.id];
            if (!localState) return null;

            return (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.actionType}</TableCell>
                <TableCell>
                  <form action={updateRuleFormAction} className="flex items-center gap-2">
                    <input type="hidden" name="actionType" value={rule.actionType} />
                    <input type="hidden" name="enabled" value={rule.enabled.toString()} />

                    <Input
                      type="number"
                      name="maxSubmissions"
                      min={1}
                      value={localState.max}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value) || 1;
                        setLocalStates(prev => ({
                          ...prev,
                          [rule.id]: { max: newMax, window: prev[rule.id]?.window || 60 }
                        }));
                      }}
                      className="w-20"
                    />
                    <span>회 /</span>
                    <Input
                      type="number"
                      name="windowSeconds"
                      min={1}
                      value={localState.window}
                      onChange={(e) => {
                        const newWindow = parseInt(e.target.value) || 1;
                        setLocalStates(prev => ({
                          ...prev,
                          [rule.id]: { max: prev[rule.id]?.max || 5, window: newWindow }
                        }));
                      }}
                      className="w-20"
                    />
                    <span>초</span>
                  </form>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={rule.enabled}
                    onCheckedChange={(checked) => {
                      const newChecked = checked as boolean;
                      setRules(rules.map(r => r.id === rule.id ? { ...r, enabled: newChecked } : r));
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <form action={updateRuleFormAction}>
                    <input type="hidden" name="actionType" value={rule.actionType} />
                    <input type="hidden" name="maxSubmissions" value={localState.max} />
                    <input type="hidden" name="windowSeconds" value={localState.window} />
                    <input type="hidden" name="enabled" value={rule.enabled.toString()} />
                    <Button
                      size="sm"
                      type="submit"
                      disabled={isPending}
                    >
                      저장
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
