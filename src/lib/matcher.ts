export interface Client {
  id: string
  name: string
  email_domain: string
  user_id: string
  created_at: string
}

export function matchMessageToClient(
  sender: string,
  clients: Client[]
): Client | null {
  // Extract email from sender string like "Name <email@domain.com>" or "email@domain.com"
  const emailMatch = sender.match(/<([^>]+)>/) || sender.match(/[\w.+-]+@[\w.-]+/)
  if (!emailMatch) return null

  const email = emailMatch[1] || emailMatch[0]
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  return clients.find((c) => c.email_domain.toLowerCase() === domain) || null
}
