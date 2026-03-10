/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/sendBriefingEmail', () => ({
  sendBriefingEmail: jest.fn(),
}))

import { POST } from '../route'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBriefingEmail } from '@/lib/sendBriefingEmail'
import { NextRequest } from 'next/server'

const mockCreateAdminClient = createAdminClient as jest.Mock
const mockSendBriefingEmail = sendBriefingEmail as jest.Mock

function createRequest(options: {
  authorization?: string
  body?: Record<string, unknown>
} = {}) {
  const headers = new Headers()
  if (options.authorization) {
    headers.set('authorization', options.authorization)
  }
  return new NextRequest('http://localhost/api/briefing/send', {
    method: 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

describe('POST /api/briefing/send', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 without authorization header', async () => {
    const response = await POST(createRequest())
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 with wrong secret', async () => {
    const response = await POST(
      createRequest({ authorization: 'Bearer wrong-secret' })
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('sends briefing to all users when no userId provided', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'user-1', email: 'a@test.com' },
                { id: 'user-2', email: 'b@test.com' },
              ],
            },
            error: null,
          }),
        },
      },
    })
    mockSendBriefingEmail.mockResolvedValue({ success: true })

    const response = await POST(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, sent: 2 })
    expect(mockSendBriefingEmail).toHaveBeenCalledTimes(2)
    expect(mockSendBriefingEmail).toHaveBeenCalledWith('user-1', 'a@test.com')
    expect(mockSendBriefingEmail).toHaveBeenCalledWith('user-2', 'b@test.com')
  })

  it('sends briefing to specific user when userId provided', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'a@test.com' } },
            error: null,
          }),
        },
      },
    })
    mockSendBriefingEmail.mockResolvedValue({ success: true })

    const response = await POST(
      createRequest({
        authorization: 'Bearer test-cron-secret',
        body: { userId: 'user-1' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, sent: 1 })
    expect(mockSendBriefingEmail).toHaveBeenCalledWith('user-1', 'a@test.com')
  })

  it('returns 404 when specific user not found', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'User not found' },
          }),
        },
      },
    })

    const response = await POST(
      createRequest({
        authorization: 'Bearer test-cron-secret',
        body: { userId: 'nonexistent' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'User not found' })
  })

  it('skips users without email', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'user-1', email: 'a@test.com' },
                { id: 'user-2', email: null },
              ],
            },
            error: null,
          }),
        },
      },
    })
    mockSendBriefingEmail.mockResolvedValue({ success: true })

    const response = await POST(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, sent: 1 })
    expect(mockSendBriefingEmail).toHaveBeenCalledTimes(1)
  })

  it('continues sending when one user fails', async () => {
    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'user-1', email: 'a@test.com' },
                { id: 'user-2', email: 'b@test.com' },
              ],
            },
            error: null,
          }),
        },
      },
    })
    mockSendBriefingEmail
      .mockResolvedValueOnce({ error: 'Failed for user-1' })
      .mockResolvedValueOnce({ success: true })

    const response = await POST(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, sent: 1 })
    expect(mockSendBriefingEmail).toHaveBeenCalledTimes(2)
  })
})
