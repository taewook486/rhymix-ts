'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Users, Calendar } from 'lucide-react'
import { votePoll, hasVoted } from '@/app/actions/poll'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Poll {
  id: string
  title: string
  stop_date: string | null
  poll_type: 'single' | 'multiple'
  max_choices: number
  is_active: boolean
  total_votes: number
  created_at: string
}

interface PollItem {
  id: string
  poll_id: string
  title: string
  order_index: number
  vote_count: number
}

interface PollDisplayProps {
  poll: Poll & { items: PollItem[] }
  showResults?: boolean
}

export function PollDisplay({ poll, showResults = false }: PollDisplayProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [votedItemIds, setVotedItemIds] = useState<string[]>([])

  // Check if user has voted
  useEffect(() => {
    (hasVoted as any)(poll.id).then((result: any) => {
      if (result.success && result.data) {
        setHasVoted(true)
        // Get voted items
        const supabase = require('@/lib/supabase/client').createClient()
        supabase
          .from('poll_logs')
          .select('poll_item_id')
          .eq('poll_id', poll.id)
          .then(({ data }: any) => {
            setVotedItemIds(data?.map((l: any) => l.poll_item_id) || [])
          })
      }
    })
  })

  const handleVote = async () => {
    if (selectedItems.length === 0) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '항목을 선택해주세요.',
      })
      return
    }

    setIsVoting(true)

    const result = await votePoll({
      poll_id: poll.id,
      item_ids: selectedItems,
    })

    if (result.success) {
      toast({
        title: '투표 완료',
        description: '투표가 등록되었습니다.',
      })
      setHasVoted(true)
      setVotedItemIds(selectedItems)
      router.refresh()
    } else {
      toast({
        variant: 'destructive',
        title: '오류',
        description: result.error || '투표에 실패했습니다.',
      })
    }

    setIsVoting(false)
  }

  const handleItemClick = (itemId: string) => {
    if (hasVoted) return

    if (poll.poll_type === 'single') {
      setSelectedItems([itemId])
    } else {
      if (selectedItems.includes(itemId)) {
        setSelectedItems(selectedItems.filter((id) => id !== itemId))
      } else {
        if ((poll.max_choices || 1) > selectedItems.length) {
          setSelectedItems([...selectedItems, itemId])
        }
      }
    }
  }

  const totalVotes = poll.items.reduce((sum, item) => sum + item.vote_count, 0) || poll.total_votes
  const isExpired = poll.stop_date && new Date(poll.stop_date) < new Date()
  const canVote = poll.is_active && !isExpired && !hasVoted

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{poll.title}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                총 {totalVotes}명 참여
              </span>
              {poll.stop_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(poll.stop_date), {
                    addSuffix: true,
                    locale: ko,
                  })}
                  {isExpired && ' (종료)'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {poll.is_active && !isExpired ? (
              <Badge variant="default">진행중</Badge>
            ) : (
              <Badge variant="secondary">종료</Badge>
            )}
            {poll.poll_type === 'multiple' && (
              <Badge variant="outline">복수 응답</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {poll.items.map((item) => {
            const percentage = totalVotes > 0 ? (item.vote_count / totalVotes) * 100 : 0
            const isSelected = selectedItems.includes(item.id)
            const hasVotedForItem = votedItemIds.includes(item.id)

            return (
              <div
                key={item.id}
                className={`relative p-3 rounded-lg border-2 transition-colors ${
                  isSelected && canVote
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:bg-muted/50 cursor-pointer'
                } ${hasVoted && !hasVotedForItem ? 'opacity-50' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {canVote && (
                      <div className={`w-4 h-4 rounded border ${
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-muted'
                      } flex items-center justify-center`}>
                        {isSelected && (
                          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    )}
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    <span className="text-sm text-muted-foreground">
                      ({item.vote_count}표)
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
        </div>

        {canVote && (
          <div className="mt-4">
            <Button
              onClick={handleVote}
              disabled={selectedItems.length === 0 || isVoting}
              className="w-full"
            >
              {isVoting ? '투표 중...' : '투표하기'}
            </Button>
          </div>
        )}

        {hasVoted && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
            이미 투표하셨습니다.
          </div>
        )}

        {!poll.is_active && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
            투표가 종료되었습니다.
          </div>
        )}

        {isExpired && poll.is_active && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
            투표 기간이 만료되었습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
