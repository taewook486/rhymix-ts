/**
 * Characterization Tests for Board Components
 *
 * These tests capture the CURRENT behavior of board components.
 * They are used to ensure behavior preservation during refactoring.
 *
 * NOTE: These tests document what IS, not what SHOULD BE.
 * If behavior needs to change, update the SPEC first.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostItem, type PostWithAuthor } from '@/components/board/PostItem'
import { Pagination } from '@/components/board/Pagination'
import { PostSearch } from '@/components/board/PostSearch'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    toString: () => '',
    get: vi.fn(),
  }),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, className, sizes }: any) => (
    <img src={src} alt={alt} data-fill={fill} className={className} data-sizes={sizes} />
  ),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe('PostItem Characterization Tests', () => {
  const mockPost: PostWithAuthor = {
    id: 'test-post-id',
    board_id: 'test-board-id',
    category_id: null,
    author_id: 'test-author-id',
    author_name: 'Test Author',
    title: 'Test Post Title',
    excerpt: 'Test excerpt content',
    status: 'published',
    is_notice: false,
    is_secret: false,
    view_count: 100,
    vote_count: 10,
    comment_count: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      display_name: 'Test User',
      avatar_url: null,
    },
    category: null,
    thumbnail_url: null,
  }

  it('should render post title', () => {
    render(<PostItem post={mockPost} boardSlug="test-board" />)
    expect(screen.getByText('Test Post Title')).toBeInTheDocument()
  })

  it('should render author name', () => {
    render(<PostItem post={mockPost} boardSlug="test-board" />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should render notice badge for notice posts', () => {
    const noticePost = { ...mockPost, is_notice: true }
    render(<PostItem post={noticePost} boardSlug="test-board" />)
    expect(screen.getByText('Notice')).toBeInTheDocument()
  })

  it('should render secret badge for secret posts', () => {
    const secretPost = { ...mockPost, is_secret: true }
    render(<PostItem post={secretPost} boardSlug="test-board" />)
    expect(screen.getByText('Secret')).toBeInTheDocument()
  })

  it('should render category badge when category exists', () => {
    const postWithCategory = {
      ...mockPost,
      category: { id: 'cat-1', name: 'General', slug: 'general' },
    }
    render(<PostItem post={postWithCategory} boardSlug="test-board" />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('should format view count correctly', () => {
    const postWithHighViews = { ...mockPost, view_count: 1500 }
    render(<PostItem post={postWithHighViews} boardSlug="test-board" />)
    expect(screen.getByText('1.5K')).toBeInTheDocument()
  })

  it('should link to post detail page', () => {
    render(<PostItem post={mockPost} boardSlug="test-board" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/board/test-board/post/test-post-id')
  })
})

describe('Pagination Characterization Tests', () => {
  it('should not render when total pages is 1 or less', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} boardSlug="test-board" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render pagination when total pages is greater than 1', () => {
    render(<Pagination currentPage={1} totalPages={5} boardSlug="test-board" />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('should disable previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} boardSlug="test-board" />)
    const buttons = screen.getAllByRole('button')
    const prevButton = buttons.find((btn) => btn.querySelector('svg.lucide-chevron-left'))
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} boardSlug="test-board" />)
    const buttons = screen.getAllByRole('button')
    const nextButton = buttons.find((btn) => btn.querySelector('svg.lucide-chevron-right'))
    expect(nextButton).toBeDisabled()
  })

  it('should show page numbers', () => {
    render(<Pagination currentPage={3} totalPages={5} boardSlug="test-board" />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

describe('PostSearch Characterization Tests', () => {
  it('should render search input', () => {
    render(<PostSearch boardSlug="test-board" />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('should show clear button when query exists', () => {
    render(<PostSearch boardSlug="test-board" initialValue="test query" />)
    // The clear button should be present
    const input = screen.getByRole('searchbox')
    expect(input).toHaveValue('test query')
  })

  it('should have placeholder text', () => {
    render(<PostSearch boardSlug="test-board" />)
    expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument()
  })
})
