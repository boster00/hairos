# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CJGEO is a Next.js 15 app for SEO content creation. External deps: hosted DB/auth, Stripe, OpenAI, and other AI/SEO APIs. No Docker or local DB required.

### Quick reference

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` (Turbopack, port 3000) |
| Lint | `npm run lint` |
| Test | `npx vitest run` |
| Build | `npm run build` |

See `package.json` for all scripts. See `.env.example` for available environment variables.

### Dev environment notes

- **Auth bypass**: Set `CJGEO_DEV_FAKE_AUTH=1` and `NEXT_PUBLIC_CJGEO_DEV_FAKE_AUTH=1` in `.env.local` to bypass DB/auth on private routes. Without real DB credentials, API routes that call the auth service will still return auth errors, but all pages render.
- **Mock data modes**: `TOPIC_RESEARCH_MOCK=1` and `CONTENT_MAGIC_TEMPLATE_MOCK=1` enable mock responses without external API keys.
- **DB/auth placeholders**: The middleware and auth client require the `NEXT_PUBLIC_*_URL` and `NEXT_PUBLIC_*_ANON_KEY` env vars (see `.env.example`) to be set (even as placeholders) or the app will crash on startup.
- **Stripe placeholders**: `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` must be set (even as placeholders) or Stripe-dependent pages/routes may error.
- **AI model env vars**: `AI_MODEL_ADVANCED`, `AI_MODEL_STANDARD`, `AI_MODEL_LARGE_CONTEXT` must be set in `.env.local`.
- **Lint deprecation**: `npm run lint` uses `next lint` which is deprecated in Next.js 16+. It works but emits a deprecation warning. There is one known regex warning in `app/(private)/(fullscreen)/content-magic/[articleId]/preview/page.js` that is pre-existing.
- **Archived tests**: Tests under `_archive/tests/` reference removed API routes and are expected to fail. The active test suite (non-archive) passes.
- **Turbopack root**: `next.config.mjs` sets `turbopack.root = __dirname` to ensure `.env.local` is loaded from the repo root.
- **Node.js 22**: The project requires Node.js 22.x (already available in the VM).
