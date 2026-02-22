'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { LatestPostsWidget } from './widgets/LatestPostsWidget'
import { LoginFormWidget } from './widgets/LoginFormWidget'
import { CalendarWidget } from './widgets/CalendarWidget'
import { BannerWidget } from './widgets/BannerWidget'
import { PopularPostsWidget } from './widgets/PopularPostsWidget'

export interface SiteWidget {
  id: string
  name: string
  title: string
  type: string
  position: string
  config: Record<string, any>
  is_active: boolean
  order_index: number
}

interface WidgetRendererProps {
  position: string
  className?: string
}

export function WidgetRenderer({ position, className = '' }: WidgetRendererProps) {
  const [widgets, setWidgets] = useState<SiteWidget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWidgets()
  }, [position])

  const loadWidgets = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('site_widgets')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      setWidgets(data || [])
    } catch (err) {
      console.error('Failed to load widgets:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (widgets.length === 0) {
    return null
  }

  return (
    <div className={`widget-container ${className}`}>
      {widgets.map((widget) => (
        <WidgetComponent key={widget.id} widget={widget} />
      ))}
    </div>
  )
}

interface WidgetComponentProps {
  widget: SiteWidget
}

function WidgetComponent({ widget }: WidgetComponentProps) {
  const renderWidget = () => {
    switch (widget.type) {
      case 'latest_posts':
        return <LatestPostsWidget config={widget.config as any} title={widget.title} />
      case 'login_form':
        return <LoginFormWidget config={widget.config as any} title={widget.title} />
      case 'calendar':
        return <CalendarWidget config={widget.config as any} title={widget.title} />
      case 'banner':
        return <BannerWidget config={widget.config as any} title={widget.title} />
      case 'popular_posts':
        return <PopularPostsWidget config={widget.config as any} title={widget.title} />
      default:
        return <div>Unknown widget: {widget.type}</div>
    }
  }

  return (
    <div className="widget-wrapper">
      {renderWidget()}
    </div>
  )
}
