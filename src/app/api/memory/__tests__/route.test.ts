/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { GET } from '../route'
import { createClient } from '@/utils/supabase/server'

const mockCreateClient = createClient as jest.Mock

function createMockSupabase({
  user = null as { id: string } | null,
  memories = [] as Array<{ client_id: string; memory: string; updated_at: string; clients: { name: string } }>,
  memoriesError = null as unknown,
} = {}) {
  const orderMock = jest.fn().mockResolvedValue({ data: memories, error: memoriesError })
  const eqMock = jest.fn().mockReturnValue({ order: orderMock })
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock })

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn(() => ({ select: selectMock })),
  }
}

describe('GET /api/memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase({ user: null }))

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns memories array with correct shape', async () => {
    const user = { id: 'user-1' }
    const memories = [
      {
        client_id: 'client-1',
        memory: 'Ongoing project: website redesign',
        updated_at: '2026-03-09T10:00:00Z',
        clients: { name: 'Acme Corp' },
      },
    ]

    mockCreateClient.mockResolvedValue(createMockSupabase({ user, memories }))

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      memories: [
        {
          client_id: 'client-1',
          client_name: 'Acme Corp',
          memory: 'Ongoing project: website redesign',
          updated_at: '2026-03-09T10:00:00Z',
        },
      ],
    })
  })

  it('returns empty memories array when no memories exist', async () => {
    const user = { id: 'user-1' }

    mockCreateClient.mockResolvedValue(createMockSupabase({ user, memories: [] }))

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ memories: [] })
  })
})
