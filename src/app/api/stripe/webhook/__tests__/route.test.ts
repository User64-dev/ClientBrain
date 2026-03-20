/**
 * @jest-environment node
 */

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { POST } from '../route'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

function makeRequest(body: string, sig: string = 'valid-sig') {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
  })
}

function makeAdminMock() {
  const upsertMock = jest.fn().mockResolvedValue({ error: null })
  const updateEqMock = jest.fn().mockResolvedValue({ error: null })
  const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock })

  mockCreateAdminClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      upsert: upsertMock,
      update: updateMock,
    }),
  })

  return { upsertMock, updateMock, updateEqMock }
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/missing/i)
  })

  it('returns 400 when webhook signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Webhook signature verification failed')
    })

    const response = await POST(makeRequest('{}') as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid signature' })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('upserts subscription as active on checkout.session.completed', async () => {
    const { upsertMock } = makeAdminMock()

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-1', plan: 'pro' },
          customer: 'cus_123',
          subscription: 'sub_123',
        },
      },
    })

    const response = await POST(makeRequest('{}') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ received: true })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', user_id: 'user-1', plan: 'pro' }),
      expect.objectContaining({ onConflict: 'user_id' })
    )
  })

  it('updates status to inactive on customer.subscription.deleted', async () => {
    const { updateMock, updateEqMock } = makeAdminMock()

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { id: 'sub_123' },
      },
    })

    const response = await POST(makeRequest('{}') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ received: true })
    expect(updateMock).toHaveBeenCalledWith({ status: 'inactive' })
    expect(updateEqMock).toHaveBeenCalledWith('stripe_subscription_id', 'sub_123')
  })
})
