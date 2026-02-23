'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Loader2 } from 'lucide-react'

interface SearchFormProps {
  initialQuery: string
  initialType: string
}

const CONTENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'post', label: 'Posts' },
  { value: 'comment', label: 'Comments' },
  { value: 'document', label: 'Documents' },
  { value: 'page', label: 'Pages' },
] as const

export function SearchForm({ initialQuery, initialType }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState(initialType)

  const handleSearch = (searchQuery: string, searchType: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (searchQuery) {
      params.set('q', searchQuery)
    } else {
      params.delete('q')
    }

    if (searchType) {
      params.set('type', searchType)
    } else {
      params.delete('type')
    }

    params.delete('page') // Reset to first page on new search

    startTransition(() => {
      router.push(`/search?${params.toString()}`)
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query, type)
  }

  const handleClear = () => {
    setQuery('')
    handleSearch('', type)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    handleSearch(query, newType)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
            minLength={2}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>
                {ct.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" disabled={isPending || query.length < 2}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {query && query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Please enter at least 2 characters
        </p>
      )}
    </form>
  )
}
