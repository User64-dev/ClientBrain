/**
 * @jest-environment node
 */

const mockFrom = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: (...args: any[]) => mockFrom(...args),
  }),
}))

const originalFetch = global.fetch

describe('fetchGmailMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('throws when no Gmail token is found', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const { fetchGmailMessages } = require('../gmail')
    await expect(fetchGmailMessages('user-1')).rejects.toThrow('Gmail token not found')
  })

  it('fetches messages with valid non-expired token', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString()

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              access_token: 'valid-token',
              refresh_token: 'refresh-token',
              expires_at: futureDate,
            },
            error: null,
          }),
        }),
      }),
    })

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payload: {
            headers: [
              { name: 'From', value: 'sender@test.com' },
              { name: 'Subject', value: 'Test Subject' },
              { name: 'Date', value: 'Mon, 01 Jan 2024 00:00:00 +0000' },
            ],
          },
          snippet: 'Test snippet',
          internalDate: '1704067200000',
        }),
      }) as jest.Mock

    const { fetchGmailMessages } = require('../gmail')
    const messages = await fetchGmailMessages('user-1')

    expect(messages).toHaveLength(1)
    expect(messages[0].sender).toBe('sender@test.com')
    expect(messages[0].content).toBe('Test Subject: Test snippet')
  })

  it('returns empty array when no messages exist', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString()

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              access_token: 'valid-token',
              refresh_token: 'refresh-token',
              expires_at: futureDate,
            },
            error: null,
          }),
        }),
      }),
    })

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    }) as jest.Mock

    const { fetchGmailMessages } = require('../gmail')
    const messages = await fetchGmailMessages('user-1')

    expect(messages).toHaveLength(0)
  })

  it('refreshes expired token before fetching', async () => {
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString()

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              access_token: 'expired-token',
              refresh_token: 'refresh-token',
              expires_at: pastDate,
            },
            error: null,
          }),
        }),
      }),
      update: mockUpdate,
    })

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      }) as jest.Mock

    const { fetchGmailMessages } = require('../gmail')
    const messages = await fetchGmailMessages('user-1')

    expect(messages).toHaveLength(0)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws when token refresh fails', async () => {
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString()

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              access_token: 'expired-token',
              refresh_token: 'refresh-token',
              expires_at: pastDate,
            },
            error: null,
          }),
        }),
      }),
    })

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'invalid_grant' }),
    }) as jest.Mock

    const { fetchGmailMessages } = require('../gmail')
    await expect(fetchGmailMessages('user-1')).rejects.toThrow('Failed to refresh Gmail token')
  })
})
