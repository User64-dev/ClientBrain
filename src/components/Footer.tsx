import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10 px-6 md:px-12">
      <div
        className="max-w-6xl mx-auto flex flex-col md:flex-row
                   items-center justify-between gap-6 text-sm"
      >
        <Link
          href="/"
          className="text-white font-medium hover:text-white/80 transition-colors duration-200"
        >
          Client<span className="text-[#4F8EF7]">Brain</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-white/40 hover:text-white/70 text-xs transition-colors duration-200"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-white/40 hover:text-white/70 text-xs transition-colors duration-200"
          >
            Terms of Service
          </Link>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1">
          <span className="text-white/22 text-xs">Built by Michele Glorioso</span>
          <span className="text-white/22 text-xs">© 2025 ClientBrain</span>
        </div>
      </div>
    </footer>
  )
}
