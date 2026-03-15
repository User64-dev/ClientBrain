/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}))

import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'

const mockCreateClient = createClient as jest.Mock
const mockCustomersCreate = stripe.customers.create as jest.Mock
const mockSessionsCreate = stripe.checkout.sessions.create as jest.Mock

function makeSupabaseMock(userId: string | null, existingCustomerId: string | null = null) {
  const maybeSingleMock = jest.fn().mockResolvedValue({ data: existingCustomerId ? { stripe_customer_id: existingCustomerId } : null, error: null })
  const upsertMock = jest.fn().mockResolvedValue({ error: null })

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: userId ? { id: userId, email: 'test@example.com' } : null },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: maybeSingleMock,
        }),
      }),
      upsert: upsertMock,
    }),
  }
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_CLIENTBRAIN_PRO_PRICE_ID = 'price_pro_test'
    process.env.STRIPE_CLIENTBRAIN_TEAM_PRICE_ID = 'price_team_test'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null))

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'pro' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when plan is invalid', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock('user-1'))

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'enterprise' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid plan' })
  })

  it('returns checkout url for valid pro plan', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock('user-1', 'cus_existing'))
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session/pro' })

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'pro' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: 'https://checkout.stripe.com/session/pro' })
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        line_items: [{ price: 'price_pro_test', quantity: 1 }],
      })
    )
  })

  it('returns checkout url for valid team plan and uses team price ID', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock('user-1', 'cus_existing'))
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session/team' })

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'team' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: 'https://checkout.stripe.com/session/team' })
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_team_test', quantity: 1 }],
      })
    )
  })

  it('creates a new Stripe customer when none exists', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock('user-1', null))
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' })
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session/new' })

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'pro' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as never)

    expect(response.status).toBe(200)
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_new' })
    )
  })
})
