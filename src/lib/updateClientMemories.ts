import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const MEMORY_SYSTEM_PROMPT =
  "You are building a long-term memory profile for a freelancer's client relationship. Analyze all messages and the existing memory (if any), then return a concise updated memory covering: ongoing projects and their status, recurring topics or concerns, communication patterns, deadlines or commitments mentioned, outstanding follow-up items, and overall relationship health. Be specific and factual. Max 300 words."

export async function updateClientMemories(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId)

  if (clientsError) {
    throw new Error(`Failed to fetch clients: ${clientsError.message}`)
  }

  if (!clients || clients.length === 0) {
    return
  }

  const results = await Promise.allSettled(
    clients.map(async (client: { id: string; name: string }) => {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('source, content, sender, received_at')
        .eq('user_id', userId)
        .eq('client_id', client.id)

      if (messagesError) {
        throw new Error(`Failed to fetch messages for client ${client.id}: ${messagesError.message}`)
      }

      const { data: existingMemory } = await supabase
        .from('client_memories')
        .select('memory')
        .eq('user_id', userId)
        .eq('client_id', client.id)
        .maybeSingle()

      const memoryBlock = existingMemory?.memory
        ? `Existing memory:\n${existingMemory.memory}\n\n`
        : ''

      const messageLines = (messages ?? []).map((m: { source: string; sender: string; content: string; received_at: string }) => {
        const date = new Date(m.received_at).toISOString().split('T')[0]
        return `[${m.source}] ${m.sender}: ${m.content} (${date})`
      })

      const userPrompt = `${memoryBlock}Messages:\n${messageLines.join('\n')}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MEMORY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      })

      const updatedMemory = response.choices[0]?.message?.content ?? ''

      const { error: upsertError } = await supabase
        .from('client_memories')
        .upsert(
          {
            user_id: userId,
            client_id: client.id,
            memory: updatedMemory,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,client_id' }
        )

      if (upsertError) {
        throw new Error(`Failed to upsert memory for client ${client.id}: ${upsertError.message}`)
      }
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Client memory update failed:', result.reason)
    }
  }
}
