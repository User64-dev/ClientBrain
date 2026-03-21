import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { detectClients } from '@/lib/detectClients'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const suggestions = await detectClients(user.id)
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('detectClients error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
