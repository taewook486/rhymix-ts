/**
 * Empty State Components
 *
 * Reusable empty state components for consistent UI when no data is available.
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Inbox,
  FileText,
  Users,
  Search,
  FolderOpen,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}

// Preset empty states for common use cases

interface EmptyPostsProps {
  onCreateNew?: () => void
}

export function EmptyPosts({ onCreateNew }: EmptyPostsProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No posts yet"
      description="Get started by creating your first post."
      action={onCreateNew ? { label: 'Create Post', onClick: onCreateNew } : undefined}
    />
  )
}

interface EmptyMembersProps {
  onInvite?: () => void
}

export function EmptyMembers({ onInvite }: EmptyMembersProps) {
  return (
    <EmptyState
      icon={Users}
      title="No members found"
      description="Invite members to join your community."
      action={onInvite ? { label: 'Invite Member', onClick: onInvite } : undefined}
    />
  )
}

interface EmptySearchResultsProps {
  query?: string
  onClear?: () => void
}

export function EmptySearchResults({ query, onClear }: EmptySearchResultsProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `No results found for "${query}". Try a different search term.`
          : 'Try adjusting your search or filters.'
      }
      action={onClear ? { label: 'Clear Filters', onClick: onClear } : undefined}
    />
  )
}

interface EmptyFolderProps {
  onUpload?: () => void
}

export function EmptyFolder({ onUpload }: EmptyFolderProps) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="This folder is empty"
      description="Upload files to get started."
      action={onUpload ? { label: 'Upload Files', onClick: onUpload } : undefined}
    />
  )
}

interface EmptyErrorProps {
  message?: string
  onRetry?: () => void
}

export function EmptyError({ message, onRetry }: EmptyErrorProps) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || 'An error occurred while loading data.'}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  )
}
