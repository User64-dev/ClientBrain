import { createClient } from '../server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const mockCookiesGetAll = jest.fn()
const mockCookiesSet = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

const mockCreateServerClient = createServerClient as jest.Mock
const mockCookies = cookies as jest.Mock

describe('Supabase server client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateServerClient.mockReturnValue({ auth: {} })
    mockCookiesGetAll.mockReturnValue([{ name: 'session', value: 'token' }])
    mockCookies.mockResolvedValue({
      getAll: mockCookiesGetAll,
      set: mockCookiesSet,
    })
  })

  it('should create server client with correct env variables', async () => {
    await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.any(Object)
    )
  })

  it('should handle cookies getAll correctly', async () => {
    await createClient()

    const cookieHandlers = mockCreateServerClient.mock.calls[0][2].cookies
    const result = cookieHandlers.getAll()

    expect(mockCookiesGetAll).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'session', value: 'token' }])
  })

  it('should handle cookies setAll correctly', async () => {
    await createClient()

    const cookieHandlers = mockCreateServerClient.mock.calls[0][2].cookies
    const cookiesToSet = [{ name: 'session', value: 'newtoken', options: {} }]

    cookieHandlers.setAll(cookiesToSet)

    expect(mockCookiesSet).toHaveBeenCalledWith('session', 'newtoken', {})
  })

  it('should catch errors in setAll when called from Server Component', async () => {
    mockCookiesSet.mockImplementation(() => {
      throw new Error('Cannot set cookie in Server Component')
    })

    await createClient()

    const cookieHandlers = mockCreateServerClient.mock.calls[0][2].cookies

    expect(() => {
      cookieHandlers.setAll([{ name: 'session', value: 'token', options: {} }])
    }).not.toThrow()
  })
})
