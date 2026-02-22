import Link from 'next/link'
import { WidgetContainer } from './WidgetContainer'
import type { RecentPostsWidgetProps, WidgetPost } from './types'

/**
 * RecentPostsWidget
 *
 * Displays a list of recent posts from a board.
 * Supports optional thumbnails, excerpts, and "More" link.
 */
export function RecentPostsWidget({
  title,
  description,
  showMoreLink = true,
  moreLink,
  className,
  posts = [],
  showThumbnail = true,
  showExcerpt = true,
}: RecentPostsWidgetProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <WidgetContainer
      title={title}
      description={description}
      showMoreLink={showMoreLink}
      moreLink={moreLink}
      className={className}
    >
      <div className="space-y-4">
        {posts.map((post) => (
          <RecentPostItem
            key={post.id}
            post={post}
            showThumbnail={showThumbnail}
            showExcerpt={showExcerpt}
          />
        ))}
      </div>
    </WidgetContainer>
  )
}

/**
 * Recent post item component
 */
function RecentPostItem({
  post,
  showThumbnail,
  showExcerpt,
}: {
  post: WidgetPost
  showThumbnail: boolean
  showExcerpt: boolean
}) {
  const postUrl = post.board_slug
    ? `/board/${post.board_slug}/post/${post.id}`
    : `/board/post/${post.id}`

  return (
    <Link
      href={postUrl}
      className="block group"
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {showThumbnail && post.thumbnail_url && (
          <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={post.thumbnail_url}
              alt={post.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {post.title}
          </h4>

          {showExcerpt && post.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {post.category && (
              <span className="text-primary/70">{post.category.name}</span>
            )}
            <span>{formatRelativeTime(post.created_at)}</span>
            <span className="ml-auto">{post.view_count} views</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/**
 * Format date as relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`
    }
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}
