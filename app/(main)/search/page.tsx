import { Suspense } from 'react'
import { SearchForm } from './search-form'
import { SearchResults } from './search-results'
import { PopularSearches } from './popular-searches'

export const metadata = {
  title: 'Search - Rhymix TS',
  description: 'Search posts, comments, documents, and pages',
}

// @MX:NOTE: Supports unified search across all content types

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''
  const type = params.type || ''
  const page = parseInt(params.page || '1', 10)

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Search across posts, comments, documents, and pages
        </p>
      </div>

      <SearchForm initialQuery={query} initialType={type} />

      {query ? (
        <Suspense
          fallback={
            <div className="mt-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          }
        >
          <SearchResults query={query} type={type} page={page} />
        </Suspense>
      ) : (
        <PopularSearches />
      )}
    </div>
  )
}
