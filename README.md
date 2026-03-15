# ClientBrain

**ClientBrain** is an AI-powered client intelligence tool. It connects your Gmail and Slack accounts, ingests messages, matches them to clients by email domain, and sends a daily AI-generated briefing organized by client.

Built on Next.js 16 (App Router) with Supabase as the backend and OpenAI for AI briefing generation.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 (Strict Mode)
- **UI**: React 19, Tailwind CSS v4
- **Database & Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI**: OpenAI API
- **Email Delivery**: Resend
- **Analytics**: Vercel Analytics
- **Testing**: Jest 29, Testing Library, MSW v2, Playwright

## 🛠️ Setup & Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/clientbrain.git
   cd clientbrain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 🧪 Testing

The project uses Jest for unit/integration testing and Playwright for E2E testing.

```bash
# Run all Jest tests
npm test

# Run Jest in watch mode
npm run test:watch

# Run Jest with coverage
npm run test:coverage

# Run Playwright E2E tests
npm run test:e2e
```

## 🏗️ Project Structure

- `src/app` – Next.js App Router pages and API routes
- `src/components` – Shared React UI components
- `src/lib` – Core business logic (OpenAI briefing, message ingestion, domain matching)
- `src/utils/supabase` – Client, server, and admin Supabase instances
- `__tests__` – Unit and integration test files
- `e2e` – Playwright end-to-end spec files

