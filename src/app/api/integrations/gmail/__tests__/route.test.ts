/** @jest-environment node */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { DELETE } from '../route'
import { createClient } from '@/utils/supabase/server'

const mockCreateClient = createClient as jest.Mock

function createMockSupabase({
  user = null as { id: string } | null,
  deleteError = null as { message: string } | null,
} = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn(() => ({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: deleteError }),
      }),
    })),
  }
}

describe('DELETE /api/integrations/gmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase({ user: null }))

    const res = await DELETE()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns success when token deleted successfully', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: { id: 'user-1' }, deleteError: null })
    )

    const res = await DELETE()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })

  it('returns 500 on database error', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ user: { id: 'user-1' }, deleteError: { message: 'db error' } })
    )

    const res = await DELETE()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to disconnect Gmail' })
  })
})
