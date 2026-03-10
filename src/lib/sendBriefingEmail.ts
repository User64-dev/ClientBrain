import { Resend } from 'resend'
import { storeMessages } from './storeMessages'
import { generateBriefing } from './generateBriefing'

function formatBriefingHtml(briefingContent: string): string {
  const escaped = briefingContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const formatted = escaped
    .replace(/^### (.+)$/gm, '<h3 style="color:#60a5fa;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#93c5fd;margin:20px 0 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#bfdbfe;margin:24px 0 12px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')

  return formatted
}

export async function sendBriefingEmail(
  userId: string,
  userEmail: string
): Promise<{ success: true } | { error: string }> {
  try {
    await storeMessages(userId)
    const briefingContent = await generateBriefing(userId)

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: `Your ClientBrain Morning Briefing — ${today}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #334155;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#f8fafc;letter-spacing:-0.5px;">
                ClientBrain
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">
                ${today}
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;color:#e2e8f0;font-size:15px;line-height:1.7;">
              ${formatBriefingHtml(briefingContent)}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;font-size:13px;color:#64748b;">
                ClientBrain &mdash;
                <a href="#" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })

    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send briefing email' }
  }
}
