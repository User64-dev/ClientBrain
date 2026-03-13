# GitHub Copilot Instructions

This document provides guidelines and context for GitHub Copilot to assist with developing this Next.js application.

## 1. Tech Stack Overview

- **Core:** Node.js, TypeScript, Next.js 16.1.6 (App Router), React 19.2.3
- **Styling:** Tailwind CSS 4, custom UI components
- **Authentication & Database:** Supabase Auth (Email/Password + OAuth), Supabase PostgreSQL
- **Testing:** Jest, React Testing Library, Playwright, MSW
- **External APIs:** OpenAI (gpt-4o-mini), Gmail API, Slack API, Resend

## 2. Project Structure

- `src/app/api/`: Next.js App Router API endpoints.
- `src/app/`: Frontend pages and layouts (e.g., `dashboard/`, `login/`, `signup/`).
- `src/components/`: Reusable React components.
- `src/lib/`: Core business logic and external API integrations (OpenAI, Gmail, Slack, Resend).
- `src/utils/supabase/`: Supabase client utilities for browser (`client.ts`) and server (`server.ts`, `admin.ts`).
- `__tests__/` & `e2e/`: Unit, integration, and end-to-end tests.

## 3. Coding Conventions

- **TypeScript:** Use strict mode. Type all function parameters and returns. Use interfaces for object shapes.
- **Imports:** Use the `@/*` path alias mapping to `./src/*`.
- **Async/Await:** Prefer `async/await` over `.then()`. Implement proper `try/catch` blocks for error handling.
- **React Components:** Default to Server Components. Use `'use client'` explicitly for components needing state or browser APIs.
- **State Management:** Use standard React hooks (`useState`, `useEffect`) and Next.js hooks (`useRouter`, `useSearchParams`).
- **Styling:** Use Tailwind CSS utility classes. The app uses a dark theme layout.

## 4. API & Database Patterns

- **Route Handlers:** Implement functionality in `route.ts` using named exports (`GET`, `POST`, etc.).
- **Response Format:** Return consistent JSON structures via `NextResponse.json()` and appropriate HTTP status codes (e.g., 401 for unauthorized).
- **Supabase Actions:** 
  - Server-side: Use `createClient()` from `@/utils/supabase/server`.
  - Client-side: Use `createClient()` from `@/utils/supabase/client`.
- **Authentication:** Verify `supabase.auth.getUser()` in API routes before processing requests. Use Supabase RLS policies.

## 5. Testing Guidelines

- **Unit/Integration:** Colocate test files in `__tests__/` directories or use `.spec.ts(x)` suffixes.
- **Mocking:** Heavily mock external dependencies (Supabase, OpenAI, Resend) using Jest.
- **Component Tests:** Use React Testing Library with `@testing-library/user-event` to simulate user interactions.
- **E2E Tests:** Use Playwright (`e2e/*.spec.ts`).

## 6. External Integrations

- **Gmail & Slack:** Handle OAuth flows effectively, managing tokens (and refresh tokens) in the database.
- **OpenAI:** Uses `gpt-4o-mini` to aggregate and generate client briefings.
- **Resend:** Used for delivering generated briefings to users.

When generating code, please adhere to these architectural patterns, respect the separation of concerns between server/client components, and ensure TypeScript strictness and adequate test coverage.