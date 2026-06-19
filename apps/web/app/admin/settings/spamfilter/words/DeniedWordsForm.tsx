'use client';
/**
 * 금지어 관리 폼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-121.
 */
import { useState } from 'react';
import { useActionState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { addDeniedWordAction, removeDeniedWordAction, type ActionState } from './actions';
import { Button } from '@rhymix-ts/ui/components';
import { Input } from '@rhymix-ts/ui/components';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@rhymix-ts/ui/components';
import { toast } from 'sonner';

const initialActionState: ActionState = {};

type DeniedWord = {
  id: number;
  word: string;
  createdAt: Date;
};

export function DeniedWordsForm({ initialWords }: { initialWords: DeniedWord[] }) {
  const [words, setWords] = useState(initialWords);
  const [newWord, setNewWord] = useState('');

  const [addState, addFormAction, isAddPending] = useActionState(
    addDeniedWordAction,
    initialActionState,
  );
  const [removeState, removeFormAction, isRemovePending] = useActionState(
    removeDeniedWordAction,
    initialActionState,
  );

  return (
    <div className="space-y-6">
      {addState.error && (
        <p className="text-sm text-red-600" role="alert">{addState.error}</p>
      )}
      {removeState.error && (
        <p className="text-sm text-red-600" role="alert">{removeState.error}</p>
      )}

      <form action={addFormAction} className="flex gap-2">
        <Input
          name="word"
          placeholder="금지어 입력"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          className="max-w-md"
        />
        <Button type="submit" disabled={isAddPending}>
          <Plus className="w-4 h-4 mr-2" />
          추가
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>금지어</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word.id}>
              <TableCell className="font-mono">{word.word}</TableCell>
              <TableCell>{new Date(word.createdAt).toLocaleDateString('ko-KR')}</TableCell>
              <TableCell className="text-right">
                <form action={removeFormAction}>
                  <input type="hidden" name="id" value={word.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="submit"
                    disabled={isRemovePending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {words.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                금지어가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
