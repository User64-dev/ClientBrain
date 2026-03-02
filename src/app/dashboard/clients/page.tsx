import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientsContent from '@/components/ClientsContent'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <ClientsContent
      clients={clients || []}
      userEmail={user.email || ''}
    />
  )
}
