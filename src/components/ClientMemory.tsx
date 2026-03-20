'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Memory {
  client_id: string
  client_name: string
  memory: string
  updated_at: string
}

interface Subscription {
  plan: string
  status: string
}

interface ClientMemoryProps {
  subscription?: Subscription | null
}

export default function ClientMemory({ subscription }: ClientMemoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (subscription?.plan !== 'team') {
      setLoading(false)
      return
    }
    async function fetchMemories() {
      try {
        const res = await fetch('/api/memory')
        if (res.ok) {
          const data = await res.json()
          setMemories(data.memories ?? [])
        }
      } catch {
        // Silently fail — memories will just not show
      } finally {
        setLoading(false)
      }
    }
    fetchMemories()
  }, [subscription?.plan])

  return (
    <div className="mt-8 bg-[#111111] border border-[#222222] rounded-xl shadow-xl overflow-hidden">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[#161616] transition-colors"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="text-lg font-semibold text-white">🧠 Client Memory</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Long-term context for each client, updated daily
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6">
          {subscription?.plan !== 'team' ? (
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-4">
              <p className="text-sm text-gray-400">
                🔒 Client Memory is a Team feature.{' '}
                <Link href="/pricing" className="text-[#4F8EF7] hover:underline">
                  Upgrade to unlock.
                </Link>
              </p>
            </div>
          ) : loading ? (
            <p className="text-sm text-gray-500">Loading memories…</p>
          ) : memories.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-4">
              <p className="text-sm text-gray-400">
                No memories yet. Sync your messages to build client memory.
              </p>
            </div>
          ) : (
            memories.map((m) => (
              <div
                key={m.client_id}
                className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-4 mb-3 last:mb-0"
              >
                <p className="text-sm font-semibold text-white mb-1">{m.client_name}</p>
                <p className="text-[#aaaaaa] text-sm whitespace-pre-wrap">{m.memory}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Last updated:{' '}
                  {new Date(m.updated_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
