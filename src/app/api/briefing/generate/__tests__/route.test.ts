/**
 * @jest-environment node
 */

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/generateBriefing', () => ({
  generateBriefing: jest.fn(),
}))

import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { generateBriefing } from '@/lib/generateBriefing'

const mockCreateClient = createClient as jest.Mock
const mockGenerateBriefing = generateBriefing as jest.Mock

describe('POST /api/briefing/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns success with briefing content', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })

    mockGenerateBriefing.mockResolvedValue('Your morning briefing content')

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, briefing: 'Your morning briefing content' })
    expect(mockGenerateBriefing).toHaveBeenCalledWith('user-1')
  })

  it('returns 500 when generateBriefing throws', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })

    mockGenerateBriefing.mockRejectedValue(new Error('OpenAI API error'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'OpenAI API error' })
  })
})
