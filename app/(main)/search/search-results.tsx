import { searchContent, type SearchResult, type SearchResultType } from '@/app/actions/search'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, MessageSquare, File, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface SearchResultsProps {
  query: string
  type: string
  page: number
}

const TYPE_CONFIG: Record<SearchResultType, { label: string; icon: React.ElementType; color: string }> = {
  post: { label: 'Post', icon: FileText, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  comment: { label: 'Comment', icon: MessageSquare, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  document: { label: 'Document', icon: File, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  page: { label: 'Page', icon: Newspaper, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  board: { label: 'Board', icon: FileText, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
}

const RESULTS_PER_PAGE = 10

export async function SearchResults({ query, type, page }: SearchResultsProps) {
  const offset = (page - 1) * RESULTS_PER_PAGE

  const result = await searchContent(query, {
    type: type as SearchResultType || undefined,
    limit: RESULTS_PER_PAGE,
    offset,
  })

  if (!result.success || !result.data) {
    return (
      <div className="mt-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {result.error || 'An error occurred while searching'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { results, total } = result.data
  const totalPages = Math.ceil(total / RESULTS_PER_PAGE)

  if (results.length === 0) {
    return (
      <div className="mt-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-2">No results found for &quot;{query}&quot;</p>
            <p className="text-sm text-muted-foreground">
              Try different keywords or check your spelling
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="mb-4 text-sm text-muted-foreground">
        Found {total} result{total !== 1 ? 's' : ''} for &quot;{query}&quot;
      </div>

      <div className="space-y-4">
        {results.map((item) => (
          <SearchResultItem key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          query={query}
          type={type}
        />
      )}
    </div>
  )
}

function SearchResultItem({ item }: { item: SearchResult }) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <Link href={item.url} className="block">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className={config.color}>
                  {config.label}
                </Badge>
                {item.author && (
                  <span className="text-sm text-muted-foreground">
                    by {item.author}
                  </span>
                )}
              </div>

              <h3 className="font-medium text-lg mb-1 line-clamp-1 hover:underline">
                {item.title}
              </h3>

              <p
                className="text-muted-foreground text-sm line-clamp-2"
                dangerouslySetInnerHTML={{ __html: item.excerpt }}
              />

              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

function Pagination({
  currentPage,
  totalPages,
  query,
  type,
}: {
  currentPage: number
  totalPages: number
  query: string
  type: string
}) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    params.set('q', query)
    if (type) params.set('type', type)
    params.set('page', page.toString())
    return `/search?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={buildUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </span>
        )}
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (currentPage <= 3) {
            pageNum = i + 1
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = currentPage - 2 + i
          }

          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={buildUrl(pageNum)}>{pageNum}</Link>
            </Button>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={buildUrl(currentPage + 1)}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        ) : (
          <span>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </span>
        )}
      </Button>
    </div>
  )
}
