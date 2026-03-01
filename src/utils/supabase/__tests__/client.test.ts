import { createClient } from '../client'
import { createBrowserClient } from '@supabase/ssr'

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}))

const mockCreateBrowserClient = createBrowserClient as jest.Mock

describe('Supabase browser client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateBrowserClient.mockReturnValue({ auth: {} })
  })

  it('should create browser client with correct env variables', () => {
    createClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })

  it('should use NEXT_PUBLIC_SUPABASE_URL', () => {
    createClient()

    const [url] = mockCreateBrowserClient.mock.calls[0]
    expect(url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL)
  })

  it('should use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', () => {
    createClient()

    const [, key] = mockCreateBrowserClient.mock.calls[0]
    expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  })
})
