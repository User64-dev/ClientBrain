/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('../gmail', () => ({
  fetchGmailMessages: jest.fn(),
}))

jest.mock('../slack', () => ({
  fetchSlackMessages: jest.fn(),
}))

import { storeMessages } from '../storeMessages'
import { createClient } from '@/utils/supabase/server'
import { fetchGmailMessages } from '../gmail'
import { fetchSlackMessages } from '../slack'

const mockCreateClient = createClient as jest.Mock
const mockFetchGmail = fetchGmailMessages as jest.Mock
const mockFetchSlack = fetchSlackMessages as jest.Mock

function createMockSupabase({
  gmailToken = null as any,
  slackToken = null as any,
  clients = [] as any[],
  upsertError = null as any,
} = {}) {
  const mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })

  const mock = {
    from: jest.fn((table: string) => {
      if (table === 'gmail_tokens') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: gmailToken }),
            }),
          }),
          update: mockUpdate,
        }
      }
      if (table === 'slack_tokens') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: slackToken }),
            }),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: clients }),
          }),
        }
      }
      if (table === 'messages') {
        return {
          upsert: jest.fn().mockResolvedValue({ error: upsertError }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    }),
    _mockUpdate: mockUpdate,
  }

  return mock
}

describe('storeMessages', () => {
  const userId = 'user-1'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches Gmail and Slack messages and stores matched ones', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: {
        access_token: 'gmail-token',
        refresh_token: 'gmail-refresh',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      slackToken: { access_token: 'slack-token' },
      clients: [{ id: 'c1', email_domain: 'acme.com', name: 'Acme' }],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    mockFetchGmail.mockResolvedValue({
      messages: [
        { sender: 'john@acme.com', content: 'Hello', received_at: '2024-03-05T12:00:00Z' },
        { sender: 'stranger@unknown.com', content: 'Spam', received_at: '2024-03-05T12:00:00Z' },
      ],
    })

    mockFetchSlack.mockResolvedValue([
      { sender: 'alice@acme.com', content: 'Hi there', received_at: '2024-03-05T13:00:00Z' },
    ])

    const result = await storeMessages(userId)

    expect(result).toEqual({ gmailCount: 1, slackCount: 1 })
    expect(mockFetchGmail).toHaveBeenCalledWith('gmail-token', 'gmail-refresh', expect.any(String))
    expect(mockFetchSlack).toHaveBeenCalledWith('slack-token')
  })

  it('handles missing Gmail token gracefully', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: null,
      slackToken: { access_token: 'slack-token' },
      clients: [{ id: 'c1', email_domain: 'acme.com', name: 'Acme' }],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    mockFetchSlack.mockResolvedValue([
      { sender: 'alice@acme.com', content: 'Hi', received_at: '2024-03-05T13:00:00Z' },
    ])

    const result = await storeMessages(userId)

    expect(result).toEqual({ gmailCount: 0, slackCount: 1 })
    expect(mockFetchGmail).not.toHaveBeenCalled()
  })

  it('handles missing Slack token gracefully', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: {
        access_token: 'gmail-token',
        refresh_token: 'gmail-refresh',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      slackToken: null,
      clients: [{ id: 'c1', email_domain: 'acme.com', name: 'Acme' }],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    mockFetchGmail.mockResolvedValue({
      messages: [
        { sender: 'john@acme.com', content: 'Hello', received_at: '2024-03-05T12:00:00Z' },
      ],
    })

    const result = await storeMessages(userId)

    expect(result).toEqual({ gmailCount: 1, slackCount: 0 })
    expect(mockFetchSlack).not.toHaveBeenCalled()
  })

  it('handles both tokens missing', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: null,
      slackToken: null,
      clients: [],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    const result = await storeMessages(userId)

    expect(result).toEqual({ gmailCount: 0, slackCount: 0 })
  })

  it('updates Gmail token when refreshed', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: {
        access_token: 'old-token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      slackToken: null,
      clients: [],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    mockFetchGmail.mockResolvedValue({
      messages: [],
      newAccessToken: 'new-token',
      newExpiresAt: '2024-03-06T12:00:00Z',
    })

    await storeMessages(userId)

    // Verify update was called on gmail_tokens
    expect(mockSupabase.from).toHaveBeenCalledWith('gmail_tokens')
  })

  it('ignores unmatched messages', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      slackToken: null,
      clients: [{ id: 'c1', email_domain: 'specific.com', name: 'Specific Corp' }],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    mockFetchGmail.mockResolvedValue({
      messages: [
        { sender: 'nobody@other.com', content: 'Unmatched', received_at: '2024-03-05T12:00:00Z' },
      ],
    })

    const result = await storeMessages(userId)

    expect(result).toEqual({ gmailCount: 0, slackCount: 0 })
  })

  it('handles Gmail fetch failure gracefully while Slack succeeds', async () => {
    const mockSupabase = createMockSupabase({
      gmailToken: {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      slackToken: { access_token: 'slack-token' },
      clients: [{ id: 'c1', email_domain: 'acme.com', name: 'Acme' }],
    })
    mockCreateClient.mockResolvedValue(mockSupabase)

    mockFetchGmail.mockRejectedValue(new Error('Gmail API error'))
    mockFetchSlack.mockResolvedValue([
      { sender: 'alice@acme.com', content: 'Hi', received_at: '2024-03-05T13:00:00Z' },
    ])

    const result = await storeMessages(userId)

    expect(result).toEqual({ gmailCount: 0, slackCount: 1 })
  })
})
