import { createClient } from '@/utils/supabase/server'
import { storeSlackMessages } from '@/lib/storeSlackMessages'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await storeSlackMessages(user.id)

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Slack fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Slack messages' },
      { status: 500 }
    )
  }
}
