'use client';
/**
 * 차단 IP 관리 폼 (Client Component) — SPEC-ADMIN-002 REQ-ADMIN2-120.
 */
import { useState } from 'react';
import { useActionState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { addDeniedIpAction, removeDeniedIpAction, type ActionState } from './actions';
import { Button } from '@rhymix-ts/ui/components';
import { Input } from '@rhymix-ts/ui/components';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@rhymix-ts/ui/components';
import { toast } from 'sonner';

const initialActionState: ActionState = {};

type DeniedIp = {
  id: number;
  ipPattern: string;
  createdAt: Date;
};

export function DeniedIpForm({ initialIps }: { initialIps: DeniedIp[] }) {
  const [ips, setIps] = useState(initialIps);
  const [newIp, setNewIp] = useState('');

  const [addState, addFormAction, isAddPending] = useActionState(
    addDeniedIpAction,
    initialActionState,
  );
  const [removeState, removeFormAction, isRemovePending] = useActionState(
    removeDeniedIpAction,
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
          name="ipPattern"
          placeholder="IP 주소 또는 CIDR (예: 192.168.1.0/24)"
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
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
            <TableHead>IP 패턴</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ips.map((ip) => (
            <TableRow key={ip.id}>
              <TableCell className="font-mono">{ip.ipPattern}</TableCell>
              <TableCell>{new Date(ip.createdAt).toLocaleDateString('ko-KR')}</TableCell>
              <TableCell className="text-right">
                <form action={removeFormAction}>
                  <input type="hidden" name="id" value={ip.id} />
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
          {ips.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                차단된 IP가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
