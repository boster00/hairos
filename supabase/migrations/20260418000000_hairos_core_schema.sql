-- HairOS core schema
-- Multi-tenant: each salon is one account (owner = auth.users row)

CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  vapi_assistant_id TEXT,
  vapi_phone_number_id TEXT,
  twilio_from_number TEXT,
  google_calendar_token JSONB,
  buffer_token JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'stylist' CHECK (role IN ('owner', 'stylist')),
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_services (
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- Weekly recurring availability per staff member
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- Date-specific overrides (days off, special hours)
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_2h_sent BOOLEAN NOT NULL DEFAULT false,
  followup_sent BOOLEAN NOT NULL DEFAULT false,
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  vapi_call_id TEXT UNIQUE,
  caller_phone TEXT,
  transcript TEXT,
  caller_name TEXT,
  booking_link_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  buffer_post_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Salon owner policy helper: user owns the salon
CREATE OR REPLACE FUNCTION get_user_salon_ids(uid UUID)
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT id FROM salons WHERE owner_id = uid
$$;

DROP POLICY IF EXISTS "owner" ON salons;
CREATE POLICY "owner" ON salons FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner" ON staff;
CREATE POLICY "owner" ON staff FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

DROP POLICY IF EXISTS "owner" ON services;
CREATE POLICY "owner" ON services FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

DROP POLICY IF EXISTS "owner" ON staff_services;
CREATE POLICY "owner" ON staff_services FOR ALL
  USING (staff_id IN (SELECT id FROM staff WHERE salon_id IN (SELECT get_user_salon_ids(auth.uid()))));

DROP POLICY IF EXISTS "owner" ON availability_rules;
CREATE POLICY "owner" ON availability_rules FOR ALL
  USING (staff_id IN (SELECT id FROM staff WHERE salon_id IN (SELECT get_user_salon_ids(auth.uid()))));

DROP POLICY IF EXISTS "owner" ON availability_exceptions;
CREATE POLICY "owner" ON availability_exceptions FOR ALL
  USING (staff_id IN (SELECT id FROM staff WHERE salon_id IN (SELECT get_user_salon_ids(auth.uid()))));

DROP POLICY IF EXISTS "owner" ON clients;
CREATE POLICY "owner" ON clients FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

DROP POLICY IF EXISTS "owner" ON appointments;
CREATE POLICY "owner" ON appointments FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

DROP POLICY IF EXISTS "owner" ON phone_calls;
CREATE POLICY "owner" ON phone_calls FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

DROP POLICY IF EXISTS "owner" ON social_posts;
CREATE POLICY "owner" ON social_posts FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

DROP POLICY IF EXISTS "owner" ON newsletter_campaigns;
CREATE POLICY "owner" ON newsletter_campaigns FOR ALL USING (salon_id IN (SELECT get_user_salon_ids(auth.uid())));

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_appointments_salon_starts ON appointments(salon_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_starts ON appointments(staff_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_reminders ON appointments(starts_at, reminder_24h_sent, reminder_2h_sent) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_availability_rules_staff ON availability_rules(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_clients_salon ON clients(salon_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(salon_id, scheduled_at) WHERE status = 'draft';
