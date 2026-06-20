/**
 * 설문 목록 page — SPEC-ADMIN-002 REQ-ADMIN2-083
 *
 * 설문 목록 조회 (제목/상태/투표수/기간).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-083
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { getServerCaller } from '@/lib/trpc/server';
import { Button } from '@rhymix-ts/ui/components';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@rhymix-ts/ui/components';
import { Plus, Settings, BarChart3, Pencil } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: '시작 전',
  open: '진행 중',
  closed: '종료',
};

export default async function PollListPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const polls = await caller.admin.poll.list();

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">설문 관리</h1>
          <p className="text-muted-foreground">생성된 설문 목록과 진행 상태를 확인합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/polls/config">
              <Settings className="w-4 h-4 mr-2" />
              설문 설정
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/polls/new">
              <Plus className="w-4 h-4 mr-2" />
              설문 생성
            </Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>투표수</TableHead>
            <TableHead>기간</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {polls.map((poll) => (
            <TableRow key={poll.id}>
              <TableCell className="font-medium">{poll.title}</TableCell>
              <TableCell>{STATUS_LABEL[poll.status] ?? poll.status}</TableCell>
              <TableCell>{poll.voteCount}</TableCell>
              <TableCell>
                {new Date(poll.startAt).toLocaleDateString('ko-KR')} ~{' '}
                {new Date(poll.endAt).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={`/admin/polls/${poll.id}/edit`}>
                    <Pencil className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <Link href={`/admin/polls/${poll.id}/results`}>
                    <BarChart3 className="w-4 h-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {polls.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                생성된 설문이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}
