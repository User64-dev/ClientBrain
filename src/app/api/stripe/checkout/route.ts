import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

function getPriceId(plan: string): string | undefined {
  const priceIds: Record<string, string | undefined> = {
    pro: process.env.STRIPE_CLIENTBRAIN_PRO,
    team: process.env.STRIPE_CLIENTBRAIN_TEAM,
  }
  return priceIds[plan]
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json()

    const priceId = getPriceId(plan)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "team".' },
        { status: 400 }
      )
    }

    // Check for existing Stripe customer
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = existingSub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      currency: 'eur',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
