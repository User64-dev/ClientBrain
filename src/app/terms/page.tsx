import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'Terms of Service — ClientBrain',
  description: 'ClientBrain terms of service.',
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: March 2025</p>

        <div className="space-y-8 text-white/65 leading-relaxed">
          <section>
            <h2 className="text-white text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ClientBrain, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">2. Description of Service</h2>
            <p>
              ClientBrain is an AI-powered client intelligence tool that connects to your Gmail and
              Slack accounts to generate daily briefings organized by client. The service is
              provided on a subscription basis.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">3. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activity that occurs under your account. You agree to notify us
              immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p>
              You agree not to use the service for any unlawful purpose or in any way that could
              damage, disable, or impair the service. You may not attempt to gain unauthorized
              access to any part of the service or its related systems.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">5. Cancellation and Refunds</h2>
            <p>
              You may cancel your subscription at any time. Cancellations take effect at the end
              of the current billing period. We do not provide refunds for partial billing periods.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">6. Limitation of Liability</h2>
            <p>
              ClientBrain is provided &quot;as is&quot; without warranties of any kind. We are not liable
              for any indirect, incidental, or consequential damages arising from your use of the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-semibold mb-3">7. Contact</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{' '}
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
