import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

export async function generateBriefing(userId: string): Promise<string> {
  const supabase = await createClient()

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: messages, error } = await supabase
    .from('messages')
    .select('source, content, sender, received_at, clients(name)')
    .eq('user_id', userId)
    .gte('received_at', twentyFourHoursAgo)

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }

  if (!messages || messages.length === 0) {
    return 'No messages found in the last 24 hours. Sync your Gmail and Slack to get started.'
  }

  // Group messages by client name
  const grouped: Record<
    string,
    Array<{ source: string; sender: string; content: string; received_at: string }>
  > = {}

  for (const msg of messages) {
    const client = msg.clients as unknown as { name: string } | null
    const clientName = client?.name ?? 'Unknown Client'
    if (!grouped[clientName]) {
      grouped[clientName] = []
    }
    grouped[clientName].push({
      source: msg.source,
      sender: msg.sender,
      content: msg.content,
      received_at: msg.received_at,
    })
  }

  // Build user prompt
  const lines: string[] = []
  for (const [clientName, msgs] of Object.entries(grouped)) {
    lines.push(`Client: ${clientName}`)
    for (const m of msgs) {
      const sourceLabel = m.source === 'gmail' ? 'Email' : 'Slack'
      const time = new Date(m.received_at).toLocaleTimeString()
      lines.push(`- ${sourceLabel} from ${m.sender}: ${m.content} (received: ${time})`)
    }
    lines.push('')
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content:
          'You are an AI assistant for a freelancer. Generate a concise, actionable morning briefing organized by client. For each client, highlight what needs attention, any pending responses, and important updates. Be specific and practical. Use a friendly but professional tone.',
      },
      {
        role: 'user',
        content: lines.join('\n'),
      },
    ],
  })

  const briefingContent =
    response.choices[0]?.message?.content ?? 'Unable to generate briefing.'

  await supabase.from('briefings').insert({
    user_id: userId,
    content: briefingContent,
    sent_at: new Date().toISOString(),
  })

  return briefingContent
}
