import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "ClientBrain Waitlist <onboarding@resend.dev>",
      to: "micheleglorioso2012@gmail.com",
      subject: `New Waitlist Signup: ${email}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #111;">🎉 New Waitlist Signup</h2>
          <p style="font-size: 16px; color: #333;">
            Someone just joined the ClientBrain waitlist:
          </p>
          <p style="font-size: 18px; font-weight: 600; color: #4F8EF7;">
            ${email}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 13px; color: #999;">
            This is an automated notification from your ClientBrain landing page.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Failed to process signup. Please try again." },
      { status: 500 }
    );
  }
}
