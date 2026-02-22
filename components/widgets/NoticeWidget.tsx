import Link from 'next/link'
import { Bell, ChevronRight } from 'lucide-react'
import { WidgetContainer } from './WidgetContainer'
import { Badge } from '@/components/ui/badge'
import type { NoticeWidgetProps, WidgetPost } from './types'

/**
 * NoticeWidget
 *
 * Displays notice posts with emphasized styling.
 * Features highlighted card design and "NEW" badges for recent notices.
 */
export function NoticeWidget({
  title = 'Notice',
  description,
  showMoreLink = true,
  moreLink,
  className,
  notices = [],
  limit = 5,
}: NoticeWidgetProps) {
  if (notices.length === 0) {
    return null
  }

  const displayedNotices = notices.slice(0, limit)

  return (
    <WidgetContainer
      title={title}
      description={description}
      showMoreLink={showMoreLink}
      moreLink={moreLink}
      className={className}
      highlighted
      action={
        <div className="flex items-center text-primary">
          <Bell className="h-4 w-4 mr-1" />
        </div>
      }
    >
      <div className="space-y-3">
        {displayedNotices.map((notice) => (
          <NoticeItem key={notice.id} notice={notice} />
        ))}
      </div>
    </WidgetContainer>
  )
}

/**
 * Notice item component
 */
function NoticeItem({ notice }: { notice: WidgetPost }) {
  const isNew = isNewNotice(notice.created_at)
  const noticeUrl = notice.board_slug
    ? `/board/${notice.board_slug}/post/${notice.id}`
    : `/board/post/${notice.id}`

  return (
    <Link
      href={noticeUrl}
      className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0 group hover:bg-accent/50 -mx-2 px-2 rounded transition-colors"
    >
      {/* NEW badge or category */}
      {isNew ? (
        <Badge variant="default" className="shrink-0 text-xs bg-primary">
          NEW
        </Badge>
      ) : notice.category ? (
        <Badge variant="outline" className="shrink-0 text-xs">
          {notice.category.name}
        </Badge>
      ) : null}

      {/* Title */}
      <span className="flex-1 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
        {notice.title}
      </span>

      {/* Date */}
      <span className="text-xs text-muted-foreground shrink-0">
        {formatNoticeDate(notice.created_at)}
      </span>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}

/**
 * Check if notice is new (within 24 hours)
 */
function isNewNotice(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours < 24
}

/**
 * Format date for notice display
 */
function formatNoticeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}
