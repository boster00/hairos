# HairOS — Agent instructions

This repo is **HairOS**: a Next.js 15 app for hair salons (booking, staff, clients, marketing). Product config lives in `config.js` (`appName`, `domainName`).

## Before you code

1. Read this file and `supabase/migrations/20260418000000_hairos_core_schema.sql` (+ newer HairOS migrations) for the data model.
2. Private UI lives under `app/(private)/(shell)/`. Sidebar nav is defined in `app/(private)/(shell)/layout.js`.
3. Salon CRUD uses `libs/salon/index.js` and `app/api/salon/route.js`. Booking uses `libs/booking/index.js` and `app/api/appointments/route.js`.

## Phase 2 — eight deliverables (quest inventory keys)

| # | Deliverable | Route / proof | API / notes |
|---|-------------|---------------|-------------|
| 1 | Clients | `/clients` | `/api/hair/clients` |
| 2 | Social scheduler | `/marketing/social` | `/api/hair/social`, **`POST /api/hair/social-ideas`** (OpenAI; needs `OPENAI_API_KEY` + `AI_MODEL_STANDARD`) |
| 3 | Newsletter + stats | `/marketing/newsletter` | `/api/hair/newsletter` — past sends show **open_rate_pct** / **click_rate_pct** (demo seed + DB columns in migration) |
| 4 | Settings (5 cards) | `/settings` | `/api/hair/integrations` — Vapi, **Google OAuth** (`/api/oauth/google` → `/api/oauth/callback/google`), Buffer stub, Twilio, **Squarespace** stub |
| 5 | Email templates + Resend | `/settings/integrations` | `/api/hairos/email-templates`, **`POST /api/hairos/send-luxe-prospect`** → 5 branded HTML emails to **xsj706@gmail.com** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) |
| 6 | Calendar quick-add | `/calendar` | `POST /api/appointments` — after insert, **`createCalendarEvent`** if `google_oauth_refresh_token` on salon |
| 7 | Google Calendar sync proof | Screenshot: real Google UI | Set **`HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL`** to the event’s `htmlLink` after a real booking, **or** book with OAuth + `HAIR_OS_GOOGLE_REFRESH_TOKEN` in demo. Public helper: **`/hair/google-calendar-proof`** (iframe/embed attempt). Quest screenshot script navigates to that URL directly. |
| 8 | Booking demo (Luxe) | **`/booking/luxe-maya`** | Demo seed in `libs/hairos/demoStore.js` — **Luxe Studio by Maya**, services (Brazilian Blowout, Balayage, Keratin, Haircut & Style), **Maya Johnson** + **Jordan Lee** + avatars, **availability_rules** Mon–Sat 9–6, slot engine in `readAvailableSlots` demo branch |

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
