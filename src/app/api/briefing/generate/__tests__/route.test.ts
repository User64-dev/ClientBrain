/**
 * @jest-environment node
 */

import { POST } from '../route'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/generateBriefing', () => ({
  generateBriefing: jest.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { generateBriefing } from '@/lib/generateBriefing'

const mockCreateClient = createClient as jest.Mock
const mockGenerateBriefing = generateBriefing as jest.Mock

describe('POST /api/briefing/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return briefing on success', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })
    mockGenerateBriefing.mockResolvedValue('Your morning briefing content')

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.briefing).toBe('Your morning briefing content')
    expect(mockGenerateBriefing).toHaveBeenCalledWith('user-1')
  })

  it('should return 500 when briefing generation fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    })
    mockGenerateBriefing.mockRejectedValue(new Error('OpenAI API error'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('OpenAI API error')
  })
})
