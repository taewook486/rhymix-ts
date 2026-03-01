/**
 * Spacing Utilities
 *
 * Consistent spacing components and utilities for layout consistency.
 */

import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

// Stack Component - Vertical spacing between children
interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const gapConfig = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12',
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col', gapConfig[gap], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Stack.displayName = 'Stack'

// Inline Component - Horizontal spacing between children
interface InlineProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  wrap?: boolean
}

export const Inline = forwardRef<HTMLDivElement, InlineProps>(
  ({ className, gap = 'md', wrap = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          gapConfig[gap],
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Inline.displayName = 'Inline'

// Grid Component - Responsive grid layout
interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  responsive?: boolean
}

const colsConfig = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 3, gap = 'md', responsive = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          colsConfig[cols],
          gapConfig[gap],
          responsive && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-' + cols,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Grid.displayName = 'Grid'

// Section Component - Page section with consistent padding
interface SectionProps extends HTMLAttributes<HTMLElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  background?: 'default' | 'muted' | 'card'
}

const sectionPadding = {
  sm: 'py-6',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-24',
}

const sectionBackground = {
  default: '',
  muted: 'bg-muted/50',
  card: 'bg-card border-y',
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, size = 'md', background = 'default', children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          sectionPadding[size],
          sectionBackground[background],
          className
        )}
        {...props}
      >
        {children}
      </section>
    )
  }
)

Section.displayName = 'Section'

// Container Component - Centered container with max width
interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padded?: boolean
}

const containerSize = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'lg', padded = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto',
          containerSize[size],
          padded && 'px-4 sm:px-6 lg:px-8',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = 'Container'

// Divider Component - Horizontal or vertical divider
interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'sm' | 'md' | 'lg'
}

const dividerSpacing = {
  horizontal: {
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-8',
  },
  vertical: {
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-8',
  },
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = 'horizontal', spacing = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-border',
          orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
          dividerSpacing[orientation][spacing],
          className
        )}
        {...props}
      />
    )
  }
)

Divider.displayName = 'Divider'
