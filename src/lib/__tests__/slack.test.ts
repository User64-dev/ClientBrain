/**
 * @jest-environment node
 */

export {} // ensure module scope

const originalFetch = global.fetch

describe('fetchSlackMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetches messages across channels with user info resolution', async () => {
    global.fetch = jest.fn()
      // conversations.list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [{ id: 'C1', name: 'general' }],
        }),
      })
      // conversations.history
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { user: 'U1', text: 'Hello world', ts: '1704067200.000000' },
          ],
        }),
      })
      // users.info
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            real_name: 'John Doe',
            profile: { email: 'john@acme.com' },
          },
        }),
      }) as jest.Mock

    const { fetchSlackMessages } = require('../slack')
    const messages = await fetchSlackMessages('user-1', 'token-123')

    expect(messages).toHaveLength(1)
    expect(messages[0].sender).toBe('john@acme.com')
    expect(messages[0].content).toBe('Hello world')
    expect(messages[0].received_at).toBe(new Date(1704067200 * 1000).toISOString())
  })

  it('returns empty array when no channels exist', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, channels: [] }),
    }) as jest.Mock

    const { fetchSlackMessages } = require('../slack')
    const messages = await fetchSlackMessages('user-1', 'token-123')

    expect(messages).toHaveLength(0)
  })

  it('returns empty array when no messages exist', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [{ id: 'C1', name: 'general' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, messages: [] }),
      }) as jest.Mock

    const { fetchSlackMessages } = require('../slack')
    const messages = await fetchSlackMessages('user-1', 'token-123')

    expect(messages).toHaveLength(0)
  })

  it('throws on conversations.list failure', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: 'invalid_auth' }),
    }) as jest.Mock

    const { fetchSlackMessages } = require('../slack')
    await expect(fetchSlackMessages('user-1', 'token-123')).rejects.toThrow(
      'Slack API error: invalid_auth'
    )
  })

  it('skips messages without a user field', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [{ id: 'C1', name: 'general' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { text: 'Bot message', ts: '1704067200.000000' },
            { user: 'U1', text: 'Human message', ts: '1704067201.000000' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            real_name: 'Jane',
            profile: { email: 'jane@acme.com' },
          },
        }),
      }) as jest.Mock

    const { fetchSlackMessages } = require('../slack')
    const messages = await fetchSlackMessages('user-1', 'token-123')

    expect(messages).toHaveLength(1)
    expect(messages[0].sender).toBe('jane@acme.com')
  })

  it('caches users.info calls for the same user', async () => {
    global.fetch = jest.fn()
      // conversations.list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [{ id: 'C1', name: 'general' }, { id: 'C2', name: 'random' }],
        }),
      })
      // conversations.history for C1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [{ user: 'U1', text: 'msg1', ts: '1704067200.000000' }],
        }),
      })
      // users.info for U1 (first call)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: { real_name: 'John', profile: { email: 'john@acme.com' } },
        }),
      })
      // conversations.history for C2
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [{ user: 'U1', text: 'msg2', ts: '1704067201.000000' }],
        }),
      }) as jest.Mock
      // users.info for U1 should NOT be called again (cached)

    const { fetchSlackMessages } = require('../slack')
    const messages = await fetchSlackMessages('user-1', 'token-123')

    expect(messages).toHaveLength(2)
    // conversations.list + 2x conversations.history + 1x users.info = 4 calls total
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })
})
