export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="mb-4 text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="text-gray-300 space-y-6 mt-8">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-white">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you create an account, update your profile, and use our services.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3 text-white">2. How We Use Your Information</h2>
            <p>
              Add your privacy policy content here...
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
