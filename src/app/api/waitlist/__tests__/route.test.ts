/**
 * @jest-environment node
 */

jest.mock('resend', () => {
  const mockSend = jest.fn()
  const MockResend = jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  }))
  // Expose for test access
  ;(MockResend as any)._mockSend = mockSend
  return { Resend: MockResend }
})

import { POST } from '../route'
import { Resend } from 'resend'

const mockEmailSend = (Resend as any)._mockSend as jest.Mock

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    mockEmailSend.mockReset()
    mockEmailSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })
  })

  it('should return 200 and success: true with valid email', async () => {
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
  })

  it('should return 400 when email is missing', async () => {
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Email is required.' })
  })

  it('should return 400 when email is not a string', async () => {
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 123 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Email is required.' })
  })

  it('should return 500 when Resend API throws an error', async () => {
    mockEmailSend.mockRejectedValue(new Error('Resend API error'))

    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to process signup. Please try again.' })
  })

  it('should send email to the correct recipient', async () => {
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'micheleglorioso2012@gmail.com',
      })
    )
  })

  it('should include submitted email in the subject', async () => {
    const email = 'user@example.com'
    const request = new Request('http://localhost/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(request)

    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining(email),
      })
    )
  })
})
