-- OAuth and third-party integrations per salon (multi-tenant)

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  email TEXT,
  scopes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (salon_id, service)
);

CREATE INDEX IF NOT EXISTS idx_integrations_salon_service ON public.integrations(salon_id, service);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner" ON public.integrations;
CREATE POLICY "owner" ON public.integrations FOR ALL
  USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

COMMENT ON TABLE public.integrations IS 'Per-salon OAuth tokens and integration state (Google Calendar, etc.)';
