'use client'

import Link from 'next/link'
import { PenSquare } from 'lucide-react'
import { PostTableRow, type PostWithAuthor } from './PostTableRow'
import { Pagination } from './Pagination'
import { CategoryFilter } from './CategoryFilter'
import { PostSearch } from './PostSearch'
import { Button } from '@/components/ui/button'
import type { Category, Board } from '@/lib/supabase/database.types'

interface BoardTableProps {
  board: Board
  posts: PostWithAuthor[]
  categories: Category[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery?: string
  selectedCategory?: string
  translations: {
    write: string
    notice: string
    secret: string
    noPosts: string
    title: string
    author: string
    date: string
    views: string
    likes: string
  }
}

export function BoardTable({
  board,
  posts,
  categories,
  currentPage,
  totalPages,
  totalCount,
  searchQuery,
  selectedCategory,
  translations,
}: BoardTableProps) {
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
            {translations.write}
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

      {/* Post table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground w-16">
                No
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                {translations.title}
              </th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground w-28">
                {translations.author}
              </th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground w-24">
                {translations.date}
              </th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground w-16">
                {translations.views}
              </th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground w-16">
                {translations.likes}
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <p className="text-muted-foreground">{translations.noPosts}</p>
                </td>
              </tr>
            ) : (
              posts.map((post, index) => (
                <PostTableRow
                  key={post.id}
                  post={post}
                  boardSlug={board.slug}
                  index={index}
                  totalCount={totalCount}
                  currentPage={currentPage}
                  perPage={20}
                  translations={{
                    notice: translations.notice,
                    secret: translations.secret,
                  }}
                />
              ))
            )}
          </tbody>
        </table>
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
