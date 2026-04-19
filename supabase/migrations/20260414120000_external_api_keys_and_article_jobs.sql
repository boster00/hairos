-- External API keys + async article jobs for public REST integrations

CREATE TABLE IF NOT EXISTS public.external_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id uuid NOT NULL REFERENCES public.external_api_keys(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  title text NOT NULL,
  prompt text NOT NULL,
  main_keyword text NOT NULL,
  result_article_id uuid REFERENCES public.content_magic_articles(id) ON DELETE SET NULL,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own API keys" ON public.external_api_keys;
CREATE POLICY "Users manage own API keys" ON public.external_api_keys
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own jobs" ON public.article_jobs;
CREATE POLICY "Users view own jobs" ON public.article_jobs
  FOR SELECT USING (auth.uid() = user_id);
