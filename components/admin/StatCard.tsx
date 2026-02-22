'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: number | string
  description: string
  icon: React.ReactNode
  href?: string
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
}

export function StatCard({ title, value, description, icon, href, trend }: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus

  const content = (
    <Card className={cn('h-full', href && 'hover:shadow-md transition-shadow cursor-pointer')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <div
              className={cn(
                'flex items-center text-xs',
                trend.direction === 'up' && 'text-green-600',
                trend.direction === 'down' && 'text-red-600',
                trend.direction === 'neutral' && 'text-muted-foreground'
              )}
            >
              <TrendIcon className="mr-1 h-3 w-3" />
              {trend.value > 0 && '+'}
              {trend.value}% {trend.label}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
