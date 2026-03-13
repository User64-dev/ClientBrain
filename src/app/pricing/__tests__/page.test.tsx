import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PricingPage from '../page'

const mockPush = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

const originalLocationHref = window.location.href

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, href: originalLocationHref },
  })
})

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, href: originalLocationHref },
  })
})

function mockSubscriptionQuery(data: unknown = null) {
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data }),
        }),
      }),
    }),
  })
}

describe('Pricing page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockSubscriptionQuery()
    global.fetch = jest.fn()
  })

  it('should render pricing plans with subscribe buttons', () => {
    render(<PricingPage />)

    expect(screen.getByText('Choose your plan')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /subscribe/i })).toHaveLength(2)
  })

  it('should redirect to login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    render(<PricingPage />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /subscribe/i })[0])

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('should redirect to Stripe checkout URL on success', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' }),
    })

    render(<PricingPage />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /subscribe/i })[0])

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.stripe.com/session_123')
    })
  })

  it('should display error when API returns an error response', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Invalid plan. Must be "pro" or "team".' }),
    })

    render(<PricingPage />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /subscribe/i })[0])

    await waitFor(() => {
      expect(screen.getByText('Invalid plan. Must be "pro" or "team".')).toBeInTheDocument()
    })
  })

  it('should display error when API returns no URL', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ url: null }),
    })

    render(<PricingPage />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /subscribe/i })[0])

    await waitFor(() => {
      expect(screen.getByText('Failed to create checkout session')).toBeInTheDocument()
    })
  })

  it('should display error when fetch throws', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<PricingPage />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /subscribe/i })[0])

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })

  it('should reset loading state when API returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Server error' }),
    })

    render(<PricingPage />)
    const user = userEvent.setup()

    const subscribeButtons = screen.getAllByRole('button', { name: /subscribe/i })
    await user.click(subscribeButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /subscribe/i })).toHaveLength(2)
    })
  })
})
