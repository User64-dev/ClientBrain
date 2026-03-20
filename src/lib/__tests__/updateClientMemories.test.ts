/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
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

import { updateClientMemories } from '../updateClientMemories'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const mockCreateAdminClient = createAdminClient as jest.Mock
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

function createMockSupabase({
  clients = [] as Array<{ id: string; name: string }>,
  clientsError = null as unknown,
  messages = [] as Array<{ source: string; content: string; sender: string; received_at: string }>,
  messagesError = null as unknown,
  existingMemory = null as { memory: string } | null,
  upsertError = null as unknown,
} = {}) {
  const upsertMock = jest.fn().mockResolvedValue({ error: upsertError })

  return {
    from: jest.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: clients, error: clientsError }),
          }),
        }
      }
      if (table === 'messages') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: messages, error: messagesError }),
            }),
          }),
        }
      }
      if (table === 'client_memories') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: existingMemory, error: null }),
              }),
            }),
          }),
          upsert: upsertMock,
        }
      }
      return {}
    }),
    _upsertMock: upsertMock,
  }
}

describe('updateClientMemories', () => {
  const userId = 'user-1'

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('calls OpenAI once per client and upserts the generated memory', async () => {
    const clients = [
      { id: 'client-1', name: 'Acme Corp' },
      { id: 'client-2', name: 'Globex Inc' },
    ]
    const messages = [
      { source: 'gmail', content: 'Hello', sender: 'john@acme.com', received_at: '2026-03-09T10:00:00Z' },
    ]

    const supabase = createMockSupabase({ clients, messages })
    mockCreateAdminClient.mockReturnValue(supabase)

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Updated memory content' } }],
    })
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as InstanceType<typeof OpenAI>
    )

    await updateClientMemories(userId)

    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(supabase._upsertMock).toHaveBeenCalledTimes(2)
    expect(supabase._upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        client_id: 'client-1',
        memory: 'Updated memory content',
      }),
      { onConflict: 'user_id,client_id' }
    )
  })

  it('does not throw if one client memory update fails', async () => {
    const clients = [
      { id: 'client-1', name: 'Acme Corp' },
      { id: 'client-2', name: 'Globex Inc' },
    ]

    const supabase = createMockSupabase({ clients })
    mockCreateAdminClient.mockReturnValue(supabase)

    let callCount = 0
    const mockCreate = jest.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error('OpenAI rate limit'))
      }
      return Promise.resolve({
        choices: [{ message: { content: 'Memory for Globex' } }],
      })
    })
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as InstanceType<typeof OpenAI>
    )

    await expect(updateClientMemories(userId)).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Client memory update failed:',
      expect.any(Error)
    )
  })

  it('returns early when the user has no clients', async () => {
    const supabase = createMockSupabase({ clients: [] })
    mockCreateAdminClient.mockReturnValue(supabase)

    const mockCreate = jest.fn()
    MockOpenAI.mockImplementation(
      () => ({ chat: { completions: { create: mockCreate } } }) as unknown as InstanceType<typeof OpenAI>
    )

    await updateClientMemories(userId)

    expect(mockCreate).not.toHaveBeenCalled()
  })
})
