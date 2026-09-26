import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeltaPill } from './DeltaPill'
import { EntityAvatar } from './EntityAvatar'
import { Sparkline } from './Sparkline'
import { Badge } from './Badge'

describe('DeltaPill', () => {
  it('renders nothing when there is no figure to compare against', () => {
    const { container } = render(<DeltaPill value={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('states the direction in words for screen readers, not just in colour', () => {
    render(<DeltaPill value={4.23} since="vs last quarter" />)

    expect(screen.getByText('up 4.2 percent vs last quarter')).toBeInTheDocument()
    expect(screen.getByText('4.2%')).toBeInTheDocument()
  })

  it('treats a change under a tenth of a percent as flat rather than implying precision', () => {
    render(<DeltaPill value={0.04} />)

    expect(screen.getByText('flat')).toBeInTheDocument()
    expect(screen.getByText('unchanged')).toBeInTheDocument()
  })

  it('colours a rise as good by default and as bad when inverted', () => {
    const { container: rise } = render(<DeltaPill value={5} />)
    expect(rise.firstElementChild?.className).toContain('text-positive')

    // Burn, time-to-close: up is bad.
    const { container: burn } = render(<DeltaPill value={5} invert />)
    expect(burn.firstElementChild?.className).toContain('text-negative')
  })

  it('shows a fall without the minus sign, which the arrow already carries', () => {
    render(<DeltaPill value={-12.5} />)
    expect(screen.getByText('12.5%')).toBeInTheDocument()
  })
})

describe('EntityAvatar', () => {
  it('takes initials from the first and last word', () => {
    render(<EntityAvatar name="Nimbus Grid Energy" />)
    expect(screen.getByText('NE')).toBeInTheDocument()
  })

  it('uses two letters of a single-word name', () => {
    render(<EntityAvatar name="Ledgerly" />)
    expect(screen.getByText('LE')).toBeInTheDocument()
  })

  it('gives the same company the same colour every time', () => {
    const { container: first } = render(<EntityAvatar name="Ledgerly" />)
    const { container: second } = render(<EntityAvatar name="Ledgerly" />)
    const tint = (node: Element | null) => node?.getAttribute('style')

    expect(tint(first.firstElementChild)).toBe(tint(second.firstElementChild))
    expect(tint(first.firstElementChild)).toMatch(/--tint/)
  })

  it('shows the logo when there is one, and refuses an unsafe URL', () => {
    const { container: real } = render(<EntityAvatar name="Ledgerly" logoUrl="https://x.test/a.png" />)
    expect(real.querySelector('img')).toHaveAttribute('src', 'https://x.test/a.png')

    // safeUrl rejects javascript:, so it falls back to the monogram.
    const { container: unsafe } = render(
      <EntityAvatar name="Ledgerly" logoUrl="javascript:alert(1)" />
    )
    expect(unsafe.querySelector('img')).toBeNull()
  })

  it('never renders an empty mark for an empty name', () => {
    render(<EntityAvatar name="   " />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('Sparkline', () => {
  it('needs at least two points to mean anything', () => {
    const { container } = render(<Sparkline values={[5]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws a point per value, in order', () => {
    const { container } = render(<Sparkline values={[1, 5, 3]} />)
    const line = container.querySelector('path[data-draw]')?.getAttribute('d') ?? ''

    expect(line.startsWith('M')).toBe(true)
    expect(line.match(/L/g)).toHaveLength(2)
  })

  it('survives a flat series instead of dividing by zero', () => {
    const { container } = render(<Sparkline values={[4, 4, 4]} />)
    const line = container.querySelector('path[data-draw]')?.getAttribute('d') ?? ''

    expect(line).not.toContain('NaN')
  })

  it('is hidden from screen readers, since the figure beside it carries the value', () => {
    const { container } = render(<Sparkline values={[1, 2]} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Badge', () => {
  it('carries a status dot when asked, for lifecycle states', () => {
    const { container } = render(
      <Badge variant="success" dot>
        Active
      </Badge>
    )
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(container.querySelector('span[aria-hidden="true"]')).toBeTruthy()
  })
})

describe('reduced motion', () => {
  it('applies the end state instead of animating', async () => {
    // matchMedia is not implemented in jsdom, so the motion layer has to cope
    // with it being absent as well as with it reporting "reduce".
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { motion, reducedMotion } = await import('@/lib/motion')
    expect(reducedMotion()).toBe(true)

    const element = document.createElement('div')
    document.body.append(element)

    // Returns null (nothing is animating) and the target ends up at the final value.
    expect(motion(element, { opacity: [0, 1] })).toBeNull()
    expect(element.style.opacity).toBe('1')
  })
})
