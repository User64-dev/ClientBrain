import { createClient } from '@/utils/supabase/server'
import { fetchGmailMessages } from '@/lib/gmail'
import { matchMessageToClient, Client } from '@/lib/matcher'

export async function storeGmailMessages(userId: string): Promise<number> {
  const messages = await fetchGmailMessages(userId)

  const supabase = await createClient()

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
        source: 'gmail',
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
