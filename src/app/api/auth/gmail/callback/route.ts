import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/gmail/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
    }

    const tokens = await tokenResponse.json()

    // Get the current Supabase user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('No authenticated user:', userError)
      return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
    }

    // Calculate token expiration timestamp
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert tokens into gmail_tokens table
    const { error: upsertError } = await supabase
      .from('gmail_tokens')
      .upsert(
        {
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError)
      return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
    }

    return NextResponse.redirect(`${appUrl}/dashboard?gmail=connected`)
  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard?gmail=error`)
  }
}
