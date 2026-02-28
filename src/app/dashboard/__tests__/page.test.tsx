import { render, screen } from '@testing-library/react'
import Dashboard from '../page'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

const mockRedirect = redirect as jest.Mock
const mockCreateClient = createClient as jest.Mock

describe('Dashboard page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Make redirect throw like the real Next.js redirect so component execution stops
    mockRedirect.mockImplementation((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`)
      ;(error as any).digest = `NEXT_REDIRECT;${url}`
      throw error
    })
  })

  it('should redirect to /login when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    await expect(Dashboard()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('should display user email when authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com', id: 'user-1' } },
        }),
      },
    })

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument()
  })

  it('should render Connect Gmail and Connect Slack cards', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com', id: 'user-1' } },
        }),
      },
    })

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByText('Connect Gmail')).toBeInTheDocument()
    expect(screen.getByText('Connect Slack')).toBeInTheDocument()
  })

  it('should render Sign Out button', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com', id: 'user-1' } },
        }),
      },
    })

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('should show Coming Soon badges on cards', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com', id: 'user-1' } },
        }),
      },
    })

    const jsx = await Dashboard()
    render(jsx)

    const comingSoonBadges = screen.getAllByText(/coming soon/i)
    expect(comingSoonBadges).toHaveLength(2)
  })

  it('should have disabled Connect buttons', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com', id: 'user-1' } },
        }),
      },
    })

    const jsx = await Dashboard()
    render(jsx)

    const connectButtons = screen.getAllByRole('button', { name: /^connect$/i })
    connectButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
