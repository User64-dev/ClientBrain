/**
 * @jest-environment node
 */

import { fetchSlackMessages } from '../slack'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

function mockSlackResponse(data: any) {
  return {
    ok: true,
    json: async () => ({ ok: true, ...data }),
  }
}

describe('fetchSlackMessages', () => {
  const token = 'slack-token'

  it('fetches messages from channels with user email lookup', async () => {
    mockFetch
      // conversations.list
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C1' }],
          response_metadata: { next_cursor: '' },
        })
      )
      // conversations.history
      .mockResolvedValueOnce(
        mockSlackResponse({
          messages: [{ user: 'U1', text: 'Hello', ts: '1709654400.000' }],
          has_more: false,
        })
      )
      // users.info
      .mockResolvedValueOnce(
        mockSlackResponse({
          user: { profile: { email: 'john@acme.com' } },
        })
      )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(1)
    expect(result[0].sender).toBe('john@acme.com')
    expect(result[0].content).toBe('Hello')
  })

  it('caches user lookups to avoid duplicate API calls', async () => {
    mockFetch
      // conversations.list
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C1' }],
          response_metadata: { next_cursor: '' },
        })
      )
      // conversations.history with two messages from same user
      .mockResolvedValueOnce(
        mockSlackResponse({
          messages: [
            { user: 'U1', text: 'First', ts: '1709654400.000' },
            { user: 'U1', text: 'Second', ts: '1709654401.000' },
          ],
          has_more: false,
        })
      )
      // users.info - should only be called once
      .mockResolvedValueOnce(
        mockSlackResponse({
          user: { profile: { email: 'john@acme.com' } },
        })
      )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(2)
    // users.info called only once (3rd fetch call total)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('skips bot messages (messages with subtype)', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C1' }],
          response_metadata: { next_cursor: '' },
        })
      )
      .mockResolvedValueOnce(
        mockSlackResponse({
          messages: [
            { user: 'U1', text: 'Bot msg', ts: '1709654400.000', subtype: 'bot_message' },
          ],
          has_more: false,
        })
      )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(0)
  })

  it('skips messages without a user field', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C1' }],
          response_metadata: { next_cursor: '' },
        })
      )
      .mockResolvedValueOnce(
        mockSlackResponse({
          messages: [{ text: 'No user', ts: '1709654400.000' }],
          has_more: false,
        })
      )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(0)
  })

  it('skips messages when user has no email', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C1' }],
          response_metadata: { next_cursor: '' },
        })
      )
      .mockResolvedValueOnce(
        mockSlackResponse({
          messages: [{ user: 'U1', text: 'Hello', ts: '1709654400.000' }],
          has_more: false,
        })
      )
      .mockResolvedValueOnce(
        mockSlackResponse({
          user: { profile: {} },
        })
      )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(0)
  })

  it('handles channel pagination', async () => {
    mockFetch
      // First page of channels
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C1' }],
          response_metadata: { next_cursor: 'cursor-123' },
        })
      )
      // Second page of channels
      .mockResolvedValueOnce(
        mockSlackResponse({
          channels: [{ id: 'C2' }],
          response_metadata: { next_cursor: '' },
        })
      )
      // C1 history
      .mockResolvedValueOnce(
        mockSlackResponse({ messages: [], has_more: false })
      )
      // C2 history
      .mockResolvedValueOnce(
        mockSlackResponse({ messages: [], has_more: false })
      )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(0)
    // 2 channel pages + 2 history calls = 4
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('handles empty channel list', async () => {
    mockFetch.mockResolvedValueOnce(
      mockSlackResponse({
        channels: [],
        response_metadata: { next_cursor: '' },
      })
    )

    const result = await fetchSlackMessages(token)

    expect(result).toHaveLength(0)
  })

  it('throws when Slack API returns an error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: 'invalid_auth' }),
    })

    await expect(fetchSlackMessages(token)).rejects.toThrow(
      'Slack API conversations.list error: invalid_auth'
    )
  })
})
