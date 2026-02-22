'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CalendarWidgetProps {
  config: {
    title: string
    showPostCount: boolean
  }
  title: string
}

export function CalendarWidget({ config, title }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [postCounts, setPostCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    loadPostCounts()
  }, [currentDate])

  const loadPostCounts = async () => {
    if (!config.showPostCount) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('posts')
        .select('created_at')
        .eq('status', 'published')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach((post) => {
        const date = new Date(post.created_at).getDate()
        counts[date] = (counts[date] || 0) + 1
      })

      setPostCounts(counts)
    } catch (err) {
      console.error('Failed to load post counts:', err)
    }
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const today = new Date()

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <button onClick={prevMonth} className="hover:text-primary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            className="cursor-pointer hover:text-primary transition-colors"
            onClick={goToToday}
          >
            {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
          </span>
          <button onClick={nextMonth} className="hover:text-primary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className={`text-center text-xs font-medium ${
                  day === '일' ? 'text-red-500' : day === '토' ? 'text-blue-500' : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const count = postCounts[day] || 0

              return (
                <div
                  key={day}
                  className={`
                    aspect-square flex items-center justify-center rounded relative
                    ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : ''}
                    ${!isToday(day) && 'hover:bg-muted cursor-pointer'}
                  `}
                >
                  <Link
                    href={`/archives?date=${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
                    className="w-full h-full flex items-center justify-center"
                  >
                    {day}
                    {config.showPostCount && count > 0 && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
