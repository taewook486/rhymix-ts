import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Users, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { getPolls } from '@/app/actions/poll'
import { PollCreator } from '@/components/polls/PollCreator'
import { deletePoll } from '@/app/actions/poll'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Skeleton component
function PollsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

// Delete poll action
async function handleDeletePoll(pollId: string) {
  'use server'
  const result = await deletePoll(pollId)
  if (result.success) {
    revalidatePath('/admin/polls')
  }
  return result
}

// Polls Table Component
function PollsTable({ polls }: { polls: any[] }) {
  if (polls.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        생성된 투표가 없습니다.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>제목</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>참여자</TableHead>
          <TableHead>종료일</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {polls.map((poll) => {
          const isExpired = poll.stop_date && new Date(poll.stop_date) < new Date()

          return (
            <TableRow key={poll.id}>
              <TableCell className="font-medium">{poll.title}</TableCell>
              <TableCell>
                <Badge variant={poll.poll_type === 'single' ? 'default' : 'secondary'}>
                  {poll.poll_type === 'single' ? '단일' : '복수'}
                </Badge>
              </TableCell>
              <TableCell>
                {poll.is_active && !isExpired ? (
                  <Badge variant="default">진행중</Badge>
                ) : (
                  <Badge variant="secondary">종료</Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {poll.total_votes || 0}
                </span>
              </TableCell>
              <TableCell>
                {poll.stop_date ? (
                  <span className="flex items-center gap-1 text-sm">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(poll.stop_date).toLocaleDateString('ko-KR')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">무기한</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <form action={async () => {
                    'use server'
                    await handleDeletePoll(poll.id)
                    redirect('/admin/polls')
                  }}>
                    <Button variant="ghost" size="sm" type="submit">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// Statistics Card Component
function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default async function AdminPollsPage() {
  const result = await getPolls()
  const polls = result.success && result.data ? result.data : []

  const totalPolls = polls.length
  const activePolls = polls.filter((p) => p.is_active).length
  const totalVotes = polls.reduce((sum, p) => sum + (p.total_votes || 0), 0)
  const expiredPolls = polls.filter((p) => p.stop_date && new Date(p.stop_date) < new Date()).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">투표 관리</h1>
          <p className="text-muted-foreground">사이트 투표를 생성하고 관리합니다</p>
        </div>
        <Link href="/admin/polls/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 투표
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="전체 투표"
          value={totalPolls}
          description="생성된 투표 수"
        />
        <StatCard
          title="진행 중"
          value={activePolls}
          description="현재 활성화된 투표"
        />
        <StatCard
          title="총 참여자"
          value={totalVotes}
          description="전체 투표 참여 수"
        />
        <StatCard
          title="종료된 투표"
          value={expiredPolls}
          description="기간 만료된 투표"
        />
      </div>

      {/* Polls Table */}
      <Card>
        <CardHeader>
          <CardTitle>투표 목록</CardTitle>
          <CardDescription>
            생성된 모든 투표를 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PollsSkeleton />}>
            <PollsTable polls={polls} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

// New Poll Page
export async function NewPollPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">새 투표 만들기</h1>
      <PollCreator />
    </div>
  )
}
