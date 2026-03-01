/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

const mockGetUser = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`))
}

describe('Auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should allow access to /dashboard when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } } })

    const request = createRequest('/dashboard')
    const response = await middleware(request)

    expect(response.status).not.toBe(302)
    expect(response.headers.get('location')).toBeNull()
  })

  it('should redirect to /login when accessing /dashboard without authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = createRequest('/dashboard')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('should redirect to /login when accessing /dashboard/settings without authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = createRequest('/dashboard/settings')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })
})
