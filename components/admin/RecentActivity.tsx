'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, MessageSquare, UserPlus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Activity {
  id: string
  type: 'post' | 'comment' | 'member'
  title: string
  user_name: string | null
  created_at: string
}

export interface RecentActivityProps {
  activities: Activity[]
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString()
}

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'post':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'comment':
      return <MessageSquare className="h-4 w-4 text-green-500" />
    case 'member':
      return <UserPlus className="h-4 w-4 text-purple-500" />
  }
}

function getActivityLabel(type: Activity['type']): string {
  switch (type) {
    case 'post':
      return 'New post'
    case 'comment':
      return 'New comment'
    case 'member':
      return 'New member'
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions from your community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No recent activity</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions from your community</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3">
              <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatRelativeTime(activity.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      activity.type === 'post' && 'bg-blue-100 text-blue-700',
                      activity.type === 'comment' && 'bg-green-100 text-green-700',
                      activity.type === 'member' && 'bg-purple-100 text-purple-700'
                    )}
                  >
                    {getActivityLabel(activity.type)}
                  </span>
                  {activity.user_name && <span>by {activity.user_name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
