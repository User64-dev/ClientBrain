import { createClient } from '@/utils/supabase/server'
import { fetchSlackMessages } from '@/lib/slack'
import { matchMessageToClient, Client } from '@/lib/matcher'

export async function storeSlackMessages(userId: string): Promise<number> {
  const supabase = await createClient()

  // Get the user's Slack token
  const { data: tokenData, error: tokenError } = await supabase
    .from('slack_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single()

  if (tokenError || !tokenData) {
    throw new Error('Slack token not found')
  }

  const messages = await fetchSlackMessages(userId, tokenData.access_token)

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)

  if (clientsError) {
    throw new Error(`Failed to fetch clients: ${clientsError.message}`)
  }

  let count = 0

  for (const message of messages) {
    const client = matchMessageToClient(message.sender, (clients || []) as Client[])
    if (!client) continue

    const { error } = await supabase.from('messages').upsert(
      {
        user_id: userId,
        client_id: client.id,
        source: 'slack',
        content: message.content,
        sender: message.sender,
        received_at: message.received_at,
      },
      { onConflict: 'user_id,source,sender,received_at' }
    )

    if (!error) {
      count++
    }
  }

  return count
}
