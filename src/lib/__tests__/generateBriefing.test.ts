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

import { generateBriefing } from '../generateBriefing'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const mockCreateClient = createClient as jest.Mock
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

function createMockSupabase({
  messages = [] as any[],
  messagesError = null as any,
  insertError = null as any,
} = {}) {
  const insertMock = jest.fn().mockResolvedValue({ error: insertError })

  return {
    from: jest.fn((table: string) => {
      if (table === 'messages') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest
                .fn()
                .mockResolvedValue({ data: messages, error: messagesError }),
            }),
          }),
        }
      }
      if (table === 'briefings') {
        return {
          insert: insertMock,
        }
      }
      return {}
    }),
    _insertMock: insertMock,
  }
}

describe('generateBriefing', () => {
  const userId = 'user-1'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns fallback message when no messages found', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase({ messages: [] }))

    const result = await generateBriefing(userId)

    expect(result).toBe(
      'No messages found in the last 24 hours. Sync your Gmail and Slack to get started.'
    )
  })

  it('returns fallback message when messages is null', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ messages: null as any })
    )

    const result = await generateBriefing(userId)

    expect(result).toBe(
      'No messages found in the last 24 hours. Sync your Gmail and Slack to get started.'
    )
  })

  it('throws when messages query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        messagesError: { message: 'Database error' },
      })
    )

    await expect(generateBriefing(userId)).rejects.toThrow(
      'Failed to fetch messages: Database error'
    )
  })

  it('groups messages by client and calls OpenAI with correct prompts', async () => {
    const messages = [
      {
        source: 'gmail',
        content: 'Need the report by Friday',
        sender: 'john@acme.com',
        received_at: '2026-03-09T10:00:00Z',
        clients: { name: 'Acme Corp' },
      },
      {
        source: 'slack',
        content: 'Meeting at 3pm',
        sender: 'jane@acme.com',
        received_at: '2026-03-09T11:00:00Z',
        clients: { name: 'Acme Corp' },
      },
      {
        source: 'gmail',
        content: 'Invoice attached',
        sender: 'bob@globex.com',
        received_at: '2026-03-09T09:00:00Z',
        clients: { name: 'Globex Inc' },
      },
    ]

    mockCreateClient.mockResolvedValue(createMockSupabase({ messages }))

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Generated briefing content' } }],
    })

    MockOpenAI.mockImplementation(
      () =>
        ({
          chat: { completions: { create: mockCreate } },
        }) as any
    )

    const result = await generateBriefing(userId)

    expect(result).toBe('Generated briefing content')

    // Verify OpenAI was called with correct structure
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: expect.stringContaining(
            'You are an AI assistant for a freelancer'
          ),
        },
        {
          role: 'user',
          content: expect.stringContaining('Client: Acme Corp'),
        },
      ],
    })

    // Verify the user prompt contains both clients
    const userPrompt = mockCreate.mock.calls[0][0].messages[1].content
    expect(userPrompt).toContain('Client: Acme Corp')
    expect(userPrompt).toContain('Client: Globex Inc')
    expect(userPrompt).toContain('Email from john@acme.com')
    expect(userPrompt).toContain('Slack from jane@acme.com')
    expect(userPrompt).toContain('Email from bob@globex.com')
  })

  it('stores the briefing in the briefings table', async () => {
    const messages = [
      {
        source: 'gmail',
        content: 'Hello',
        sender: 'john@acme.com',
        received_at: '2026-03-09T10:00:00Z',
        clients: { name: 'Acme Corp' },
      },
    ]

    const mockSupabase = createMockSupabase({ messages })
    mockCreateClient.mockResolvedValue(mockSupabase)

    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Test briefing' } }],
    })

    MockOpenAI.mockImplementation(
      () =>
        ({
          chat: { completions: { create: mockCreate } },
        }) as any
    )

    await generateBriefing(userId)

    expect(mockSupabase.from).toHaveBeenCalledWith('briefings')
    expect(mockSupabase._insertMock).toHaveBeenCalledWith({
      user_id: userId,
      content: 'Test briefing',
      sent_at: expect.any(String),
    })
  })
})
