'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2, SlidersHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'

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

const DATE_RANGES = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
] as const

export function SearchForm({ initialQuery, initialType }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState(initialType)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dateRange, setDateRange] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) return

    setIsPending(true)
    const params = new URLSearchParams()
    params.set('q', searchQuery)
    if (type) params.set('type', type)
    if (dateRange) params.set('date', dateRange)
    router.push(`/search?${params.toString()}`)
    setIsPending(false)
  }

  const handleClear = () => {
    setQuery('')
    router.push('/search')
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    if (query) {
      const params = new URLSearchParams()
      params.set('q', query)
      if (newType) params.set('type', newType)
      if (dateRange) params.set('date', dateRange)
      router.push(`/search?${params.toString()}`)
    }
  }

  const handleDateChange = (newDate: string) => {
    setDateRange(newDate)
    if (query) {
      const params = new URLSearchParams()
      params.set('q', query)
      if (type) params.set('type', type)
      if (newDate) params.set('date', newDate)
      router.push(`/search?${params.toString()}`)
    }
  }

  const toggleAdvanced = () => {
    setShowAdvanced((prev) => !prev)
  }

  return (
    <div className="space-y-4">
      {/* Main Search Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchAutocomplete
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            placeholder="Search posts, documents, comments..."
            className="w-full"
          />
        </div>

        <Button
          type="button"
          onClick={() => handleSearch(query)}
          disabled={isPending || query.length < 2}
          className="flex-shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {' '}Search
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleAdvanced}
          title="Toggle advanced filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Content Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Type:</span>
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
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Date:</span>
            <Select value={dateRange} onValueChange={handleDateChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((dr) => (
                  <SelectItem key={dr.value} value={dr.value}>
                    {dr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Query Validation */}
      {query && query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Please enter at least 2 characters
        </p>
      )}
    </div>
  )
}
