import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

const props = {
  page: 0,
  totalPages: 3,
  totalElements: 57,
  size: 20,
  onPageChange: vi.fn(),
}

describe('Pagination', () => {
  it('stays out of the way when everything fits on one page', () => {
    const { container } = render(<Pagination {...props} totalPages={1} totalElements={4} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('counts from one for the reader while paging from zero for the API', () => {
    render(<Pagination {...props} page={1} label="investments" />)

    expect(screen.getByText(/21–40/)).toBeInTheDocument()
    expect(screen.getByText('57')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('does not claim more rows than there are on the last page', () => {
    render(<Pagination {...props} page={2} />)

    expect(screen.getByText(/41–57/)).toBeInTheDocument()
  })

  it('asks for the next page by its zero-based number', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...props} page={1} onPageChange={onPageChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('cannot page past either end', () => {
    const { rerender } = render(<Pagination {...props} page={0} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    rerender(<Pagination {...props} page={2} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('is announced as a navigation landmark', () => {
    render(<Pagination {...props} />)

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })
})
