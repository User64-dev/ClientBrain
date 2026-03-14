/**
 * @jest-environment node
 */

const mockUpsert = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ error: null }),
})

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      upsert: mockUpsert,
      update: mockUpdate,
    }),
  })),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
  },
}))

import { POST } from '../route'
import { stripe } from '@/lib/stripe'
import { NextRequest } from 'next/server'

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock
const mockSubscriptionsRetrieve = stripe.subscriptions.retrieve as jest.Mock

function createWebhookRequest(body: string, signature: string = 'sig_test'): NextRequest {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
    body,
  })
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(createWebhookRequest('{}'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid signature' })
  })

  it('upserts subscription on checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          customer: 'cus_123',
          subscription: 'sub_456',
        },
      },
    })

    mockSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_456',
      metadata: { supabase_user_id: 'user-1', plan: 'pro' },
      items: { data: [{ current_period_end: 1700000000 }] },
    })

    const response = await POST(createWebhookRequest('{}'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ received: true })
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_456')
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_456',
        plan: 'pro',
        status: 'active',
        current_period_end: new Date(1700000000 * 1000).toISOString(),
      },
      { onConflict: 'user_id' }
    )
  })

  it('updates status to inactive on subscription.deleted', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_456',
        },
      },
    })

    const response = await POST(createWebhookRequest('{}'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ received: true })
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'inactive' })
  })
})
