export function matchMessageToClient(
  sender: string,
  content: string,
  clients: any[]
): any | null {
  const domainMatch =
    sender && sender.includes('@')
      ? clients.find(
          (client) =>
            client.email_domain?.toLowerCase() ===
            sender.split('@').pop()!.toLowerCase()
        ) ?? null
      : null

  if (domainMatch) return domainMatch

  const lowerContent = content.toLowerCase()
  return (
    clients.find((client) => {
      const name: string = client.name ?? ''
      const emailDomain: string = client.email_domain ?? ''
      if (name.length >= 3) {
        const namePattern = new RegExp(
          `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          'i'
        )
        if (namePattern.test(content)) return true
      }
      if (emailDomain.length >= 3 && lowerContent.includes(emailDomain.toLowerCase())) {
        return true
      }
      return false
    }) ?? null
  )
}
