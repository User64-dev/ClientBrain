import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateBriefing(userId: string): Promise<string> {
  const supabase = await createClient()

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('content, sender, received_at, source, clients(name)')
    .eq('user_id', userId)
    .gte('received_at', twentyFourHoursAgo)
    .order('received_at', { ascending: true })

  if (messagesError) {
    throw new Error(`Failed to fetch messages: ${messagesError.message}`)
  }

  if (!messages || messages.length === 0) {
    const noMessagesBriefing = 'No new messages in the last 24 hours. Enjoy the quiet!'

    await supabase.from('briefings').insert({
      user_id: userId,
      content: noMessagesBriefing,
      sent_at: new Date().toISOString(),
    })

    return noMessagesBriefing
  }

  const grouped: Record<string, { sender: string; content: string; source: string; received_at: string }[]> = {}

  for (const msg of messages) {
    const clientName = (msg.clients as unknown as { name: string })?.name || 'Unknown Client'
    if (!grouped[clientName]) {
      grouped[clientName] = []
    }
    grouped[clientName].push({
      sender: msg.sender,
      content: msg.content,
      source: msg.source,
      received_at: msg.received_at,
    })
  }

  let messagesSummary = ''
  for (const [clientName, msgs] of Object.entries(grouped)) {
    messagesSummary += `\n## ${clientName}\n`
    for (const m of msgs) {
      messagesSummary += `- [${m.source}] From ${m.sender} at ${m.received_at}: ${m.content}\n`
    }
  }

  const prompt = `You are an AI assistant for a freelancer. Here are their messages from the last 24 hours, grouped by client. Generate a concise morning briefing that tells them exactly what needs their attention today. Be specific, actionable, and organized by client. Format it clearly with each client as a section.\n\n${messagesSummary}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  })

  const briefingContent = response.choices[0]?.message?.content || 'Unable to generate briefing.'

  await supabase.from('briefings').insert({
    user_id: userId,
    content: briefingContent,
    sent_at: new Date().toISOString(),
  })

  return briefingContent
}
