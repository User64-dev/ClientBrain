/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }))
})

import { detectClients } from '../detectClients'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const mockCreateClient = createClient as jest.Mock
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

interface MockSupabaseOptions {
  userEmail?: string | null
  messages?: Array<{ sender: string }> | null
  messagesError?: { message: string } | null
  clients?: Array<{ email_domain: string }>
}

function createMockSupabase({
  userEmail = 'me@mycompany.com',
  messages = [] as Array<{ sender: string }>,
  messagesError = null,
  clients = [] as Array<{ email_domain: string }>,
}: MockSupabaseOptions = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: userEmail ? { email: userEmail } : null },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'messages') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: messages, error: messagesError }),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: clients, error: null }),
          }),
        }
      }
      return {}
    }),
  }
}

describe('detectClients', () => {
  const userId = 'user-1'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty array when there are no messages', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase({ messages: [] }))

    const result = await detectClients(userId)

    expect(result).toEqual([])
    expect(MockOpenAI).not.toHaveBeenCalled()
  })

  it('filters out personal email domains', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messages: [
          { sender: 'alice@gmail.com' },
          { sender: 'bob@yahoo.com' },
          { sender: 'carol@hotmail.com' },
          { sender: 'dan@outlook.com' },
          { sender: 'eve@icloud.com' },
        ],
      })
    )

    const result = await detectClients(userId)

    expect(result).toEqual([])
    expect(MockOpenAI).not.toHaveBeenCalled()
  })

  it('filters out domains already registered as clients', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messages: [
          { sender: 'john@acme.com' },
          { sender: 'jane@globex.com' },
        ],
        clients: [
          { email_domain: 'acme.com' },
          { email_domain: 'globex.com' },
        ],
      })
    )

    const result = await detectClients(userId)

    expect(result).toEqual([])
    expect(MockOpenAI).not.toHaveBeenCalled()
  })

  it("filters out the user's own email domain", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        userEmail: 'me@mycompany.com',
        messages: [{ sender: 'colleague@mycompany.com' }],
      })
    )

    const result = await detectClients(userId)

    expect(result).toEqual([])
    expect(MockOpenAI).not.toHaveBeenCalled()
  })

  it('returns AI-generated name suggestions for new domains', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        userEmail: 'me@mycompany.com',
        messages: [
          { sender: 'john@acme.com' },
          { sender: 'jane@acme.com' }, // duplicate domain — should only call OpenAI once
        ],
      })
    )

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Acme Corp' } }],
    })
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI
    )

    const result = await detectClients(userId)

    expect(result).toEqual([{ name: 'Acme Corp', email_domain: 'acme.com' }])
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('acme.com'),
          }),
        ]),
      })
    )
  })

  it('deduplicates domains across multiple senders', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messages: [
          { sender: 'a@widget.io' },
          { sender: 'b@widget.io' },
          { sender: 'c@widget.io' },
        ],
      })
    )

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Widget IO' } }],
    })
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI
    )

    await detectClients(userId)

    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('returns partial results when some OpenAI calls fail', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messages: [
          { sender: 'a@acme.com' },
          { sender: 'b@globex.com' },
        ],
      })
    )

    const mockCreate = jest
      .fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'Acme Corp' } }] })
      .mockRejectedValueOnce(new Error('OpenAI rate limit'))

    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI
    )

    const result = await detectClients(userId)

    // Only the fulfilled result is returned
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Acme Corp')
  })

  it('handles "Display Name <email>" sender format', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messages: [{ sender: 'John Smith <john@enterprise.com>' }],
      })
    )

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Enterprise Co' } }],
    })
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI
    )

    const result = await detectClients(userId)

    expect(result).toEqual([{ name: 'Enterprise Co', email_domain: 'enterprise.com' }])
  })

  it('handles senders with invalid/missing email gracefully', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messages: [
          { sender: 'not-an-email' },
          { sender: '' },
          { sender: 'john@valid.com' },
        ],
      })
    )

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Valid Co' } }],
    })
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI
    )

    const result = await detectClients(userId)

    // Only valid.com is processed; the invalid senders are skipped
    expect(result).toEqual([{ name: 'Valid Co', email_domain: 'valid.com' }])
  })
})
