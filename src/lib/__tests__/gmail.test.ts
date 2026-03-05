/**
 * @jest-environment node
 */

import { fetchGmailMessages } from '../gmail'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
})

describe('fetchGmailMessages', () => {
  const validToken = 'valid-access-token'
  const refreshToken = 'refresh-token'
  const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString()
  const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString()

  it('fetches messages without refreshing when token is valid', async () => {
    mockFetch
      // List messages
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'msg-1' }],
        }),
      })
      // Get message details
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payload: {
            headers: [{ name: 'From', value: 'John <john@acme.com>' }],
          },
          snippet: 'Hello world',
          internalDate: '1709654400000',
        }),
      })

    const result = await fetchGmailMessages(validToken, refreshToken, futureExpiry)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].sender).toBe('john@acme.com')
    expect(result.messages[0].content).toBe('Hello world')
    expect(result.newAccessToken).toBeUndefined()
    // Should not have called token refresh
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('refreshes token when expired', async () => {
    mockFetch
      // Token refresh
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      })
      // List messages
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      })

    const result = await fetchGmailMessages(validToken, refreshToken, pastExpiry)

    expect(result.newAccessToken).toBe('new-token')
    expect(result.newExpiresAt).toBeDefined()
    expect(result.messages).toHaveLength(0)
    // Refresh call + list call
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token')
  })

  it('returns empty array when no messages exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: undefined }),
    })

    const result = await fetchGmailMessages(validToken, refreshToken, futureExpiry)

    expect(result.messages).toHaveLength(0)
  })

  it('throws when list messages API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    await expect(
      fetchGmailMessages(validToken, refreshToken, futureExpiry)
    ).rejects.toThrow('Gmail list messages failed: 401')
  })

  it('throws when token refresh fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    })

    await expect(
      fetchGmailMessages(validToken, refreshToken, pastExpiry)
    ).rejects.toThrow('Failed to refresh Gmail token: 400')
  })

  it('handles From header without angle brackets', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payload: {
            headers: [{ name: 'From', value: 'plain@example.com' }],
          },
          snippet: 'Test',
          internalDate: '1709654400000',
        }),
      })

    const result = await fetchGmailMessages(validToken, refreshToken, futureExpiry)

    expect(result.messages[0].sender).toBe('plain@example.com')
  })

  it('skips messages that fail to fetch individually', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }, { id: 'msg-2' }] }),
      })
      // First message fails
      .mockResolvedValueOnce({ ok: false, status: 500 })
      // Second succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payload: {
            headers: [{ name: 'From', value: 'test@example.com' }],
          },
          snippet: 'Hello',
          internalDate: '1709654400000',
        }),
      })

    const result = await fetchGmailMessages(validToken, refreshToken, futureExpiry)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].sender).toBe('test@example.com')
  })
})
