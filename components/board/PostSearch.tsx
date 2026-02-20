'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PostSearchProps {
  boardSlug: string
  initialValue?: string
}

export function PostSearch({ boardSlug, initialValue = '' }: PostSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialValue)

  const handleSearch = useCallback(
    (searchQuery: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim())
      } else {
        params.delete('q')
      }

      // Reset to page 1 when searching
      params.delete('page')

      router.push(`/board/${boardSlug}?${params.toString()}`)
    },
    [boardSlug, router, searchParams]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    handleSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search posts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    </form>
  )
}
