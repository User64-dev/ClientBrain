import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { generateBriefing } from '@/lib/generateBriefing'
import { updateClientMemories } from '@/lib/updateClientMemories'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const briefing = await generateBriefing(user.id)

    updateClientMemories(user.id).catch((err: unknown) =>
      console.error('Memory update failed:', err)
    )

    return NextResponse.json({ success: true, briefing })
  } catch (error) {
    console.error('Briefing generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate briefing' },
      { status: 500 }
    )
  }
}
