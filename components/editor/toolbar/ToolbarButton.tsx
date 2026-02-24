'use client'

import { cn } from '@/lib/utils'

// @MX:NOTE: Reusable toolbar button component
// Provides consistent styling for editor toolbar buttons
interface ToolbarButtonProps {
  active?: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
  disabled?: boolean
}

export function ToolbarButton({ active, onClick, title, children, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'p-2 rounded hover:bg-accent hover:text-accent-foreground',
        'transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        active && 'bg-accent text-accent-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}
