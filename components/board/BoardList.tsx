import { PostItem, type PostWithAuthor } from './PostItem'
import { Pagination } from './Pagination'
import { CategoryFilter } from './CategoryFilter'
import { PostSearch } from './PostSearch'
import { Button } from '@/components/ui/button'
import { PenSquare } from 'lucide-react'
import Link from 'next/link'
import type { Category, Board } from '@/lib/supabase/database.types'

interface BoardListProps {
  board: Board
  posts: PostWithAuthor[]
  categories: Category[]
  currentPage: number
  totalPages: number
  searchQuery?: string
  selectedCategory?: string
}

export function BoardList({
  board,
  posts,
  categories,
  currentPage,
  totalPages,
  searchQuery,
  selectedCategory,
}: BoardListProps) {
  return (
    <div className="space-y-6" data-testid="board-list">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{board.title}</h1>
          {board.description && (
            <p className="text-muted-foreground mt-1">{board.description}</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/board/${board.slug}/new`}>
            <PenSquare className="w-4 h-4 mr-2" />
            New Post
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            boardSlug={board.slug}
            selectedCategory={selectedCategory}
          />
        )}
        <PostSearch boardSlug={board.slug} initialValue={searchQuery} />
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found.</p>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search terms.
              </p>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <PostItem key={post.id} post={post} boardSlug={board.slug} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          boardSlug={board.slug}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />
      )}
    </div>
  )
}
