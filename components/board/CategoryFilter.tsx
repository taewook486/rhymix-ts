'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/supabase/database.types'

interface CategoryFilterProps {
  categories: Category[]
  boardSlug: string
  selectedCategory?: string
}

export function CategoryFilter({
  categories,
  boardSlug,
  selectedCategory,
}: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryClick = (categoryId: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString())

    if (categoryId) {
      params.set('category', categoryId)
    } else {
      params.delete('category')
    }

    // Reset to page 1 when changing category
    params.delete('page')

    router.push(`/board/${boardSlug}?${params.toString()}`)
  }

  // Get category name by ID
  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || 'Unknown'
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={!selectedCategory ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleCategoryClick(undefined)}
        className="text-sm"
      >
        All
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleCategoryClick(category.id)}
          className="text-sm"
        >
          {category.name}
          {category.post_count > 0 && (
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                selectedCategory === category.id
                  ? 'bg-primary-foreground/20'
                  : 'bg-muted'
              )}
            >
              {category.post_count}
            </span>
          )}
        </Button>
      ))}
    </div>
  )
}
