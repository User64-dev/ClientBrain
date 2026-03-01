/**
 * @jest-environment node
 */

// Test the waitlist API integration by calling the route handler directly
jest.mock('resend', () => {
  const mockSend = jest.fn()
  const MockResend = jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  }))
  ;(MockResend as any)._mockSend = mockSend
  return { Resend: MockResend }
})

import { POST } from '@/app/api/waitlist/route'
import { Resend } from 'resend'

const mockEmailSend = (Resend as any)._mockSend as jest.Mock

describe('Waitlist API integration', () => {
  beforeEach(() => {
    mockEmailSend.mockReset()
    mockEmailSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })
  })

  it('should return success when form is submitted with valid email', async () => {
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
  })

  it('should return error for invalid email submission', async () => {
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Email is required.' })
    expect(mockEmailSend).not.toHaveBeenCalled()
  })

  it('should handle server errors gracefully', async () => {
    mockEmailSend.mockRejectedValue(new Error('Email service unavailable'))

    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })
})
