import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PricingContent from './PricingContent'

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentPlan =
    subscription?.status === 'active' ? (subscription.plan as string) : null

  return <PricingContent currentPlan={currentPlan} />
}
