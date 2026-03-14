# GitHub Copilot Instructions — ClientBrain

## Project Overview

**ClientBrain** is an AI-powered client intelligence tool. It connects a user's Gmail and Slack accounts, ingests messages, matches them to clients by email domain, and sends a daily AI-generated briefing organized by client. Built on Next.js App Router with Supabase as the backend and OpenAI for briefing generation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS v4 |
| Database & Auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| AI | OpenAI SDK (`openai`) |
| Email | Resend |
| Analytics | Vercel Analytics |
| Testing (unit/integration) | Jest 29, Testing Library, MSW v2 |
| Testing (e2e) | Playwright |
| Deployment | Vercel |

---

## Project Structure

```
src/
  app/                  # Next.js App Router pages and API routes
    api/
      auth/gmail/       # Gmail OAuth (initiation + callback)
      auth/slack/       # Slack OAuth (initiation + callback)
      briefing/generate # Generate AI briefing via OpenAI
      briefing/latest   # Fetch latest stored briefing
      briefing/send     # Send briefing email via Resend
      clients/          # Client CRUD
      fetch/messages/   # Fetch & store Gmail/Slack messages
      waitlist/         # Waitlist signup
    dashboard/          # Protected dashboard (Server + Client components)
    login/              # Auth pages
    signup/
  components/           # Shared React components
  lib/                  # Core business logic
    generateBriefing.ts # OpenAI briefing generation
    sendBriefingEmail.ts# Resend email dispatch
    storeMessages.ts    # Gmail/Slack message ingestion
    matcher.ts          # Email domain → client matching
    gmail.ts            # Gmail API helpers
    slack.ts            # Slack API helpers
  utils/
    supabase/
      client.ts         # Browser Supabase client
      server.ts         # Server-side Supabase client (cookies)
  lib/supabase/
    admin.ts            # Admin Supabase client (service role)
middleware.ts           # Auth guard for /dashboard/**
```

---

## Architecture & Patterns

### Server vs Client Components
- Default to **Server Components** in the App Router.
- Add `'use client'` only for components that use hooks, browser APIs, or event handlers.
- Never import server-only modules (e.g., `next/headers`, `cookies()`) into Client Components.

### Supabase Client Usage
- **Server Components / API Routes / Server Actions** → `import { createClient } from '@/utils/supabase/server'`
- **Client Components** → `import { createClient } from '@/utils/supabase/client'`
- **Admin operations** (service role, bypasses RLS) → `import { createAdminClient } from '@/lib/supabase/admin'` — use sparingly, never expose to the client.

### API Routes
- All API routes live under `src/app/api/` as `route.ts` files.
- Always authenticate with `supabase.auth.getUser()` before doing anything.
- Return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` for unauthenticated requests.
- Return typed error responses: `{ error: string }` on failure, structured data on success.
- Never leak internal error messages to the client; log with `console.error` and return a generic message.

### Auth & Middleware
- Middleware in `middleware.ts` protects `/dashboard/**` — unauthenticated users are redirected to `/login`.
- OAuth flows for Gmail and Slack follow the pattern: `GET /api/auth/{provider}` → redirect to provider → `GET /api/auth/{provider}/callback` → store token → redirect to dashboard.

### Client Matching
- Messages are matched to clients via `matchMessageToClient()` in `src/lib/matcher.ts`.
- Matching is based on the sender's email domain versus `client.email_domain` stored in Supabase.

### Path Aliases
- Use `@/*` for all imports from `src/`. Example: `import { createClient } from '@/utils/supabase/server'`
- Never use relative paths that traverse more than one level up.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
SUPABASE_SERVICE_ROLE_KEY       # Admin client only — server-side, never exposed
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
NEXT_PUBLIC_APP_URL
OPENAI_API_KEY
RESEND_API_KEY
```

---

## Coding Conventions

- **TypeScript strict mode is on.** No implicit `any`. Explicitly type function parameters and return values.
- Use `interface` for object shapes, `type` for unions and aliases.
- Prefer `async/await` over `.then()` chains.
- Handle errors with `try/catch` in API routes; let errors bubble naturally in lib functions that the caller will catch.
- Use `instanceof Error` checks before accessing `.message` on caught values.
- Prefer `const` over `let`; avoid `var`.
- Co-locate `__tests__/` directories next to the code they test.

---

## Testing

### Unit & Integration (Jest + Testing Library)
- Test files live in `__tests__/` directories adjacent to the source file.
- API route test files use `/** @jest-environment node */` at the top.
- Mock Supabase clients with `jest.mock('@/utils/supabase/server', ...)`.
- Mock OpenAI with `jest.mock('openai', ...)`.
- Use MSW (`msw`) for mocking HTTP requests in integration tests.

### E2E (Playwright)
- E2E specs live in `e2e/`.
- Config is in `playwright.config.ts`.
- Run with `npm run test:e2e`.

### Commands
```bash
npm test                # Run all Jest tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Jest with coverage
npm run test:e2e        # Playwright e2e tests
```

---

## Agent Personalities

### Default — Senior Full-Stack Engineer
When writing code for this project:
- Favour correctness and security over cleverness.
- Match the existing patterns (App Router, Supabase SSR, typed responses).
- Do not add unnecessary abstractions or helpers that are only used once.
- Do not add docstrings or comments to code that is already self-explanatory.
- Do not add error handling for impossible scenarios.

### API Agent
When working on API routes (`src/app/api/**`):
- Always authenticate first.
- Keep handlers thin — delegate business logic to `src/lib/`.
- Return consistent JSON shapes: `{ success: true, ...data }` or `{ error: string }`.
- Never expose stack traces or internal error details in responses.

### Database Agent
When working with Supabase queries:
- Use the correct client for the context (server, browser, or admin).
- Respect Row-Level Security — use the admin client only when explicitly bypassing RLS is required.
- Destructure `{ data, error }` from every query and handle the error before using data.
- Prefer explicit `.select()` columns over `select('*')`.

### Frontend Agent
When writing React components:
- Default to Server Components; only add `'use client'` when necessary.
- Keep interactivity in leaf components, not in layout wrappers.
- Use Tailwind utility classes — do not write custom CSS unless Tailwind cannot cover the case.
- Match the dark theme palette already established (`slate-900`, `slate-800`, `blue-400`, etc.).

### Testing Agent
When writing tests:
- Mirror the structure of the code under test.
- Mock all external dependencies (Supabase, OpenAI, Resend, HTTP).
- Test behaviour, not implementation details.
- For React components, prefer `getByRole` and `getByText` over test IDs.
- Each test should be independent — no shared mutable state between tests.
- Use Playwright for critical user flows (login, dashboard access, briefing generation) to catch integration issues.

### Security Agent
When reviewing or writing any code:
- Validate authentication on every server-side handler.
- Never trust client-supplied user IDs — always derive the user from `supabase.auth.getUser()`.
- Sanitise any user content before including it in email HTML (escape `&`, `<`, `>`).
- Do not log sensitive data (tokens, emails) beyond what is necessary for debugging.
- Secrets stay server-side; only `NEXT_PUBLIC_*` variables are safe to expose to the browser.
