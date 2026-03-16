import Link from 'next/link'

export default function Navbar() {
  return (
    <nav
      className="anim-navbar fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                 px-6 md:px-12 py-4 border-b border-white/[0.06]
                 bg-[#0a0a0a]/75 backdrop-blur-xl"
    >
      <Link
        href="/"
        className="text-white font-semibold text-xl tracking-tight select-none"
      >
        Client<span className="text-[#4F8EF7]">Brain</span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <a
          href="#features"
          className="text-white/55 hover:text-white text-sm font-medium transition-colors duration-200"
        >
          Features
        </a>
        <a
          href="#how-it-works"
          className="text-white/55 hover:text-white text-sm font-medium transition-colors duration-200"
        >
          How it works
        </a>
        <a
          href="#pricing"
          className="text-white/55 hover:text-white text-sm font-medium transition-colors duration-200"
        >
          Pricing
        </a>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-200"
        >
          Sign In
        </Link>
        <a
          href="#waitlist"
          className="px-4 py-2 rounded-lg bg-[#4F8EF7] text-white text-sm font-medium
                     hover:bg-[#6ba3ff] active:scale-95 transition-all duration-200"
        >
          Join Waitlist
        </a>
      </div>
    </nav>
  )
}
