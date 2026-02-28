'use client'

import { useState, useEffect, useMemo } from 'react'
import { searchContent, type SearchResult, type SearchResultType } from '@/app/actions/search'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  MessageSquare,
  File,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutGrid,
  LayoutList,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

export function SearchResults({ query, type, page }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')

  useEffect(() => {
    loadResults()
  }, [query, type, page])

  const loadResults = async () => {
    setIsLoading(true)
    setError(null)

    const offset = (page - 1) * RESULTS_PER_PAGE

    const result = await searchContent(query, {
      type: type as SearchResultType || undefined,
      limit: RESULTS_PER_PAGE * 3, // Get more for grouped view
      offset,
    })

    if (result.success && result.data) {
      setResults(result.data.results)
      setTotal(result.data.total)
    } else {
      setError(result.error || 'An error occurred while searching')
      setResults([])
      setTotal(0)
    }

    setIsLoading(false)
  }

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      post: [],
      comment: [],
      document: [],
      page: [],
      board: [],
    }

    results.forEach((result) => {
      if (groups[result.type]) {
        groups[result.type].push(result)
      }
    })

    return groups
  }, [results])

  const totalPages = Math.ceil(total / RESULTS_PER_PAGE)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Searching...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-2">No results found for &quot;{query}&quot;</p>
          <p className="text-sm text-muted-foreground">
            Try different keywords or check your spelling
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results count and view toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {total} result{total !== 1 ? 's' : ''} for &quot;{query}&quot;
        </p>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grouped' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grouped')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Grouped
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <LayoutList className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
      </div>

      {/* Grouped View */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([type, items]) => {
            if (items.length === 0) return null
            const config = TYPE_CONFIG[type as SearchResultType]
            const Icon = config.icon

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    {config.label}s
                    <Badge variant="secondary">{items.length}</Badge>
                  </h2>
                </div>

                <div className="space-y-3">
                  {items.slice(0, 5).map((item) => (
                    <SearchResultCard key={item.id} item={item} />
                  ))}
                </div>

                {items.length > 5 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&type=${type}`}
                    className="flex items-center justify-center gap-1 text-sm text-primary hover:underline py-2"
                  >
                    View all {items.length} {config.label.toLowerCase()}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {results.map((item) => (
            <SearchResultCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
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

function SearchResultCard({ item }: { item: SearchResult }) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <Link href={item.url}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>
    </Link>
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
