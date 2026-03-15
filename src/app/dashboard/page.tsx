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

  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const subscription =
    subscriptionData
      ? { plan: subscriptionData.plan as string, status: subscriptionData.status as string }
      : null

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
