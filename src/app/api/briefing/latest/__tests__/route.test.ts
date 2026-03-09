/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET } from '../route'
import { createClient } from '@/utils/supabase/server'

const mockCreateClient = createClient as jest.Mock

describe('GET /api/briefing/latest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns briefing content when one exists', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    content: 'Your briefing here',
                    sent_at: '2026-03-09T08:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      briefing: 'Your briefing here',
      generatedAt: '2026-03-09T08:00:00Z',
    })
  })

  it('returns null briefing when none exists', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      briefing: null,
      generatedAt: null,
    })
  })
})
