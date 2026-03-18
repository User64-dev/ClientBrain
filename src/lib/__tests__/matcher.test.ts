import { matchMessageToClient } from '../matcher'

const clients = [
  { id: '1', email_domain: 'acme.com', name: 'Acme Corp' },
  { id: '2', email_domain: 'globex.io', name: 'Globex' },
]

describe('matchMessageToClient', () => {
  it('matches sender email domain to client', () => {
    const result = matchMessageToClient('john@acme.com', '', clients)
    expect(result).toEqual(clients[0])
  })

  it('matches case-insensitively on sender domain', () => {
    const result = matchMessageToClient('Jane@ACME.COM', '', clients)
    expect(result).toEqual(clients[0])
  })

  it('returns null when no client matches sender or content', () => {
    const result = matchMessageToClient('bob@unknown.org', 'nothing relevant here', clients)
    expect(result).toBeNull()
  })

  it('returns null for sender without @', () => {
    const result = matchMessageToClient('invalid-email', '', clients)
    expect(result).toBeNull()
  })

  it('returns null for empty sender', () => {
    const result = matchMessageToClient('', '', clients)
    expect(result).toBeNull()
  })

  it('returns null for empty clients array', () => {
    const result = matchMessageToClient('john@acme.com', '', [])
    expect(result).toBeNull()
  })

  it('matches the second client correctly via sender domain', () => {
    const result = matchMessageToClient('alice@globex.io', '', clients)
    expect(result).toEqual(clients[1])
  })

  describe('content-based fallback', () => {
    it('matches client by name mentioned in content', () => {
      const result = matchMessageToClient('internal@mycompany.com', 'We had a meeting with Acme Corp today', clients)
      expect(result).toEqual(clients[0])
    })

    it('matches client name case-insensitively in content', () => {
      const result = matchMessageToClient('internal@mycompany.com', 'follow up with acme corp about the proposal', clients)
      expect(result).toEqual(clients[0])
    })

    it('matches client by email domain mentioned in content', () => {
      const result = matchMessageToClient('internal@mycompany.com', 'Send the invoice to globex.io', clients)
      expect(result).toEqual(clients[1])
    })

    it('does not match on partial word — "Globextra" should not match "Globex"', () => {
      const result = matchMessageToClient('internal@mycompany.com', 'Working with Globextra today', clients)
      expect(result).toBeNull()
    })

    it('domain match takes priority over content match', () => {
      const result = matchMessageToClient('alice@globex.io', 'Message mentions Acme Corp', clients)
      expect(result).toEqual(clients[1])
    })

    it('returns null if content has no client mention and sender does not match', () => {
      const result = matchMessageToClient('nobody@external.com', 'Hello, we had a great day!', clients)
      expect(result).toBeNull()
    })
  })
})
