'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  email_domain: string
  user_id: string
  created_at: string
}

interface ClientsContentProps {
  clients: Client[]
  userEmail: string
}

export default function ClientsContent({ clients, userEmail }: ClientsContentProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !emailDomain.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email_domain: emailDomain.trim() }),
      })

      if (res.ok) {
        setName('')
        setEmailDomain('')
        setShowModal(false)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteClient(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-gray-400 mt-1 text-lg">Manage your client list</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#4F8EF7] hover:bg-[#3b7ae0] text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            + Add Client
          </button>
        </div>

        {/* Client Cards */}
        {clients.length === 0 ? (
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-12 text-center">
            <div className="text-gray-500 text-lg mb-2">📋</div>
            <p className="text-gray-400 text-lg">
              No clients yet. Add your first client to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col gap-3 shadow-xl"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{client.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{client.email_domain}</p>
                </div>
                <button
                  onClick={() => handleDeleteClient(client.id)}
                  disabled={deletingId === client.id}
                  className="self-start bg-[#EF4444] hover:bg-[#dc2626] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {deletingId === client.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Card */}
          <div className="relative bg-[#111111] border border-[#222222] rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl leading-none"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-6">Add New Client</h2>

            <form onSubmit={handleAddClient} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#4F8EF7] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Email Domain
                </label>
                <input
                  type="text"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  placeholder="e.g. acme.com"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#4F8EF7] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !emailDomain.trim()}
                className="mt-2 bg-[#4F8EF7] hover:bg-[#3b7ae0] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Adding…' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
