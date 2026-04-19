# HairOS — Agent instructions

This repo is **HairOS**: a Next.js 15 app for hair salons (booking, staff, clients, marketing). Product config lives in `config.js` (`appName`, `domainName`).

## Before you code

1. Read this file and `supabase/migrations/20260418000000_hairos_core_schema.sql` (+ newer HairOS migrations) for the data model.
2. Private UI lives under `app/(private)/(shell)/`. Sidebar nav is defined in `app/(private)/(shell)/layout.js`.
3. Salon CRUD uses `libs/salon/index.js` and `app/api/salon/route.js`. Booking uses `libs/booking/index.js` and `app/api/appointments/route.js`.

## Phase 2 — core screenshots (quest `evidence` items)

| # | Deliverable | Route | Notes |
|---|-------------|-------|--------|
| 1 | Clients | `/clients` | `/api/hair/clients` |
| 2 | Social scheduler | `/marketing/social` | Composer: caption + **image URL** + **Instagram / Facebook / TikTok** checkboxes + schedule; queue below. **`POST /api/hair/social-ideas`** (optional). |
| 3 | Newsletter | `/marketing/newsletter` | Stats on past sends (`open_rate_pct` / `click_rate_pct`). |
| 4 | Settings | `/settings` | **Four** cards: Vapi, Google **Coming soon**, Buffer **Connect** stub, Twilio — **stubs only** on this page (no live OAuth UI). |
| 5 | Email templates | `/settings/integrations` | Templates + **`POST /api/hairos/send-luxe-prospect`** (Resend). |
| 6 | Calendar quick-add | `/calendar` | Quick-add modal. |

**Also in repo (not always in quest evidence):** Google OAuth routes (`/api/oauth/google`), booking **`/booking/luxe-maya`**, calendar API sync in `libs/booking` when tokens exist. **Pitch deck:** `npm run hairos:pitch-deck` → upload `hairos-pitch-deck.pptx`; inventory key **`pitch_deck`**.

## Local dev (port 3004)

```bash
npm install
npm run dev:hairos
```

## Environment (HairOS Phase 2)

```env
# Core demo (no real Supabase rows for Hair pages)
CJGEO_DEV_FAKE_AUTH=1
NEXT_PUBLIC_CJGEO_DEV_FAKE_AUTH=1
HAIR_OS_UI_DEMO=1

# Social AI ideas
OPENAI_API_KEY=
AI_MODEL_STANDARD=   # required when OPENAI_API_KEY set

# Resend — prospect email pack (5 sends)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Google Calendar OAuth + sync
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Optional: inject refresh token for demo without OAuth UI round-trip
HAIR_OS_GOOGLE_REFRESH_TOKEN=

# Optional: direct link for google-calendar-sync.png when Google blocks iframes
HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL=
```

Placeholder `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are still required for the app to boot (see `.env.example`).

## Mobile-first (critical)

- Default **single-column**; tables / grids from **`sm:`** up.
- **390×844** for all HairOS quest screenshots (`scripts/hair-os-phase2-screenshots.mjs`).

## Conventions

- Server routes: `const supabase = await createClient();`
- DaisyUI v5 + Tailwind v4.
- Hair APIs: `app/api/hair/*`, `app/api/hairos/*`, `app/api/oauth/*`.
