import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans sm:pb-12">
      <nav className="border-b border-[#222222] px-6 py-4 flex justify-between items-center bg-[#111111] sm:px-8">
        <div className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
          <span>ClientBrain</span>
        </div>
        <form action={signOut}>
          <button className="border border-white text-white px-5 py-2 rounded-[6px] hover:bg-white hover:text-black transition-colors text-sm font-medium">
            Sign Out
          </button>
        </form>
      </nav>

      <main className="max-w-4xl mx-auto p-6 sm:p-8 mt-4 sm:mt-10">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Welcome back</h1>
        <p className="text-gray-400 mb-10 text-lg">Logged in as {user.email}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gmail Card */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 relative overflow-hidden flex flex-col items-start shadow-xl">
            <div className="absolute top-4 right-4 bg-[#222222] text-[#888888] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">Coming Soon</div>
            <h3 className="text-xl font-semibold mb-3">Connect Gmail</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">Sync your email communications with ClientBrain automatically. Keep track of every conversation without leaving the app.</p>
            <button disabled className="mt-auto w-full bg-[#1a1a1a] text-gray-500 border border-[#333] rounded-[6px] px-4 py-3 cursor-not-allowed font-medium transition-colors">
              Connect
            </button>
          </div>

          {/* Slack Card */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 relative overflow-hidden flex flex-col items-start shadow-xl">
            <div className="absolute top-4 right-4 bg-[#222222] text-[#888888] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">Coming Soon</div>
            <h3 className="text-xl font-semibold mb-3">Connect Slack</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">Sync your team messages with ClientBrain to keep track of conversations, tasks, and updates seamlessly.</p>
            <button disabled className="mt-auto w-full bg-[#1a1a1a] text-gray-500 border border-[#333] rounded-[6px] px-4 py-3 cursor-not-allowed font-medium transition-colors">
              Connect
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
