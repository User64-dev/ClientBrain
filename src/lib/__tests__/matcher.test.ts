import { matchMessageToClient } from '../matcher'

const clients = [
  { id: '1', email_domain: 'acme.com', name: 'Acme Corp' },
  { id: '2', email_domain: 'globex.io', name: 'Globex' },
]

describe('matchMessageToClient', () => {
  it('matches sender email domain to client', () => {
    const result = matchMessageToClient('john@acme.com', clients)
    expect(result).toEqual(clients[0])
  })

  it('matches case-insensitively', () => {
    const result = matchMessageToClient('Jane@ACME.COM', clients)
    expect(result).toEqual(clients[0])
  })

  it('returns null when no client matches', () => {
    const result = matchMessageToClient('bob@unknown.org', clients)
    expect(result).toBeNull()
  })

  it('returns null for sender without @', () => {
    const result = matchMessageToClient('invalid-email', clients)
    expect(result).toBeNull()
  })

  it('returns null for empty sender', () => {
    const result = matchMessageToClient('', clients)
    expect(result).toBeNull()
  })

  it('returns null for empty clients array', () => {
    const result = matchMessageToClient('john@acme.com', [])
    expect(result).toBeNull()
  })

  it('matches the second client correctly', () => {
    const result = matchMessageToClient('alice@globex.io', clients)
    expect(result).toEqual(clients[1])
  })
})
