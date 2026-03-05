jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/slack', () => ({
  fetchSlackMessages: jest.fn(),
}))

jest.mock('@/lib/matcher', () => ({
  matchMessageToClient: jest.fn(),
}))

import { storeSlackMessages } from '../storeSlackMessages'
import { createClient } from '@/utils/supabase/server'
import { fetchSlackMessages } from '@/lib/slack'
import { matchMessageToClient } from '@/lib/matcher'

const mockCreateClient = createClient as jest.Mock
const mockFetchSlackMessages = fetchSlackMessages as jest.Mock
const mockMatchMessageToClient = matchMessageToClient as jest.Mock

function createMockSupabase({
  token = { access_token: 'slack-token' } as any,
  tokenError = null as any,
  clients = [] as any[],
  clientsError = null as any,
  upsertError = null as any,
} = {}) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'slack_tokens') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: token, error: tokenError }),
            }),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: clients, error: clientsError }),
          }),
        }
      }
      if (table === 'messages') {
        return {
          upsert: jest.fn().mockResolvedValue({ error: upsertError }),
        }
      }
      return {}
    }),
  }
}

describe('storeSlackMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('stores matched messages and returns count', async () => {
    const clients = [{ id: 'c1', email_domain: 'acme.com' }]
    const messages = [
      { sender: 'john@acme.com', content: 'Hello', received_at: '2024-01-01T00:00:00Z' },
      { sender: 'jane@unknown.com', content: 'Hi', received_at: '2024-01-01T01:00:00Z' },
    ]

    mockFetchSlackMessages.mockResolvedValue(messages)
    mockCreateClient.mockResolvedValue(createMockSupabase({ clients }))
    mockMatchMessageToClient
      .mockReturnValueOnce(clients[0])
      .mockReturnValueOnce(null)

    const count = await storeSlackMessages('user-1')
    expect(count).toBe(1)
    expect(mockMatchMessageToClient).toHaveBeenCalledTimes(2)
    expect(mockFetchSlackMessages).toHaveBeenCalledWith('user-1', 'slack-token')
  })

  it('returns 0 when no messages match any client', async () => {
    mockFetchSlackMessages.mockResolvedValue([
      { sender: 'nobody@nowhere.com', content: 'Test', received_at: '2024-01-01T00:00:00Z' },
    ])
    mockCreateClient.mockResolvedValue(createMockSupabase())
    mockMatchMessageToClient.mockReturnValue(null)

    const count = await storeSlackMessages('user-1')
    expect(count).toBe(0)
  })

  it('returns 0 when there are no messages', async () => {
    mockFetchSlackMessages.mockResolvedValue([])
    mockCreateClient.mockResolvedValue(createMockSupabase())

    const count = await storeSlackMessages('user-1')
    expect(count).toBe(0)
  })

  it('throws when Slack token not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ token: null, tokenError: { message: 'not found' } })
    )

    await expect(storeSlackMessages('user-1')).rejects.toThrow('Slack token not found')
  })

  it('throws when clients fetch fails', async () => {
    mockFetchSlackMessages.mockResolvedValue([])
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ clientsError: { message: 'fail' } })
    )

    await expect(storeSlackMessages('user-1')).rejects.toThrow('Failed to fetch clients: fail')
  })
})
