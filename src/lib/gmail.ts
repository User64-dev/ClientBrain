import { createClient } from '@/utils/supabase/server'

interface GmailMessage {
  sender: string
  content: string
  received_at: string
}

export async function fetchGmailMessages(userId: string): Promise<GmailMessage[]> {
  const supabase = await createClient()

  // Get the user's Gmail token
  const { data: tokenData, error: tokenError } = await supabase
    .from('gmail_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (tokenError || !tokenData) {
    throw new Error('Gmail token not found')
  }

  let accessToken = tokenData.access_token

  // Check if token is expired and refresh if needed
  if (new Date(tokenData.expires_at) <= new Date()) {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Gmail token')
    }

    const refreshData = await refreshResponse.json()
    accessToken = refreshData.access_token

    const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

    await supabase
      .from('gmail_tokens')
      .update({ access_token: accessToken, expires_at: expiresAt })
      .eq('user_id', userId)
  }

  // Get messages from the last 24 hours
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const oneDayAgo = Math.floor((Date.now() - MS_PER_DAY) / 1000)
  const query = `after:${oneDayAgo}`

  const listResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!listResponse.ok) {
    throw new Error('Failed to fetch Gmail messages')
  }

  const listData = await listResponse.json()

  if (!listData.messages || listData.messages.length === 0) {
    return []
  }

  // Fetch full details for each message
  const messages: GmailMessage[] = []

  for (const msg of listData.messages) {
    const detailResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!detailResponse.ok) continue

    const detail = await detailResponse.json()
    const headers = detail.payload?.headers || []

    const fromHeader = headers.find(
      (h: { name: string; value: string }) => h.name.toLowerCase() === 'from'
    )
    const subjectHeader = headers.find(
      (h: { name: string; value: string }) => h.name.toLowerCase() === 'subject'
    )
    const dateHeader = headers.find(
      (h: { name: string; value: string }) => h.name.toLowerCase() === 'date'
    )

    const sender = fromHeader?.value || ''
    const subject = subjectHeader?.value || ''
    const snippet = detail.snippet || ''
    const content = subject ? `${subject}: ${snippet}` : snippet
    const receivedAt = dateHeader?.value
      ? new Date(dateHeader.value).toISOString()
      : new Date(parseInt(detail.internalDate)).toISOString()

    messages.push({ sender, content, received_at: receivedAt })
  }

  return messages
}
