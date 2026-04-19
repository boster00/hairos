# HairOS — Agent instructions

This repo is **HairOS**: a Next.js 15 app for hair salons (booking, staff, clients, marketing). Product config lives in `config.js` (`appName`, `domainName`).

## Before you code

1. Read this file and `supabase/migrations/20260418000000_hairos_core_schema.sql` for the data model (`salons`, `clients`, `social_posts`, `newsletter_campaigns`, `appointments`, etc.).
2. Private UI lives under `app/(private)/(shell)/`. Sidebar nav is defined in `app/(private)/(shell)/layout.js`.
3. Salon CRUD uses `libs/salon/index.js` and `app/api/salon/route.js`. Booking uses `libs/booking/index.js` and `app/api/appointments/route.js`.

## Phase 2 surface area

| Feature | Route | API |
|--------|-------|-----|
| Clients | `/clients` | `/api/hair/clients` |
| Social scheduler | `/marketing/social` | `/api/hair/social` |
| Newsletter | `/marketing/newsletter` | `/api/hair/newsletter` |
| Integrations (4 cards) | `/settings` | `/api/hair/integrations` |
| Email HTML templates | `/settings/integrations` | `/api/hairos/email-templates` |
| Calendar quick-add | `/calendar` | `POST /api/appointments` (`write_appointment`) |

## Local dev (port 3004)

```bash
npm install
npm run dev:hairos
```

Uses **Turbopack** on port **3004**.

## Demo mode (UI screenshots without Supabase data)

Set in `.env.local`:

```env
CJGEO_DEV_FAKE_AUTH=1
NEXT_PUBLIC_CJGEO_DEV_FAKE_AUTH=1
HAIR_OS_UI_DEMO=1
```

Placeholder `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are still required for the app to boot (see `.env.example`).

## Mobile-first (critical)

HairOS users are stylists and barbers on **phones first**. All HairOS Phase 2 UI must be **mobile-first**.

- Default to **single-column stacked** layouts; add multi-column only from **`sm:`** or **`md:`** up.
- **No horizontal tables on small screens** — tables appear from **`sm:`** only; below that use **card/list** rows with large tap targets.
- **Large tap targets**: primary actions use **`btn-lg`**; use comfortable vertical spacing (`gap-3`, `py-3`, `min-h-12` on inputs where needed).
- **Quest / QA screenshots** for HairOS features must use a **390×844** viewport (iPhone 14 class). Resize the browser to **390px width** before calling any feature done.

## Conventions

- Server components / routes: `const supabase = await createClient();`
- Use DaisyUI v5 + Tailwind v4 patterns already used in `(shell)` pages.
- Hair-specific APIs live under `app/api/hair/*` and `app/api/hairos/*`.
