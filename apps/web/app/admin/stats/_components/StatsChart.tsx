/**
 * 방문자 통계 차트 컴포넌트 — SPEC-ADMIN-002 REQ-ADMIN2-140.
 *
 * 일별/월별 방문 차트를 표시하는 React 컴포넌트.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-140
 */
'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc/client'
import { Button } from '@rhymix-ts/ui/components'

interface StatsChartProps {
  initialStats: {
    daily: Array<{ date: string; uniqueVisitors: number; pageViews: number }>
    summary: {
      totalUniqueVisitors: number
      totalPagesViews: number
      averageDailyVisitors: number
    }
  }
  siteId: number
}

export function StatsChart({ initialStats, siteId }: StatsChartProps) {
  const [days, setDays] = useState(30)
  const { data, isLoading } = api.admin.stats.getDetailedStats.useQuery({
    siteId,
    // If startDate is provided, it will use that instead of days
  })

  const stats = data || initialStats

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500 mb-2">총 방문자</p>
          <p className="text-3xl font-bold text-zinc-900">
            {stats.summary.totalUniqueVisitors.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500 mb-2">총 페이지뷰</p>
          <p className="text-3xl font-bold text-zinc-900">
            {stats.summary.totalPagesViews.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <p className="text-sm text-zinc-500 mb-2">일일 평균 방문자</p>
          <p className="text-3xl font-bold text-zinc-900">
            {stats.summary.averageDailyVisitors.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={days === 7 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDays(7)}
        >
          7일
        </Button>
        <Button
          variant={days === 30 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDays(30)}
        >
          30일
        </Button>
        <Button
          variant={days === 90 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDays(90)}
        >
          90일
        </Button>
        <Button
          variant={days === 365 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDays(365)}
        >
          1년
        </Button>
      </div>

      {/* Daily Visit Chart */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h3 className="text-lg font-semibold mb-4">일별 방문자 추이</h3>
        {isLoading ? (
          <p className="text-sm text-zinc-500">로딩 중...</p>
        ) : (
          <div className="space-y-2">
            {/* Simple bar chart representation */}
            {stats.daily.slice(0, days).map((day) => {
              const maxVisitors = Math.max(...stats.daily.map((d) => d.uniqueVisitors))
              const barWidth = maxVisitors > 0 ? (day.uniqueVisitors / maxVisitors) * 100 : 0

              return (
                <div key={day.date} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-zinc-500">{day.date}</div>
                  <div className="flex-1 bg-zinc-100 rounded h-8 relative">
                    <div
                      className="bg-blue-500 h-full rounded"
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {day.uniqueVisitors}명 / {day.pageViews}뷰
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* TODO: Add monthly chart and referrer breakdown in future phase */}
    </div>
  )
}
