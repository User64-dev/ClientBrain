/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/detectClients', () => ({
  detectClients: jest.fn(),
}))

import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { detectClients } from '@/lib/detectClients'

const mockCreateClient = createClient as jest.Mock
const mockDetectClients = detectClients as jest.Mock

function createMockSupabase(user: { id: string; email: string } | null) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

describe('POST /api/clients/detect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(createMockSupabase(null))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(mockDetectClients).not.toHaveBeenCalled()
  })

  it('returns suggestions array when new domains are found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ id: 'user-1', email: 'me@myco.com' })
    )
    mockDetectClients.mockResolvedValue([
      { name: 'Acme Corp', email_domain: 'acme.com' },
      { name: 'Globex Inc', email_domain: 'globex.com' },
    ])

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      suggestions: [
        { name: 'Acme Corp', email_domain: 'acme.com' },
        { name: 'Globex Inc', email_domain: 'globex.com' },
      ],
    })
    expect(mockDetectClients).toHaveBeenCalledWith('user-1')
  })

  it('returns empty suggestions array when no new domains found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ id: 'user-1', email: 'me@myco.com' })
    )
    mockDetectClients.mockResolvedValue([])

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ suggestions: [] })
  })

  it('returns empty suggestions array when detectClients throws', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({ id: 'user-1', email: 'me@myco.com' })
    )
    mockDetectClients.mockRejectedValue(new Error('OpenAI unreachable'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ suggestions: [] })
  })
})
