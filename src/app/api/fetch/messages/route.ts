import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { storeMessages } from '@/lib/storeMessages'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gmailCount, slackCount } = await storeMessages(user.id)

    return NextResponse.json({ success: true, gmailCount, slackCount })
  } catch (error) {
    console.error('Message fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
