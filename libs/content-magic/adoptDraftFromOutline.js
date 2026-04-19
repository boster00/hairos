import { findResultHtmlFile } from './outlineAssembly.js';
import { extractBodyContent } from './utils/renderShadowDOM.js';

/**
 * Same behavior as POST /api/content-magic/adopt-draft-new: extract body from v0 draft HTML and persist to content_magic_articles.content_html.
 * Optionally merges outline patch (e.g. status: 'adopted').
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ articleId: string, userId: string, outline?: object, outlinePatch?: object }} params
 * @returns {Promise<{ success: true, adoptedLength: number } | { success: false, error: string }>}
 */
export async function adoptDraftHtmlToArticle(supabase, params) {
  const { articleId, userId, outline: outlineArg, outlinePatch } = params;

  let outline = outlineArg;
  if (!outline) {
    const { data: article, error: articleError } = await supabase
      .from('content_magic_articles')
      .select('id, outline')
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();

    if (articleError || !article) {
      return { success: false, error: 'Article not found' };
    }
    outline = article.outline || {};
  }

  if (outline.status !== 'completed') {
    return {
      success: false,
      error: `Draft is not completed yet. Outline status: ${outline.status || 'none'}`,
    };
  }

  let rawHtml = outline.content_html || null;
  if (!rawHtml && Array.isArray(outline.files) && outline.files.length > 0) {
    const resultHtml = findResultHtmlFile(outline.files);
    rawHtml = resultHtml?.content ?? null;
  }

  if (!rawHtml || typeof rawHtml !== 'string' || rawHtml.trim().length === 0) {
    return {
      success: false,
      error: 'No draft HTML found in outline (missing content_html and index.html in files)',
    };
  }

  const finalHtml = extractBodyContent(rawHtml);
  const updatePayload = { content_html: finalHtml };
  if (outlinePatch && Object.keys(outlinePatch).length > 0) {
    updatePayload.outline = { ...outline, ...outlinePatch };
  }

  const { error: updateError } = await supabase
    .from('content_magic_articles')
    .update(updatePayload)
    .eq('id', articleId)
    .eq('user_id', userId);

  if (updateError) {
    return { success: false, error: updateError.message || 'Failed to save adopted draft' };
  }

  return { success: true, adoptedLength: finalHtml.length };
}
