'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardContentProps {
  userEmail: string
  gmailConnected: boolean
  slackConnected: boolean
  signOutAction: () => Promise<void>
}

export default function DashboardContent({
  userEmail,
  gmailConnected,
  slackConnected,
  signOutAction,
}: DashboardContentProps) {
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ gmailCount: number; slackCount: number } | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    const gmailStatus = searchParams.get('gmail')
    if (gmailStatus === 'connected') {
      setToast({ type: 'success', message: 'Gmail connected successfully!' })
    } else if (gmailStatus === 'error') {
      setToast({ type: 'error', message: 'Failed to connect Gmail. Please try again.' })
    }

    const slackStatus = searchParams.get('slack')
    if (slackStatus === 'connected') {
      setToast({ type: 'success', message: 'Slack connected successfully!' })
    } else if (slackStatus === 'error') {
      setToast({ type: 'error', message: 'Failed to connect Slack. Please try again.' })
    }
  }, [searchParams])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)

    try {
      const res = await fetch('/api/fetch/messages', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setSyncError(data.error || 'Failed to sync messages')
        return
      }

      setSyncResult({ gmailCount: data.gmailCount, slackCount: data.slackCount })
    } catch {
      setSyncError('Failed to sync messages. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans sm:pb-12">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      <nav className="border-b border-[#222222] px-6 py-4 flex justify-between items-center bg-[#111111] sm:px-8">
        <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
          <span>ClientBrain</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clients"
            className="bg-[#4F8EF7] hover:bg-[#3b7ae0] text-white px-5 py-2 rounded-[6px] transition-colors text-sm font-medium"
          >
            Manage Clients
          </Link>
          <form action={signOutAction}>
            <button className="border border-white text-white px-5 py-2 rounded-[6px] hover:bg-white hover:text-black transition-colors text-sm font-medium">
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 sm:p-8 mt-4 sm:mt-10">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Welcome back</h1>
        <p className="text-gray-400 mb-10 text-lg">Logged in as {userEmail}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gmail Card */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 relative overflow-hidden flex flex-col items-start shadow-xl">
            {gmailConnected ? (
              <div className="absolute top-4 right-4 bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connected
              </div>
            ) : (
              <div className="absolute top-4 right-4 bg-[#222222] text-[#888888] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                Not Connected
              </div>
            )}
            <h3 className="text-xl font-semibold mb-3">Connect Gmail</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Sync your email communications with ClientBrain automatically. Keep track of every conversation without leaving the app.
            </p>
            {gmailConnected ? (
              <button
                disabled
                className="mt-auto w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-[6px] px-4 py-3 cursor-not-allowed font-medium"
              >
                ✓ Gmail Connected
              </button>
            ) : (
              <a
                href="/api/auth/gmail"
                className="mt-auto w-full bg-white text-black rounded-[6px] px-4 py-3 font-medium text-center hover:bg-gray-200 transition-colors inline-block"
              >
                Connect
              </a>
            )}
          </div>

          {/* Slack Card */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 relative overflow-hidden flex flex-col items-start shadow-xl">
            {slackConnected ? (
              <div className="absolute top-4 right-4 bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connected
              </div>
            ) : (
              <div className="absolute top-4 right-4 bg-[#222222] text-[#888888] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                Not Connected
              </div>
            )}
            <h3 className="text-xl font-semibold mb-3">Connect Slack</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Sync your team messages with ClientBrain to keep track of conversations, tasks, and updates seamlessly.
            </p>
            {slackConnected ? (
              <button
                disabled
                className="mt-auto w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-[6px] px-4 py-3 cursor-not-allowed font-medium"
              >
                ✓ Slack Connected
              </button>
            ) : (
              <a
                href="/api/auth/slack"
                className="mt-auto w-full bg-white text-black rounded-[6px] px-4 py-3 font-medium text-center hover:bg-gray-200 transition-colors inline-block"
              >
                Connect
              </a>
            )}
          </div>
        </div>

        {/* Sync Section */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-[#4F8EF7] hover:bg-[#3b7ae0] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors text-sm"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>

          {syncResult && (
            <p className="text-emerald-400 text-sm font-medium">
              Synced {syncResult.gmailCount} emails and {syncResult.slackCount} Slack messages
            </p>
          )}

          {syncError && (
            <p className="text-red-400 text-sm font-medium">{syncError}</p>
          )}
        </div>
      </main>
    </div>
  )
}
