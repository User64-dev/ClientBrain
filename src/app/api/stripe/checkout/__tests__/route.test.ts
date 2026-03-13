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
import { NextRequest } from 'next/server'

const mockCreateClient = createClient as jest.Mock
const mockCustomersCreate = stripe.customers.create as jest.Mock
const mockSessionsCreate = stripe.checkout.sessions.create as jest.Mock

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_CLIENTBRAIN_PRO = 'price_pro_123'
    process.env.STRIPE_CLIENTBRAIN_TEAM = 'price_team_456'
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await POST(createRequest({ plan: 'pro' }))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns checkout URL for valid pro plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    })

    mockCustomersCreate.mockResolvedValue({ id: 'cus_123' })
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_pro' })

    const response = await POST(createRequest({ plan: 'pro' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: 'https://checkout.stripe.com/session_pro' })
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'test@example.com',
      metadata: { supabase_user_id: 'user-1' },
    })
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        mode: 'subscription',
        line_items: [{ price: 'price_pro_123', quantity: 1 }],
      })
    )
  })

  it('returns checkout URL for valid team plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_existing' },
            }),
          }),
        }),
      }),
    })

    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_team' })

    const response = await POST(createRequest({ plan: 'team' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: 'https://checkout.stripe.com/session_team' })
    expect(mockCustomersCreate).not.toHaveBeenCalled()
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        line_items: [{ price: 'price_team_456', quantity: 1 }],
      })
    )
  })

  it('returns 400 for invalid plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
        }),
      },
    })

    const response = await POST(createRequest({ plan: 'enterprise' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid plan. Must be "pro" or "team".' })
  })
})
