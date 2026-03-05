import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: briefing, error } = await supabase
      .from('briefings')
      .select('content')
      .eq('user_id', user.id)
      .gte('sent_at', todayStart.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch briefing: ${error.message}`)
    }

    return NextResponse.json({ briefing: briefing?.content || null })
  } catch (error) {
    console.error('Briefing fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch briefing' },
      { status: 500 }
    )
  }
}
