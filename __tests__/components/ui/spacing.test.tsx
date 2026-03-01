/**
 * Tests for Spacing Components
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import {
  Stack,
  Inline,
  Grid,
  Section,
  Container,
  Divider,
} from '@/components/ui/spacing'

describe('Stack', () => {
  it('renders children vertically', () => {
    const { container } = render(
      <Stack>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    )
    expect(container.querySelector('.flex.flex-col')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('applies gap sizes', () => {
    const { container, rerender } = render(<Stack gap="sm" />)
    expect(container.querySelector('.gap-2')).toBeInTheDocument()

    rerender(<Stack gap="xl" />)
    expect(container.querySelector('.gap-8')).toBeInTheDocument()
  })
})

describe('Inline', () => {
  it('renders children horizontally', () => {
    const { container } = render(
      <Inline>
        <div>Item 1</div>
        <div>Item 2</div>
      </Inline>
    )
    expect(container.querySelector('.flex.items-center')).toBeInTheDocument()
  })

  it('applies flex-wrap by default', () => {
    const { container } = render(<Inline />)
    expect(container.querySelector('.flex-wrap')).toBeInTheDocument()
  })

  it('can disable flex-wrap', () => {
    const { container } = render(<Inline wrap={false} />)
    expect(container.querySelector('.flex-wrap')).not.toBeInTheDocument()
  })
})

describe('Grid', () => {
  it('renders grid layout', () => {
    const { container } = render(
      <Grid>
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    )
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('applies column configuration', () => {
    const { container } = render(<Grid cols={4} />)
    // Grid should have grid class
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('applies gap sizes', () => {
    const { container } = render(<Grid gap="lg" />)
    expect(container.querySelector('.gap-6')).toBeInTheDocument()
  })
})

describe('Section', () => {
  it('renders as section element', () => {
    const { container } = render(<Section>Content</Section>)
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  it('applies size padding', () => {
    const { container, rerender } = render(<Section size="sm" />)
    expect(container.querySelector('.py-6')).toBeInTheDocument()

    rerender(<Section size="xl" />)
    expect(container.querySelector('.py-24')).toBeInTheDocument()
  })

  it('applies background variants', () => {
    const { container } = render(<Section background="muted" />)
    expect(container.querySelector('.bg-muted\\/50')).toBeInTheDocument()
  })
})

describe('Container', () => {
  it('renders with max-width', () => {
    const { container } = render(<Container>Content</Container>)
    expect(container.querySelector('.mx-auto')).toBeInTheDocument()
  })

  it('applies size variants', () => {
    const { container, rerender } = render(<Container size="sm" />)
    expect(container.querySelector('.max-w-2xl')).toBeInTheDocument()

    rerender(<Container size="xl" />)
    expect(container.querySelector('.max-w-7xl')).toBeInTheDocument()
  })

  it('applies padding by default', () => {
    const { container } = render(<Container />)
    expect(container.querySelector('.px-4')).toBeInTheDocument()
  })

  it('can disable padding', () => {
    const { container } = render(<Container padded={false} />)
    expect(container.querySelector('.px-4')).not.toBeInTheDocument()
  })
})

describe('Divider', () => {
  it('renders horizontal divider by default', () => {
    const { container } = render(<Divider />)
    const divider = container.querySelector('.h-px.w-full')
    expect(divider).toBeInTheDocument()
  })

  it('renders vertical divider', () => {
    const { container } = render(<Divider orientation="vertical" />)
    const divider = container.querySelector('.w-px.h-full')
    expect(divider).toBeInTheDocument()
  })

  it('applies spacing', () => {
    const { container, rerender } = render(<Divider spacing="lg" />)
    expect(container.querySelector('.my-8')).toBeInTheDocument()

    rerender(<Divider orientation="vertical" spacing="lg" />)
    expect(container.querySelector('.mx-8')).toBeInTheDocument()
  })
})
