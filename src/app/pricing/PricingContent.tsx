'use client'

import { useState } from 'react'

interface PricingContentProps {
  currentPlan: string | null
}

const proFeatures = [
  '1 user',
  'Gmail + Slack sync',
  'Daily AI briefing',
  'Up to 10 clients',
]

const teamFeatures = [
  'Up to 5 users',
  'Everything in Pro',
  'Shared client workspace',
  'Unified team briefing',
  'Priority support',
]

export default function PricingContent({ currentPlan }: PricingContentProps) {
  const [loadingPlan, setLoadingPlan] = useState<'pro' | 'team' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe(plan: 'pro' | 'team') {
    setLoadingPlan(plan)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start checkout')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <nav className="border-b border-[#222222] px-6 py-4 bg-[#111111]">
        <span className="font-bold text-xl tracking-tight">ClientBrain</span>
      </nav>

      <main className="max-w-4xl mx-auto p-6 sm:p-8 mt-8 sm:mt-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-400 text-lg">Choose the plan that fits your team</p>
        </div>

        {error && (
          <div className="mb-8 text-center text-red-400 text-sm font-medium">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pro Card */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 flex flex-col relative">
            {currentPlan === 'pro' && (
              <div className="absolute top-4 right-4 bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                Current Plan
              </div>
            )}
            <h2 className="text-xl font-bold mb-1">Pro</h2>
            <div className="mb-6">
              <span className="text-4xl font-bold">€9.99</span>
              <span className="text-gray-400 ml-1">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={loadingPlan !== null || currentPlan === 'pro'}
              className="w-full bg-[#4F8EF7] hover:bg-[#3b7ae0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-[6px] px-4 py-3 transition-colors text-sm"
            >
              {loadingPlan === 'pro' ? 'Redirecting…' : currentPlan === 'pro' ? 'Current Plan' : 'Subscribe — Pro'}
            </button>
          </div>

          {/* Team Card */}
          <div className="bg-[#111111] border border-[#4F8EF7]/30 rounded-xl p-8 flex flex-col relative">
            <div className="absolute top-4 left-8">
              <span className="bg-[#4F8EF7]/15 text-[#4F8EF7] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                Most Popular
              </span>
            </div>
            {currentPlan === 'team' && (
              <div className="absolute top-4 right-4 bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                Current Plan
              </div>
            )}
            <h2 className="text-xl font-bold mb-1 mt-8">Team</h2>
            <div className="mb-6">
              <span className="text-4xl font-bold">€19.99</span>
              <span className="text-gray-400 ml-1">/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {teamFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('team')}
              disabled={loadingPlan !== null || currentPlan === 'team'}
              className="w-full bg-[#4F8EF7] hover:bg-[#3b7ae0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-[6px] px-4 py-3 transition-colors text-sm"
            >
              {loadingPlan === 'team' ? 'Redirecting…' : currentPlan === 'team' ? 'Current Plan' : 'Subscribe — Team'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
