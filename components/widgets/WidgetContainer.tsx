'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WidgetContainerProps } from './types'

/**
 * WidgetContainer
 *
 * Reusable container component for widgets with consistent styling.
 * Provides title, description, and "More" link functionality.
 */
export function WidgetContainer({
  children,
  title,
  description,
  showMoreLink = false,
  moreLink,
  className,
  action,
  highlighted = false,
}: WidgetContainerProps) {
  return (
    <Card
      className={cn(
        'transition-colors',
        highlighted && 'border-l-4 border-l-primary bg-primary/5',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn('text-lg', highlighted && 'text-primary')}>
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {showMoreLink && moreLink && (
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href={moreLink}>
                More
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
          {action && !showMoreLink && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
