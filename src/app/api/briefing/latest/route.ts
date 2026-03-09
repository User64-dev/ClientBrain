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

    const { data, error } = await supabase
      .from('briefings')
      .select('content, sent_at')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch briefing: ${error.message}`)
    }

    return NextResponse.json({
      briefing: data?.content ?? null,
      generatedAt: data?.sent_at ?? null,
    })
  } catch (error) {
    console.error('Fetch latest briefing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch briefing' },
      { status: 500 }
    )
  }
}
