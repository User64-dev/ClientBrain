import { render, screen } from '@testing-library/react'
import Dashboard from '../page'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

const mockRedirect = redirect as jest.Mock
const mockCreateClient = createClient as jest.Mock

function createMockSupabase({
  user = { email: 'user@example.com', id: 'user-1' } as any,
  gmailToken = null as any,
  slackToken = null as any,
} = {}) {
  const selectMock = (table: string) => {
    const data = table === 'gmail_tokens' ? gmailToken : slackToken
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data }),
        }),
      }),
    }
  }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => selectMock(table)),
  }
}

describe('Dashboard page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedirect.mockImplementation((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`)
      ;(error as any).digest = `NEXT_REDIRECT;${url}`
      throw error
    })
  })

  it('should redirect to /login when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: null })
    )

    await expect(Dashboard()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('should display user email when authenticated', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument()
  })

  it('should render Connect Gmail and Connect Slack cards', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByText('Connect Gmail')).toBeInTheDocument()
    expect(screen.getByText('Connect Slack')).toBeInTheDocument()
  })

  it('should render Sign Out button', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('should show Not Connected badges when no tokens exist', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const jsx = await Dashboard()
    render(jsx)

    const badges = screen.getAllByText(/not connected/i)
    expect(badges).toHaveLength(2)
  })

  it('should show active Connect links when not connected', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const jsx = await Dashboard()
    render(jsx)

    const connectLinks = screen.getAllByRole('link', { name: /connect/i })
    expect(connectLinks).toHaveLength(2)
    expect(connectLinks[0]).toHaveAttribute('href', '/api/auth/gmail')
    expect(connectLinks[1]).toHaveAttribute('href', '/api/auth/slack')
  })

  it('should show Connected badges when tokens exist', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        gmailToken: { id: '1' },
        slackToken: { id: '2' },
      })
    )

    const jsx = await Dashboard()
    render(jsx)

    const badges = screen.getAllByText(/^connected$/i)
    expect(badges).toHaveLength(2)
  })

  it('should show disabled buttons when connected', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        gmailToken: { id: '1' },
        slackToken: { id: '2' },
      })
    )

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByText('✓ Gmail Connected')).toBeDisabled()
    expect(screen.getByText('✓ Slack Connected')).toBeDisabled()
  })

  it('should render Sync Now button', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const jsx = await Dashboard()
    render(jsx)

    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument()
  })
})
