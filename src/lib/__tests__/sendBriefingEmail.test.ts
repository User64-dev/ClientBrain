/**
 * @jest-environment node
 */

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}))

jest.mock('../storeMessages', () => ({
  storeMessages: jest.fn(),
}))

jest.mock('../generateBriefing', () => ({
  generateBriefing: jest.fn(),
}))

import { sendBriefingEmail } from '../sendBriefingEmail'
import { Resend } from 'resend'
import { storeMessages } from '../storeMessages'
import { generateBriefing } from '../generateBriefing'

const mockStoreMessages = storeMessages as jest.Mock
const mockGenerateBriefing = generateBriefing as jest.Mock

function getMockResendSend() {
  const instance = (Resend as jest.MockedClass<typeof Resend>).mock.results[0]
    ?.value
  return instance?.emails?.send as jest.Mock
}

describe('sendBriefingEmail', () => {
  const userId = 'user-1'
  const userEmail = 'test@example.com'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(Resend as jest.MockedClass<typeof Resend>).mockImplementation(
      () =>
        ({
          emails: {
            send: jest.fn().mockResolvedValue({ id: 'email-123' }),
          },
        }) as any
    )
  })

  it('stores messages, generates briefing, and sends email', async () => {
    mockStoreMessages.mockResolvedValue({ gmailCount: 2, slackCount: 1 })
    mockGenerateBriefing.mockResolvedValue('Your daily briefing content')

    const result = await sendBriefingEmail(userId, userEmail)

    expect(result).toEqual({ success: true })
    expect(mockStoreMessages).toHaveBeenCalledWith(userId)
    expect(mockGenerateBriefing).toHaveBeenCalledWith(userId)

    const mockSend = getMockResendSend()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'onboarding@resend.dev',
        to: userEmail,
        subject: expect.stringContaining('Your ClientBrain Morning Briefing'),
        html: expect.stringContaining('ClientBrain'),
      })
    )
  })

  it('includes briefing content in email HTML', async () => {
    mockStoreMessages.mockResolvedValue({ gmailCount: 1, slackCount: 0 })
    mockGenerateBriefing.mockResolvedValue('## Acme Corp\nNeed to follow up')

    await sendBriefingEmail(userId, userEmail)

    const mockSend = getMockResendSend()
    const html = mockSend.mock.calls[0][0].html
    expect(html).toContain('Acme Corp')
    expect(html).toContain('Need to follow up')
  })

  it('returns error when storeMessages fails', async () => {
    mockStoreMessages.mockRejectedValue(new Error('Gmail API down'))

    const result = await sendBriefingEmail(userId, userEmail)

    expect(result).toEqual({ error: 'Gmail API down' })
  })

  it('returns error when generateBriefing fails', async () => {
    mockStoreMessages.mockResolvedValue({ gmailCount: 0, slackCount: 0 })
    mockGenerateBriefing.mockRejectedValue(new Error('OpenAI API error'))

    const result = await sendBriefingEmail(userId, userEmail)

    expect(result).toEqual({ error: 'OpenAI API error' })
  })

  it('returns error when Resend send fails', async () => {
    mockStoreMessages.mockResolvedValue({ gmailCount: 1, slackCount: 0 })
    mockGenerateBriefing.mockResolvedValue('Briefing content')
    ;(Resend as jest.MockedClass<typeof Resend>).mockImplementation(
      () =>
        ({
          emails: {
            send: jest.fn().mockRejectedValue(new Error('Resend rate limit')),
          },
        }) as any
    )

    const result = await sendBriefingEmail(userId, userEmail)

    expect(result).toEqual({ error: 'Resend rate limit' })
  })

  it('escapes HTML in briefing content', async () => {
    mockStoreMessages.mockResolvedValue({ gmailCount: 1, slackCount: 0 })
    mockGenerateBriefing.mockResolvedValue('Content with <script>alert("xss")</script>')

    await sendBriefingEmail(userId, userEmail)

    const mockSend = getMockResendSend()
    const html = mockSend.mock.calls[0][0].html
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
