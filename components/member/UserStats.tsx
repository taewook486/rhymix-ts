'use client'

import { FileText, MessageSquare, ThumbsUp, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UserStatsProps {
  postsCount?: number
  commentsCount?: number
  likesReceived?: number
  points?: number
}

export function UserStats({
  postsCount = 0,
  commentsCount = 0,
  likesReceived = 0,
  points = 0,
}: UserStatsProps) {
  const stats = [
    {
      label: 'Posts',
      value: postsCount,
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      label: 'Comments',
      value: commentsCount,
      icon: MessageSquare,
      color: 'text-green-500',
    },
    {
      label: 'Likes',
      value: likesReceived,
      icon: ThumbsUp,
      color: 'text-red-500',
    },
    {
      label: 'Points',
      value: points,
      icon: Award,
      color: 'text-yellow-500',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className={`rounded-full bg-muted p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
