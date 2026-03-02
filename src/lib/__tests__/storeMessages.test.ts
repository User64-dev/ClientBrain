jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/gmail', () => ({
  fetchGmailMessages: jest.fn(),
}))

jest.mock('@/lib/matcher', () => ({
  matchMessageToClient: jest.fn(),
}))

import { storeGmailMessages } from '../storeMessages'
import { createClient } from '@/utils/supabase/server'
import { fetchGmailMessages } from '@/lib/gmail'
import { matchMessageToClient } from '@/lib/matcher'

const mockCreateClient = createClient as jest.Mock
const mockFetchGmailMessages = fetchGmailMessages as jest.Mock
const mockMatchMessageToClient = matchMessageToClient as jest.Mock

function createMockSupabase(clients: any[], upsertError: any = null) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: clients, error: null }),
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

describe('storeGmailMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('stores matched messages and returns count', async () => {
    const clients = [{ id: 'c1', email_domain: 'acme.com' }]
    const messages = [
      { sender: 'john@acme.com', content: 'Hello', received_at: '2024-01-01T00:00:00Z' },
      { sender: 'jane@unknown.com', content: 'Hi', received_at: '2024-01-01T01:00:00Z' },
    ]

    mockFetchGmailMessages.mockResolvedValue(messages)
    mockCreateClient.mockResolvedValue(createMockSupabase(clients))
    mockMatchMessageToClient
      .mockReturnValueOnce(clients[0])
      .mockReturnValueOnce(null)

    const count = await storeGmailMessages('user-1')
    expect(count).toBe(1)
    expect(mockMatchMessageToClient).toHaveBeenCalledTimes(2)
  })

  it('returns 0 when no messages match any client', async () => {
    mockFetchGmailMessages.mockResolvedValue([
      { sender: 'nobody@nowhere.com', content: 'Test', received_at: '2024-01-01T00:00:00Z' },
    ])
    mockCreateClient.mockResolvedValue(createMockSupabase([]))
    mockMatchMessageToClient.mockReturnValue(null)

    const count = await storeGmailMessages('user-1')
    expect(count).toBe(0)
  })

  it('returns 0 when there are no messages', async () => {
    mockFetchGmailMessages.mockResolvedValue([])
    mockCreateClient.mockResolvedValue(createMockSupabase([]))

    const count = await storeGmailMessages('user-1')
    expect(count).toBe(0)
  })

  it('throws when clients fetch fails', async () => {
    mockFetchGmailMessages.mockResolvedValue([])
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
        }),
      })),
    })

    await expect(storeGmailMessages('user-1')).rejects.toThrow('Failed to fetch clients: fail')
  })
})
