import { createClient } from '@/utils/supabase/server'
import { storeGmailMessages } from '@/lib/storeMessages'
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

    const count = await storeGmailMessages(user.id)

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Gmail fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Gmail messages' },
      { status: 500 }
    )
  }
}
