interface SlackMessage {
  sender: string
  content: string
  received_at: string
}

interface SlackChannel {
  id: string
  name: string
}

interface SlackUserInfo {
  real_name: string
  email: string
}

async function slackApi(endpoint: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`https://slack.com/api/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`)
  }

  return data
}

export async function fetchSlackMessages(
  userId: string,
  accessToken: string
): Promise<SlackMessage[]> {
  // Get all channels the bot has access to
  const channelsData = await slackApi('conversations.list', accessToken)
  const channels: SlackChannel[] = channelsData.channels || []

  if (channels.length === 0) {
    return []
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const oldest = String(Math.floor((Date.now() - MS_PER_DAY) / 1000))

  // Cache users.info results to avoid redundant calls
  const userCache = new Map<string, SlackUserInfo>()

  async function getUserInfo(slackUserId: string): Promise<SlackUserInfo | null> {
    if (userCache.has(slackUserId)) {
      return userCache.get(slackUserId)!
    }

    try {
      const data = await slackApi('users.info', accessToken, { user: slackUserId })
      const info: SlackUserInfo = {
        real_name: data.user?.real_name || '',
        email: data.user?.profile?.email || '',
      }
      userCache.set(slackUserId, info)
      return info
    } catch {
      return null
    }
  }

  const messages: SlackMessage[] = []

  for (const channel of channels) {
    const historyData = await slackApi('conversations.history', accessToken, {
      channel: channel.id,
      oldest,
    })

    const channelMessages = historyData.messages || []

    for (const msg of channelMessages) {
      // Skip messages without a user (bot messages, system messages)
      if (!msg.user || !msg.text) continue

      const userInfo = await getUserInfo(msg.user)
      if (!userInfo || !userInfo.email) continue

      const receivedAt = new Date(parseFloat(msg.ts) * 1000).toISOString()

      messages.push({
        sender: userInfo.email,
        content: msg.text,
        received_at: receivedAt,
      })
    }
  }

  return messages
}
