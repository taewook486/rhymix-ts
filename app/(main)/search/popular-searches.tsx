import { getPopularSearchTerms } from '@/app/actions/search'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Search } from 'lucide-react'
import Link from 'next/link'

export async function PopularSearches() {
  const result = await getPopularSearchTerms()

  if (!result.success || !result.data || result.data.length === 0) {
    return null
  }

  const terms = result.data

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Popular Tags
          </CardTitle>
          <CardDescription>
            Frequently used tags and categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {terms.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
              >
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Search className="h-3 w-3 mr-1.5" />
                  {term}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
