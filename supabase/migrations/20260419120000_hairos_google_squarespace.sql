-- HairOS: Google Calendar OAuth + Squarespace stub fields on salons

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS google_oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS squarespace_connected BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.salons.google_oauth_refresh_token IS 'OAuth2 refresh token for Google Calendar API (encrypted at rest in production recommended)';
COMMENT ON COLUMN public.salons.squarespace_connected IS 'UI stub / future: Squarespace site connection';

ALTER TABLE public.newsletter_campaigns
  ADD COLUMN IF NOT EXISTS open_rate_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS click_rate_pct NUMERIC(5,2);
