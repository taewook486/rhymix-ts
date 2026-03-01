/**
 * Tests for Loading State Components
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import {
  LoadingSpinner,
  LoadingText,
  LoadingCard,
  LoadingTable,
  LoadingPage,
} from '@/components/ui/loading-state'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
}))

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />)
    // Check for loader icon instead of animate-spin class
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />)
    expect(container.querySelector('.h-4.w-4')).toBeInTheDocument()

    rerender(<LoadingSpinner size="lg" />)
    expect(container.querySelector('.h-8.w-8')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="text-primary" />)
    const element = container.querySelector('.text-primary')
    expect(element).toBeInTheDocument()
  })
})

describe('LoadingText', () => {
  it('renders with default text', () => {
    render(<LoadingText />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    render(<LoadingText text="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })
})

describe('LoadingCard', () => {
  it('renders with default lines', () => {
    const { container } = render(<LoadingCard />)
    const lines = container.querySelectorAll('.h-4.bg-muted')
    expect(lines.length).toBe(3)
  })

  it('renders with custom number of lines', () => {
    const { container } = render(<LoadingCard lines={5} />)
    const lines = container.querySelectorAll('.h-4.bg-muted')
    expect(lines.length).toBe(5)
  })
})

describe('LoadingTable', () => {
  it('renders with default rows and columns', () => {
    const { container } = render(<LoadingTable />)
    // Header row + 5 data rows
    const rowContainers = container.querySelectorAll('.flex.gap-4')
    expect(rowContainers.length).toBe(6) // 1 header + 5 rows
  })

  it('renders with custom rows and columns', () => {
    const { container } = render(<LoadingTable rows={3} columns={2} />)
    const rowContainers = container.querySelectorAll('.flex.gap-4')
    expect(rowContainers.length).toBe(4) // 1 header + 3 rows
  })
})

describe('LoadingPage', () => {
  it('renders with default title', () => {
    render(<LoadingPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom title and description', () => {
    render(<LoadingPage title="Loading data" description="Please wait..." />)
    expect(screen.getByText('Loading data')).toBeInTheDocument()
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })
})
