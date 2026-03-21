import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const PERSONAL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
])

function extractDomain(sender: string): string | null {
  // Handle "Display Name <email@domain.com>" format
  const angleMatch = sender.match(/<([^>]+)>/)
  const email = angleMatch ? angleMatch[1] : sender.trim()
  const atIndex = email.lastIndexOf('@')
  if (atIndex === -1) return null
  const domain = email.slice(atIndex + 1).toLowerCase().trim()
  return domain.length > 0 ? domain : null
}

export async function detectClients(
  userId: string
): Promise<Array<{ name: string; email_domain: string }>> {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: messages },
    { data: clients },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('messages')
      .select('sender')
      .eq('user_id', userId),
    supabase
      .from('clients')
      .select('email_domain')
      .eq('user_id', userId),
  ])

  const userDomain = user?.email ? extractDomain(user.email) : null
  const registeredDomains = new Set(
    (clients ?? []).map((c: { email_domain: string }) => c.email_domain.toLowerCase())
  )

  const newDomains = new Set<string>()
  for (const msg of messages ?? []) {
    const domain = extractDomain(msg.sender)
    if (!domain) continue
    if (PERSONAL_DOMAINS.has(domain)) continue
    if (userDomain && domain === userDomain) continue
    if (registeredDomains.has(domain)) continue
    newDomains.add(domain)
  }

  if (newDomains.size === 0) return []

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const results = await Promise.allSettled(
    Array.from(newDomains).map(async (domain) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: `Given the email domain '${domain}', suggest a short professional company name. Reply with just the name, nothing else.`,
          },
        ],
      })
      const name = response.choices[0]?.message?.content?.trim() ?? domain
      return { name, email_domain: domain }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<{ name: string; email_domain: string }> => r.status === 'fulfilled')
    .map((r) => r.value)
}
