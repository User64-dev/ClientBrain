import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

type Plan = 'pro' | 'team'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body as { plan: unknown }

    if (plan !== 'pro' && plan !== 'team') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId =
      plan === 'pro'
        ? process.env.STRIPE_CLIENTBRAIN_PRO_PRICE_ID!
        : process.env.STRIPE_CLIENTBRAIN_TEAM_PRICE_ID!

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id as string | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase.from('subscriptions').upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: 'user_id' }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?payment=success`,
      cancel_url: `${appUrl}/dashboard?payment=cancelled`,
      metadata: { userId: user.id, plan: plan as Plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
