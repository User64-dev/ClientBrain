import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('slack_tokens')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete Slack token:', error)
      return NextResponse.json({ error: 'Failed to disconnect Slack' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Slack disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect Slack' }, { status: 500 })
  }
}
