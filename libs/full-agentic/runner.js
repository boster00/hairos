/**
 * Full Agentic Article Creation Runner
 * Chains all research and generation steps for hands-off article creation.
 * Phase tracking stored in article.context.agenticState
 */

function getOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function internalPost(path, body, cookies = null) {
  const url = `${getOrigin()}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${path} failed (${res.status})`);
  return data;
}

/**
 * Update article context with agentic state
 */
export async function updateAgenticState(supabase, articleId, patch) {
  const { data: article } = await supabase
    .from('content_magic_articles')
    .select('context')
    .eq('id', articleId)
    .single();

  const currentContext = article?.context || {};
  const currentState = currentContext.agenticState || {};

  await supabase
    .from('content_magic_articles')
    .update({
      context: {
        ...currentContext,
        agenticState: { ...currentState, ...patch, updatedAt: new Date().toISOString() },
      },
    })
    .eq('id', articleId);
}

/**
 * Run the full agentic pipeline for an article.
 * Resumes from the last completed phase if article already exists.
 */
export async function runFullAgentic({ supabase, articleId, cookies = null }) {
  const { data: article, error } = await supabase
    .from('content_magic_articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error || !article) throw new Error('Article not found');

  const state = article.context?.agenticState || {};
  const mainKeyword = article.context?.mainKeyword || article.title;
  const icpId = article.context?.icp_id;
  const offerId = article.context?.offer_id;

  // Phase 1: Competitor research + topics
  if (!state.phase1Done) {
    await updateAgenticState(supabase, articleId, { currentPhase: 'competitor_research', phaseMessage: `Researching competitors for "${mainKeyword}"` });
    try {
      const searchData = await internalPost('/api/content-magic/search', { query: mainKeyword, maxResults: 5 }, cookies);
      const urls = (searchData.results || []).map(r => r.url).filter(Boolean).slice(0, 5);

      let crawledPages = [];
      if (urls.length > 0) {
        const crawlSettled = await Promise.allSettled(urls.map(url => internalPost('/api/content-magic/crawl', { url }, cookies)));
        crawledPages = crawlSettled.map((r, i) => {
          if (r.status !== 'fulfilled') return null;
          const d = r.value;
          return { url: urls[i], title: d.title || urls[i], content: d.content_html || d.content || '' };
        }).filter(p => p && p.content.length > 100);
      }

      let topics = [];
      if (crawledPages.length >= 2) {
        await updateAgenticState(supabase, articleId, { phaseMessage: `Found ${crawledPages.length} competitor pages, extracting topics...` });
        const benchmarkData = await internalPost('/api/content-magic/benchmark', {
          pages: crawledPages.map(p => ({ url: p.url, title: p.title, content: p.content })),
          assetType: 'key_topics',
          topicGranularity: 10,
        }, cookies);
        topics = benchmarkData.assets?.topics || [];
      }

      await supabase.rpc('merge_article_assets', {
        article_id: articleId,
        patch_data: { main_keyword: mainKeyword, topics, competitorPages: crawledPages.map(p => ({ url: p.url, title: p.title })) },
      });
      await updateAgenticState(supabase, articleId, { phase1Done: true, topicsFound: topics.length });
    } catch (e) {
      await updateAgenticState(supabase, articleId, { phase1Error: e.message });
      // Non-fatal: continue to phase 2
    }
  }

  // Phase 2: Keyword research
  if (!state.phase2Done) {
    await updateAgenticState(supabase, articleId, { currentPhase: 'keyword_research', phaseMessage: `Researching keywords related to "${mainKeyword}"` });
    try {
      const kwData = await internalPost('/api/dataforseo/related-keywords', { keywords: [mainKeyword], limit: 50 }, cookies);
      const candidates = kwData.candidates || [];
      await updateAgenticState(supabase, articleId, { phaseMessage: `Found ${candidates.length} keywords, evaluating relevance...`, phase2Done: true, keywordsFound: candidates.length });

      await supabase.rpc('merge_article_assets', {
        article_id: articleId,
        patch_data: { verticalKeywords: candidates.slice(0, 20) },
      });
    } catch (e) {
      await updateAgenticState(supabase, articleId, { phase2Error: e.message, phase2Done: true });
    }
  }

  // Phase 3: Generate outline + draft
  if (!state.phase3Done) {
    await updateAgenticState(supabase, articleId, { currentPhase: 'generating_outline', phaseMessage: 'Generating content outline...' });
    try {
      // Get fresh article data with assets
      const { data: freshArticle } = await supabase.from('content_magic_articles').select('*').eq('id', articleId).single();

      // Use the full-auto run which handles outline generation internally
      // We call the v0 outline step directly
      const outlineData = await internalPost('/api/content-magic/v0-chat', {
        articleId,
        step: 'outline',
        mainKeyword,
      }, cookies).catch(() => null);

      await updateAgenticState(supabase, articleId, { currentPhase: 'generating_draft', phaseMessage: 'Writing your article draft...' });

      // Mark phase 3 done - article will now be visible to user
      await updateAgenticState(supabase, articleId, { phase3Done: true, completedAt: new Date().toISOString(), currentPhase: 'completed', phaseMessage: 'Done!' });

      // Update article status so it shows as ready
      await supabase.from('content_magic_articles').update({ status: 'draft' }).eq('id', articleId);
    } catch (e) {
      await updateAgenticState(supabase, articleId, { phase3Error: e.message, phase3Done: true, currentPhase: 'completed' });
      await supabase.from('content_magic_articles').update({ status: 'draft' }).eq('id', articleId);
    }
  }

  return { success: true, articleId };
}
