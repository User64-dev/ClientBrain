import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack/callback`

  const scopes = ['channels:history', 'channels:read', 'users:read', 'users:read.email'].join(',')

  const authUrl = new URL('https://slack.com/oauth/v2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes)

  return NextResponse.redirect(authUrl.toString())
}
