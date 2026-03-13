'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

interface PlanConfig {
  name: string
  key: string
  price: string
  features: string[]
}

const PLANS: PlanConfig[] = [
  {
    name: 'Pro',
    key: 'pro',
    price: '€10',
    features: [
      '1 user',
      'Gmail + Slack sync',
      'Daily AI briefing',
      'Up to 10 clients',
    ],
  },
  {
    name: 'Team',
    key: 'team',
    price: '€20',
    features: [
      'Up to 5 users',
      'Everything in Pro',
      'Shared client workspace',
      'Unified team briefing',
      'Priority support',
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (data) {
        setCurrentPlan(data.plan)
      }
    }
    fetchSubscription()
  }, [supabase])

  async function handleSubscribe(plan: string) {
    setLoading(plan)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(null)
      router.push('/login')
      return
    }

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create checkout session')
        setLoading(null)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Failed to create checkout session')
        setLoading(null)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-[#222222] px-6 py-4 flex justify-between items-center bg-[#111111] sm:px-8">
        <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
          <span>ClientBrain</span>
        </div>
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          ← Back to Dashboard
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto p-6 sm:p-8 mt-4 sm:mt-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Choose your plan
          </h1>
          <p className="text-gray-400 text-lg">
            Upgrade to unlock the full power of ClientBrain.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.key

            return (
              <div
                key={plan.key}
                className={`bg-[#111111] border rounded-xl p-8 flex flex-col shadow-xl relative ${
                  isCurrentPlan
                    ? 'border-[#4F8EF7]'
                    : 'border-[#222222]'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4 bg-[#4F8EF7]/15 text-[#4F8EF7] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                    Current Plan
                  </div>
                )}

                <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-gray-300 text-sm"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4F8EF7"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-[6px] px-4 py-3 cursor-not-allowed font-medium"
                  >
                    ✓ Active
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={loading !== null}
                    className="w-full bg-[#4F8EF7] text-white rounded-[6px] px-4 py-3 font-medium hover:bg-[#3B7BE8] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading === plan.key ? 'Redirecting...' : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
