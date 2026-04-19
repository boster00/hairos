# HairOS — Agent Guide

## What this is

HairOS is a SaaS platform for hair salons. Multi-tenant: each salon is one Supabase account. Stack: Next.js 15 + Turbopack, Supabase (auth + Postgres), Tailwind 4, DaisyUI 5, Stripe, Resend, Twilio, Vapi.ai.

## Dev setup

```bash
npm run dev   # port 3004 (or whatever PORT env is set to)
```

Auth bypass for local dev: `CJGEO_DEV_FAKE_AUTH=1` in `.env.local` skips Supabase auth — the shell layout uses a fake user ID `00000000-0000-0000-0000-000000000001`.

**Note:** With fake auth, API routes that call `supabase.auth.getUser()` return no user. Use the service role client in API routes for testing, or seed a real salon row in the DB for the fake user ID.

## Database

Supabase project: `wjsgcftsarbqreiwwedv.supabase.co`

Key tables (all RLS-enabled, owner = salon.owner_id):
- `salons` — one per account, has `slug` for public booking URL
- `staff` — multiple per salon, linked to services via `staff_services`
- `services` — duration_minutes, price_cents
- `availability_rules` — weekly schedule per staff (day_of_week 0=Sun, start_time, end_time)
- `availability_exceptions` — date-specific overrides (blocked or custom hours)
- `appointments` — core booking: staff_id, service_id, client info, starts_at/ends_at, status, reminder flags
- `clients` — salon CRM: name, phone, email, visit_count, last_visit_at
- `phone_calls` — Vapi call log
- `social_posts` — Buffer post queue
- `newsletter_campaigns` — Resend campaigns

## Code conventions

- DB access: `import { createClient } from "@/libs/supabase/server"` (SSR) or `@/libs/supabase/service` (service role)
- Lib modules: `libs/salon/index.js`, `libs/booking/index.js`, `libs/reminders/index.js`, `libs/phone/index.js`
- API routes: `app/api/<domain>/route.js` — thin handlers, business logic in libs
- Action verbs: `read`, `write`, `delete`, `search`, `transform`, `normalize` only — no `get`, `fetch`, `list`, `create`, `update`
- Never `database.init()` at module top level (this is a GuildOS convention — hairos uses `createClient` directly)

## App structure

```
app/(private)/(shell)/   — authenticated app (sidebar nav)
  dashboard/             — today's overview
  calendar/              — week view calendar
  staff/                 — staff management
  services/              — service catalog
  clients/               — client CRM (build this)
  marketing/
    social/              — Buffer post scheduler (build this)
    newsletter/          — Resend campaigns (build this)
  onboarding/            — 4-step setup wizard
  settings/              — integrations (build this)

app/(public)/
  booking/[slug]/        — public client booking flow (done)

app/api/
  salon/                 — GET/POST salon, staff, services
  appointments/          — GET/POST appointments, availability, rules
  booking/[slug]/        — public: GET slots, POST book
  phone/                 — Vapi webhook
  reminders/             — cron: send 24h/2h SMS reminders
```

## What's already built (do not rebuild)

- Supabase migration with full schema
- `libs/salon` — readSalon, readStaff, readServices, writeStaff, writeService, writeStaffServices
- `libs/booking` — readAvailableSlots, writeAppointment, readAppointments, writeAvailabilityRules
- `libs/reminders` — sendSms (Twilio), sendEmail (Resend), processReminders (cron logic)
- `libs/phone` — handleVapiWebhook, provisionVapiAssistant
- All API routes listed above
- Dashboard page (shows today's appointments)
- Calendar page (week view, staff filter)
- Staff page (cards, add/edit modal)
- Services page (table, add/edit modal)
- Onboarding wizard (4 steps: salon → staff → services → hours)
- Public booking page (`/booking/[slug]`) — full flow with slot picker, contact form, SMS confirmation

## What you need to build (Phase 2)

### 1. Clients page (`/clients`)
- Searchable table: name, phone, email, visit count, last visit date
- Click row to see appointment history for that client
- No external API needed — pure Supabase queries

### 2. Social scheduler (`/marketing/social`)
- Form to create a post: text content, image upload (optional), platform selection (Instagram / Facebook / TikTok checkboxes), schedule date/time
- Save to `social_posts` table with status `draft` or `scheduled`
- List of scheduled/published posts
- Buffer API integration is stubbed — store posts in DB, show "Connect Buffer" banner if `salon.buffer_token` is null
- `POST /api/social` with actions: `write_post`, `read_posts`, `delete_post`

### 3. Newsletter composer (`/marketing/newsletter`)
- Subject + HTML/rich-text body editor (use TinyMCE — already in dependencies as `@tinymce/tinymce-react`)
- Recipient count preview (count of clients with email in this salon)
- Send button → POST to Resend, mark campaign `sent_at`
- List of past campaigns
- `POST /api/newsletter` with actions: `write_campaign`, `send_campaign`, `read_campaigns`

### 4. Settings / integrations page (`/settings`)
Use the existing settings route if one exists, or create it. Show integration cards:
- **AI Phone (Vapi)** — show `salon.vapi_assistant_id` if connected; "Set up" button that calls `POST /api/settings?action=provision_vapi` which calls `provisionVapiAssistant` from `libs/phone`
- **Google Calendar** — show connected/not; stub "Connect" button (OAuth not configured yet — just show a "coming soon" state)
- **Buffer** — show connected/not; stub "Connect" button
- **SMS (Twilio)** — show the salon's `twilio_from_number` if set; editable field to enter a number manually for now

### 5. Email HTML templates
Replace plain-text email bodies in `libs/reminders/index.js` with proper branded HTML:
- Confirmation email (sent on booking)
- 24h reminder
- 2h reminder  
- Post-visit follow-up / review request
Use inline styles (Resend renders them fine). Keep it simple — salon name, appointment details, a call-to-action button.

### 6. Calendar quick-add modal
In `app/(private)/(shell)/calendar/page.js`, the "new appointment" modal currently just links to the public booking page. Replace it with an inline quick-add form:
- Select service, select staff, date/time, client name + phone
- POST to `/api/appointments?action=write_appointment`
- Refresh the calendar after saving

## Submitting results

1. Take screenshots of each completed feature (all 6 above)
2. Upload screenshots to Supabase Storage: bucket `GuildOS_Bucket`, path `cursor_cloud/<questId>/<filename>.png`
   ```javascript
   import { createClient } from '@supabase/supabase-js';
   const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRETE_KEY);
   const { data } = await db.storage.from('GuildOS_Bucket').upload('cursor_cloud/<questId>/screenshot.png', buffer);
   const { data: urlData } = db.storage.from('GuildOS_Bucket').getPublicUrl('cursor_cloud/<questId>/screenshot.png');
   ```
3. Submit via `POST /api/quest?action=submit_results` on the GuildOS app (`https://guildos.vercel.app`) with your quest ID, adventurer ID, and artifact URLs
4. Git push your branch

## Supabase credentials (for storage upload)

Use these env vars — they point to the GuildOS Supabase (for artifact storage):
```
GUILDOS_SUPABASE_URL=https://sdrqhejvvmbolqzfujej.supabase.co
GUILDOS_SUPABASE_SERVICE_KEY=<ask Guildmaster if not set>
```

The hairos app itself uses a different Supabase project (`wjsgcftsarbqreiwwedv`).
