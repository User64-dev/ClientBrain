import { matchMessageToClient, Client } from '../matcher'

const clients: Client[] = [
  {
    id: 'client-1',
    name: 'Acme Corp',
    email_domain: 'acme.com',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'client-2',
    name: 'Globex',
    email_domain: 'globex.net',
    user_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
  },
]

describe('matchMessageToClient', () => {
  it('matches sender with angle brackets to client by domain', () => {
    const result = matchMessageToClient('John <john@acme.com>', clients)
    expect(result).toEqual(clients[0])
  })

  it('matches sender with bare email to client by domain', () => {
    const result = matchMessageToClient('jane@globex.net', clients)
    expect(result).toEqual(clients[1])
  })

  it('returns null when no client matches', () => {
    const result = matchMessageToClient('bob@unknown.org', clients)
    expect(result).toBeNull()
  })

  it('returns null for invalid sender string', () => {
    const result = matchMessageToClient('no-email-here', clients)
    expect(result).toBeNull()
  })

  it('matches case-insensitively on domain', () => {
    const result = matchMessageToClient('Alice <alice@ACME.COM>', clients)
    expect(result).toEqual(clients[0])
  })

  it('returns null for empty clients array', () => {
    const result = matchMessageToClient('test@acme.com', [])
    expect(result).toBeNull()
  })
})
