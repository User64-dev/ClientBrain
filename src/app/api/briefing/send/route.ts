import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBriefingEmail } from '@/lib/sendBriefingEmail'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userId } = body as { userId?: string }

    const supabase = createAdminClient()
    let sent = 0

    if (userId) {
      const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
      if (error || !user?.email) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const result = await sendBriefingEmail(user.id, user.email)
      if ('success' in result) sent = 1

      return NextResponse.json({ success: true, sent })
    }

    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (error) {
      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      )
    }

    for (const user of users) {
      if (!user.email) continue
      const result = await sendBriefingEmail(user.id, user.email)
      if ('success' in result) sent++
    }

    return NextResponse.json({ success: true, sent })
  } catch (error) {
    console.error('Briefing send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send briefings' },
      { status: 500 }
    )
  }
}
