import { generateBriefing } from '../generateBriefing'

const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockOrder = jest.fn()
const mockGte = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '## Acme Corp\n- Review the contract proposal sent yesterday.\n\n## Beta Inc\n- Respond to the design feedback.',
              },
            },
          ],
        }),
      },
    },
  }))
})

describe('generateBriefing', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockOrder.mockReturnValue({ data: [], error: null })
    mockGte.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ gte: mockGte })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return { select: mockSelect }
      }
      if (table === 'briefings') {
        return { insert: mockInsert }
      }
      return {}
    })
  })

  it('should return a no-messages briefing when there are no messages', async () => {
    mockOrder.mockReturnValue({ data: [], error: null })

    const result = await generateBriefing('user-1')

    expect(result).toBe('No new messages in the last 24 hours. Enjoy the quiet!')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        content: 'No new messages in the last 24 hours. Enjoy the quiet!',
      })
    )
  })

  it('should generate a briefing from messages grouped by client', async () => {
    mockOrder.mockReturnValue({
      data: [
        {
          content: 'Please review the contract',
          sender: 'alice@acme.com',
          received_at: '2024-01-01T10:00:00Z',
          source: 'gmail',
          clients: { name: 'Acme Corp' },
        },
        {
          content: 'Design feedback attached',
          sender: 'bob@beta.com',
          received_at: '2024-01-01T11:00:00Z',
          source: 'slack',
          clients: { name: 'Beta Inc' },
        },
      ],
      error: null,
    })

    const result = await generateBriefing('user-1')

    expect(result).toContain('Acme Corp')
    expect(result).toContain('Beta Inc')
    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(mockFrom).toHaveBeenCalledWith('briefings')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        content: expect.stringContaining('Acme Corp'),
      })
    )
  })

  it('should throw an error when messages query fails', async () => {
    mockOrder.mockReturnValue({
      data: null,
      error: { message: 'Database error' },
    })

    await expect(generateBriefing('user-1')).rejects.toThrow('Failed to fetch messages: Database error')
  })

  it('should handle messages with unknown clients', async () => {
    mockOrder.mockReturnValue({
      data: [
        {
          content: 'Hello there',
          sender: 'unknown@example.com',
          received_at: '2024-01-01T10:00:00Z',
          source: 'gmail',
          clients: null,
        },
      ],
      error: null,
    })

    const result = await generateBriefing('user-1')

    expect(result).toBeDefined()
    expect(mockInsert).toHaveBeenCalled()
  })
})
