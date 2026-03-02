import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard?slack=error`)
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/slack/callback`,
      }),
    })

    const data = await tokenResponse.json()

    if (!data.ok) {
      console.error('Slack token exchange failed:', data.error)
      return NextResponse.redirect(`${appUrl}/dashboard?slack=error`)
    }

    // Get the current Supabase user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('No authenticated user:', userError)
      return NextResponse.redirect(`${appUrl}/dashboard?slack=error`)
    }

    // Upsert token into slack_tokens table
    const { error: upsertError } = await supabase
      .from('slack_tokens')
      .upsert(
        {
          user_id: user.id,
          access_token: data.access_token,
          workspace_name: data.team?.name || null,
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Failed to store Slack tokens:', upsertError)
      return NextResponse.redirect(`${appUrl}/dashboard?slack=error`)
    }

    return NextResponse.redirect(`${appUrl}/dashboard?slack=connected`)
  } catch (error) {
    console.error('Slack OAuth callback error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard?slack=error`)
  }
}
