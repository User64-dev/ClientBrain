export function matchMessageToClient(
  sender: string,
  clients: any[]
): any | null {
  if (!sender || !sender.includes('@')) return null

  const domain = sender.split('@').pop()!.toLowerCase()

  return (
    clients.find(
      (client) => client.email_domain?.toLowerCase() === domain
    ) ?? null
  )
}
