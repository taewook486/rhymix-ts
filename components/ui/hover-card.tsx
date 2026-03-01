/**
 * Hover Card Component
 *
 * Card component with built-in hover effects for consistent interactive feedback.
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { forwardRef, HTMLAttributes } from 'react'

interface HoverCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'glow'
  hoverScale?: boolean
  children: React.ReactNode
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  ({ className, variant = 'default', hoverScale = false, children, ...props }, ref) => {
    const variantStyles = {
      default: 'hover:shadow-md transition-shadow duration-200',
      elevated: 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200',
      bordered: 'hover:border-primary hover:border-2 transition-all duration-200',
      glow: 'hover:shadow-lg hover:shadow-primary/20 transition-shadow duration-200',
    }

    return (
      <Card
        ref={ref}
        className={cn(
          'cursor-pointer',
          variantStyles[variant],
          hoverScale && 'hover:scale-[1.02]',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    )
  }
)

HoverCard.displayName = 'HoverCard'

// Hover Button Component
interface HoverButtonProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: 'lift' | 'glow' | 'scale'
  children: React.ReactNode
}

export const HoverButton = forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ className, variant = 'lift', children, ...props }, ref) => {
    const variantStyles = {
      lift: 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
      glow: 'hover:shadow-lg hover:shadow-primary/30',
      scale: 'hover:scale-105 active:scale-100',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'transition-all duration-200',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

HoverButton.displayName = 'HoverButton'

// Interactive List Item
interface HoverListItemProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean
  children: React.ReactNode
}

export const HoverListItem = forwardRef<HTMLDivElement, HoverListItemProps>(
  ({ className, selected = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-4 py-3 rounded-lg transition-colors duration-150 cursor-pointer',
          'hover:bg-accent hover:text-accent-foreground',
          selected && 'bg-accent text-accent-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

HoverListItem.displayName = 'HoverListItem'

// Hover Icon Wrapper
interface HoverIconProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

export const HoverIcon = forwardRef<HTMLSpanElement, HoverIconProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center p-2 rounded-full',
          'hover:bg-accent transition-colors duration-150',
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

HoverIcon.displayName = 'HoverIcon'
