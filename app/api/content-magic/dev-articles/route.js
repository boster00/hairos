import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/libs/supabase/serviceRole';
import { DEV_FAKE_CONTENT_MAGIC_ARTICLES } from '@/libs/content-magic/devFakeArticles';

/**
 * Dev-only: list or fetch one content_magic_articles row without a browser session (CJGEO_DEV_FAKE_AUTH).
 * Falls back to built-in mock rows if Supabase is unreachable (placeholder env).
 */
export async function GET(request) {
  if (process.env.CJGEO_DEV_FAKE_AUTH !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const returnOne = (article) =>
    NextResponse.json({ article: article || null, articles: article ? [article] : [] });

  try {
    const svc = createServiceRoleClient();
    if (id) {
      const { data, error } = await svc
        .from('content_magic_articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        return returnOne(data);
      }
    } else {
      const { data, error } = await svc
        .from('content_magic_articles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!error && data?.length) {
        return NextResponse.json({ articles: data });
      }
    }
  } catch {
    // fall through to mock
  }

  if (id) {
    const mock = DEV_FAKE_CONTENT_MAGIC_ARTICLES.find((a) => a.id === id);
    return returnOne(mock);
  }

  return NextResponse.json({ articles: DEV_FAKE_CONTENT_MAGIC_ARTICLES });
}
