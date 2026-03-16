import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Privacy Policy — ClientBrain',
  description: 'ClientBrain privacy policy.',
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: March 2025</p>

        <div className="space-y-8 text-white/65 leading-relaxed">
          <section>
            <h2 className="text-white text-xl font-semibold mb-3">1. Introduction</h2>
            <p>
              ClientBrain (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal
              information. This Privacy Policy explains how we collect, use, and safeguard your data
              when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as your email address when you
              sign up. When you connect your Gmail or Slack accounts, we access only the messages
              necessary to generate your daily briefing. We do not store the full content of your
              messages beyond what is needed to produce summaries.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p>
              We use your information solely to provide the ClientBrain service — generating
              AI-powered briefings organized by client. We do not sell, rent, or share your data
              with third parties for advertising or marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">4. Data Security</h2>
            <p>
              We take reasonable measures to protect your information from unauthorized access,
              alteration, disclosure, or destruction. All data is encrypted in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">5. Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a
                href="mailto:hello@clientbrain.io"
                className="text-[#4F8EF7] hover:underline"
              >
                hello@clientbrain.io
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16">
          <Link
            href="/"
            className="text-[#4F8EF7] hover:text-[#6ba3ff] text-sm font-medium transition-colors duration-200"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
