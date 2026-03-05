/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/storeMessages', () => ({
  storeMessages: jest.fn(),
}))

import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { storeMessages } from '@/lib/storeMessages'

const mockCreateClient = createClient as jest.Mock
const mockStoreMessages = storeMessages as jest.Mock

describe('POST /api/fetch/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns success with message counts', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })

    mockStoreMessages.mockResolvedValue({ gmailCount: 5, slackCount: 3 })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, gmailCount: 5, slackCount: 3 })
    expect(mockStoreMessages).toHaveBeenCalledWith('user-1')
  })

  it('returns 500 when storeMessages throws', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })

    mockStoreMessages.mockRejectedValue(new Error('Database error'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Database error' })
  })
})
