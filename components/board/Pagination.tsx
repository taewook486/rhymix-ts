'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  boardSlug: string
  searchQuery?: string
  selectedCategory?: string
}

export function Pagination({
  currentPage,
  totalPages,
  boardSlug,
  searchQuery,
  selectedCategory,
}: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())

    if (searchQuery) {
      params.set('q', searchQuery)
    }
    if (selectedCategory) {
      params.set('category', selectedCategory)
    }

    router.push(`/board/${boardSlug}?${params.toString()}`)
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {/* First page */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(1)}
        disabled={currentPage === 1}
        className="hidden sm:inline-flex"
      >
        <ChevronsLeft className="w-4 h-4" />
        <span className="sr-only">First page</span>
      </Button>

      {/* Previous page */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="sr-only">Previous page</span>
      </Button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'ghost'}
              size="icon"
              onClick={() => goToPage(page)}
              className={cn(
                'min-w-[40px]',
                currentPage === page && 'pointer-events-none'
              )}
            >
              {page}
              <span className="sr-only">Page {page}</span>
            </Button>
          )
        )}
      </div>

      {/* Next page */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
        <span className="sr-only">Next page</span>
      </Button>

      {/* Last page */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => goToPage(totalPages)}
        disabled={currentPage === totalPages}
        className="hidden sm:inline-flex"
      >
        <ChevronsRight className="w-4 h-4" />
        <span className="sr-only">Last page</span>
      </Button>
    </nav>
  )
}
