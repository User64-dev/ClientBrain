import { render, screen } from '@testing-library/react'
import Home from '../page'

// Return null from getContext so GlobeCanvas exits early and skips animation loop
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext

  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
})

describe('Home / Landing page', () => {
  it('should render ScrollProgressBar component', () => {
    render(<Home />)
    const progressBar = document.querySelector('.fixed.top-0.left-0.right-0')
    expect(progressBar).toBeInTheDocument()
  })

  it('should render main content', () => {
    render(<Home />)
    expect(screen.getAllByText(/ClientBrain/i).length).toBeGreaterThan(0)
  })

  it('should render navigation links to login', () => {
    render(<Home />)
    const signInLink = screen.getByRole('link', { name: /sign in/i })
    expect(signInLink).toHaveAttribute('href', '/login')
  })
})
