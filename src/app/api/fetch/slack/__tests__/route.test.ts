/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/storeSlackMessages', () => ({
  storeSlackMessages: jest.fn(),
}))

import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { storeSlackMessages } from '@/lib/storeSlackMessages'

const mockCreateClient = createClient as jest.Mock
const mockStoreSlackMessages = storeSlackMessages as jest.Mock

describe('POST /api/fetch/slack', () => {
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
    expect(data.error).toBe('Unauthorized')
  })

  it('returns success with count on successful sync', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })
    mockStoreSlackMessages.mockResolvedValue(3)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, count: 3 })
    expect(mockStoreSlackMessages).toHaveBeenCalledWith('user-1')
  })

  it('returns 500 on error', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })
    mockStoreSlackMessages.mockRejectedValue(new Error('Slack token not found'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Slack token not found')
  })
})
