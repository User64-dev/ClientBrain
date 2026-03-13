import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from './DashboardContent'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if the user has a Gmail token
  const { data: gmailToken } = await supabase
    .from('gmail_tokens')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Check if the user has a Slack token
  const { data: slackToken } = await supabase
    .from('slack_tokens')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <DashboardContent
      userEmail={user.email || ''}
      gmailConnected={!!gmailToken}
      slackConnected={!!slackToken}
      signOutAction={signOut}
      subscription={subscription}
    />
  )
}
