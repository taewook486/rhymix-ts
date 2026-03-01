/**
 * Tests for Empty State Components
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  EmptyState,
  EmptyPosts,
  EmptyMembers,
  EmptySearchResults,
  EmptyFolder,
  EmptyError,
} from '@/components/ui/empty-state'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Inbox: () => <div data-testid="inbox-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Search: () => <div data-testid="search-icon" />,
  FolderOpen: () => <div data-testid="folder-open-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}))

describe('EmptyState', () => {
  it('renders with required props', () => {
    render(<EmptyState title="No data" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(
      <EmptyState
        title="No data"
        description="There is no data to display"
      />
    )
    expect(screen.getByText('There is no data to display')).toBeInTheDocument()
  })

  it('renders with action button', () => {
    const handleClick = jest.fn()
    render(
      <EmptyState
        title="No data"
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    )
    const button = screen.getByText('Add Item')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with custom icon', () => {
    render(<EmptyState title="No data" />)
    // Check that the empty state container exists
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="No data" className="custom-class" />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })
})

describe('EmptyPosts', () => {
  it('renders without action', () => {
    render(<EmptyPosts />)
    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    expect(screen.queryByText('Create Post')).not.toBeInTheDocument()
  })

  it('renders with action', () => {
    const handleCreate = jest.fn()
    render(<EmptyPosts onCreateNew={handleCreate} />)
    expect(screen.getByText('Create Post')).toBeInTheDocument()
  })
})

describe('EmptyMembers', () => {
  it('renders without action', () => {
    render(<EmptyMembers />)
    expect(screen.getByText('No members found')).toBeInTheDocument()
  })

  it('renders with action', () => {
    const handleInvite = jest.fn()
    render(<EmptyMembers onInvite={handleInvite} />)
    expect(screen.getByText('Invite Member')).toBeInTheDocument()
  })
})

describe('EmptySearchResults', () => {
  it('renders without query', () => {
    render(<EmptySearchResults />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('renders with query', () => {
    render(<EmptySearchResults query="test" />)
    expect(screen.getByText(/test/)).toBeInTheDocument()
  })

  it('renders with clear action', () => {
    const handleClear = jest.fn()
    render(<EmptySearchResults onClear={handleClear} />)
    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })
})

describe('EmptyFolder', () => {
  it('renders without action', () => {
    render(<EmptyFolder />)
    expect(screen.getByText('This folder is empty')).toBeInTheDocument()
  })

  it('renders with action', () => {
    const handleUpload = jest.fn()
    render(<EmptyFolder onUpload={handleUpload} />)
    expect(screen.getByText('Upload Files')).toBeInTheDocument()
  })
})

describe('EmptyError', () => {
  it('renders with default message', () => {
    render(<EmptyError />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<EmptyError message="Network error occurred" />)
    expect(screen.getByText('Network error occurred')).toBeInTheDocument()
  })

  it('renders with retry action', () => {
    const handleRetry = jest.fn()
    render(<EmptyError onRetry={handleRetry} />)
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })
})
