interface SlackMessage {
  sender: string
  content: string
  received_at: string
}

async function slackApi(
  endpoint: string,
  token: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(`https://slack.com/api/${endpoint}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Slack API ${endpoint} failed: ${response.status}`)
  }

  const data = await response.json()
  if (!data.ok) {
    throw new Error(`Slack API ${endpoint} error: ${data.error}`)
  }

  return data
}

export async function fetchSlackMessages(
  accessToken: string
): Promise<SlackMessage[]> {
  const userCache = new Map<string, string>()
  const messages: SlackMessage[] = []
  const oneDayAgo = String(Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000))

  // Get all channels
  let channelCursor: string | undefined
  const channels: Array<{ id: string }> = []

  do {
    const params: Record<string, string> = { types: 'public_channel' }
    if (channelCursor) params.cursor = channelCursor

    const channelData = await slackApi('conversations.list', accessToken, params)
    channels.push(...(channelData.channels ?? []))
    channelCursor = channelData.response_metadata?.next_cursor || undefined
  } while (channelCursor)

  // For each channel, join it (if not already a member) then fetch message history
  for (const channel of channels) {
    try {
      await slackApi('conversations.join', accessToken, { channel: channel.id })
    } catch {
      // Already a member or can't join — continue anyway
    }

    let historyCursor: string | undefined

    do {
      const historyParams: Record<string, string> = { channel: channel.id, oldest: oneDayAgo }
      if (historyCursor) historyParams.cursor = historyCursor

      let historyData: { messages?: { user?: string; subtype?: string; text?: string; ts?: string }[]; has_more?: boolean; response_metadata?: { next_cursor?: string } }
      try {
        historyData = await slackApi('conversations.history', accessToken, historyParams)
      } catch {
        break
      }

      for (const msg of historyData.messages ?? []) {
        // Skip bot messages and messages without a user
        if (!msg.user || msg.subtype) continue

        // Look up user email (with caching)
        let email: string
        const cached = userCache.get(msg.user)
        if (cached !== undefined) {
          email = cached
        } else {
          try {
            const userData = await slackApi('users.info', accessToken, {
              user: msg.user,
            })
            email = userData.user?.profile?.email ?? ''
          } catch {
            email = ''
          }
          userCache.set(msg.user, email)
        }

        if (!email) continue

        messages.push({
          sender: email,
          content: msg.text ?? '',
          received_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        })
      }

      historyCursor = historyData.has_more
        ? historyData.response_metadata?.next_cursor
        : undefined
    } while (historyCursor)
  }

  return messages
}
