/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/storeMessages', () => ({
  storeGmailMessages: jest.fn(),
}))

import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { storeGmailMessages } from '@/lib/storeMessages'

const mockCreateClient = createClient as jest.Mock
const mockStoreGmailMessages = storeGmailMessages as jest.Mock

describe('POST /api/fetch/gmail', () => {
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
    mockStoreGmailMessages.mockResolvedValue(5)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, count: 5 })
    expect(mockStoreGmailMessages).toHaveBeenCalledWith('user-1')
  })

  it('returns 500 on error', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })
    mockStoreGmailMessages.mockRejectedValue(new Error('Gmail token not found'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Gmail token not found')
  })
})
