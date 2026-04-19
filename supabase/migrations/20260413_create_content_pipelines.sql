-- Content pipelines (CJGEO) — mirrors app expectations in app/api/content-pipeline/*
-- Apply via Supabase CLI or SQL editor.

CREATE TABLE IF NOT EXISTS content_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icp_id UUID REFERENCES icps(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  frequency_hours INTEGER NOT NULL DEFAULT 24,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  current_index INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_pipeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES content_pipelines(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  title TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  article_id UUID REFERENCES content_magic_articles(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pipeline_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own pipelines" ON content_pipelines;
CREATE POLICY "Users can manage their own pipelines" ON content_pipelines
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage items in their pipelines" ON content_pipeline_items;
CREATE POLICY "Users can manage items in their pipelines" ON content_pipeline_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM content_pipelines WHERE id = pipeline_id AND user_id = auth.uid())
  );
