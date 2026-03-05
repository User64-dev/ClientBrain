interface GmailMessage {
  sender: string
  content: string
  received_at: string
}

interface FetchGmailResult {
  messages: GmailMessage[]
  newAccessToken?: string
  newExpiresAt?: string
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh Gmail token: ${response.status}`)
  }

  return response.json()
}

function extractHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function fetchGmailMessages(
  accessToken: string,
  refreshToken: string,
  expiresAt: string
): Promise<FetchGmailResult> {
  let token = accessToken
  let newAccessToken: string | undefined
  let newExpiresAt: string | undefined

  // Refresh token if expired
  if (new Date(expiresAt).getTime() < Date.now()) {
    const refreshed = await refreshAccessToken(refreshToken)
    token = refreshed.access_token
    newAccessToken = refreshed.access_token
    newExpiresAt = new Date(
      Date.now() + refreshed.expires_in * 1000
    ).toISOString()
  }

  // List messages from the last 24 hours
  const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${oneDayAgo}`

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!listResponse.ok) {
    throw new Error(`Gmail list messages failed: ${listResponse.status}`)
  }

  const listData = await listResponse.json()
  const messageIds: string[] = (listData.messages ?? []).map(
    (m: { id: string }) => m.id
  )

  if (messageIds.length === 0) {
    return { messages: [], newAccessToken, newExpiresAt }
  }

  // Fetch full message details
  const messages: GmailMessage[] = []

  for (const id of messageIds) {
    const msgResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!msgResponse.ok) continue

    const msgData = await msgResponse.json()
    const headers = msgData.payload?.headers ?? []
    const from = extractHeader(headers, 'From')
    // Extract just the email address from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/)
    const sender = emailMatch ? emailMatch[1] : from

    messages.push({
      sender,
      content: msgData.snippet ?? '',
      received_at: new Date(parseInt(msgData.internalDate, 10)).toISOString(),
    })
  }

  return { messages, newAccessToken, newExpiresAt }
}
