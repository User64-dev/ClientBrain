import { createClient } from '@/utils/supabase/server'
import { fetchGmailMessages } from './gmail'
import { fetchSlackMessages } from './slack'
import { matchMessageToClient } from './matcher'

export async function storeMessages(
  userId: string
): Promise<{ gmailCount: number; slackCount: number }> {
  const supabase = await createClient()

  // Fetch tokens in parallel
  const [gmailTokenResult, slackTokenResult] = await Promise.all([
    supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('slack_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const gmailToken = gmailTokenResult.data
  const slackToken = slackTokenResult.data

  // Fetch messages from both sources in parallel
  const [gmailResult, slackResult] = await Promise.allSettled([
    gmailToken
      ? fetchGmailMessages(
          gmailToken.access_token,
          gmailToken.refresh_token,
          gmailToken.expires_at
        )
      : Promise.resolve({ messages: [] as { sender: string; content: string; received_at: string }[], newAccessToken: undefined, newExpiresAt: undefined }),
    slackToken
      ? fetchSlackMessages(slackToken.access_token)
      : Promise.resolve([] as { sender: string; content: string; received_at: string }[]),
  ])

  const gmailMessages =
    gmailResult.status === 'fulfilled' ? gmailResult.value.messages : []
  const slackMessages =
    slackResult.status === 'fulfilled' ? slackResult.value : []

  // Update refreshed Gmail token if needed
  if (
    gmailResult.status === 'fulfilled' &&
    gmailResult.value.newAccessToken
  ) {
    await supabase
      .from('gmail_tokens')
      .update({
        access_token: gmailResult.value.newAccessToken,
        expires_at: gmailResult.value.newExpiresAt,
      })
      .eq('user_id', userId)
  }

  // Fetch clients for matching
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)

  const clientList = clients ?? []

  // Match and collect messages to insert
  const toInsert: Array<{
    user_id: string
    client_id: string
    source: string
    content: string
    sender: string
    received_at: string
  }> = []

  for (const msg of gmailMessages) {
    const client = matchMessageToClient(msg.sender, msg.content, clientList)
    if (client) {
      toInsert.push({
        user_id: userId,
        client_id: client.id,
        source: 'gmail',
        content: msg.content,
        sender: msg.sender,
        received_at: msg.received_at,
      })
    }
  }

  for (const msg of slackMessages) {
    const client = matchMessageToClient(msg.sender, msg.content, clientList)
    if (client) {
      toInsert.push({
        user_id: userId,
        client_id: client.id,
        source: 'slack',
        content: msg.content,
        sender: msg.sender,
        received_at: msg.received_at,
      })
    }
  }

  let gmailCount = toInsert.filter((m) => m.source === 'gmail').length
  let slackCount = toInsert.filter((m) => m.source === 'slack').length

  if (toInsert.length > 0) {
    const { error } = await supabase.from('messages').upsert(toInsert, {
      onConflict: 'user_id,source,sender,received_at',
    })

    if (error) {
      // Fall back to insert if upsert constraint doesn't exist
      const { error: insertError } = await supabase
        .from('messages')
        .insert(toInsert)

      if (insertError) {
        throw new Error(`Failed to store messages: ${insertError.message}`)
      }
    }
  }

  return { gmailCount, slackCount }
}
