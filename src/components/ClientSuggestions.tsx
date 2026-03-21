'use client'

import { useEffect, useState } from 'react'

interface Suggestion {
  name: string
  email_domain: string
}

export default function ClientSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [addedDomains, setAddedDomains] = useState<Set<string>>(new Set())
  const [addingDomains, setAddingDomains] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)

  useEffect(() => {
    async function detect() {
      try {
        const res = await fetch('/api/clients/detect', { method: 'POST' })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions)
        }
      } catch {
        // Silently fail — dashboard works fine without suggestions
      }
    }
    detect()
  }, [])

  async function addClient(suggestion: Suggestion) {
    setAddingDomains((prev) => new Set(prev).add(suggestion.email_domain))
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: suggestion.name, email_domain: suggestion.email_domain }),
      })
      if (!res.ok) return
      setAddedDomains((prev) => new Set(prev).add(suggestion.email_domain))
      setTimeout(() => {
        setSuggestions((prev) => prev.filter((s) => s.email_domain !== suggestion.email_domain))
        setAddedDomains((prev) => {
          const next = new Set(prev)
          next.delete(suggestion.email_domain)
          return next
        })
      }, 1500)
    } finally {
      setAddingDomains((prev) => {
        const next = new Set(prev)
        next.delete(suggestion.email_domain)
        return next
      })
    }
  }

  function dismissClient(domain: string) {
    setSuggestions((prev) => prev.filter((s) => s.email_domain !== domain))
  }

  async function addAll() {
    setAddingAll(true)
    try {
      await Promise.allSettled(suggestions.map((s) => addClient(s)))
    } finally {
      setAddingAll(false)
    }
  }

  if (suggestions.length === 0) return null

  return (
    <div className="mb-6 bg-[#111111] border border-[#4F8EF7]/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white">
          ✨ We found potential clients in your inbox
        </p>
        <button
          onClick={addAll}
          disabled={addingAll}
          className="text-xs font-medium text-[#4F8EF7] hover:text-white border border-[#4F8EF7]/40 hover:border-[#4F8EF7] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addingAll ? 'Adding...' : 'Add All'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const added = addedDomains.has(s.email_domain)
          const adding = addingDomains.has(s.email_domain)
          return (
            <div
              key={s.email_domain}
              className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg pl-3 pr-1.5 py-1.5"
            >
              <span className="text-sm font-medium text-white">{s.name}</span>
              <span className="text-xs text-gray-500">{s.email_domain}</span>
              {added ? (
                <span className="text-xs font-medium text-emerald-400 px-1.5">Added!</span>
              ) : (
                <>
                  <button
                    onClick={() => addClient(s)}
                    disabled={adding}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 px-2 py-0.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                  >
                    {adding ? '...' : 'Add'}
                  </button>
                  <button
                    onClick={() => dismissClient(s.email_domain)}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-[#333] hover:border-[#555] px-2 py-0.5 rounded transition-colors"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
