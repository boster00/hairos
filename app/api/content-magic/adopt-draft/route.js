/**
 * LEGACY adopt API — aligned with adopt-draft-new: persist draft HTML as-is (no scoping/extraction).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { findResultHtmlFile } from '@/libs/content-magic/outlineAssembly';
import { extractBodyContent } from '@/libs/content-magic/utils/renderShadowDOM';
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { articleId } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: article, error: articleError } = await supabase
      .from('content_magic_articles')
      .select('id, outline')
      .eq('id', articleId)
      .eq('user_id', user.id)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const outline = article.outline || {};
    if (outline.status !== 'completed') {
      return NextResponse.json(
        { error: 'Draft is not completed yet. Outline status: ' + (outline.status || 'none') },
        { status: 400 }
      );
    }

    let rawHtml = outline.content_html || null;
    if (!rawHtml && Array.isArray(outline.files) && outline.files.length > 0) {
      const resultHtml = findResultHtmlFile(outline.files);
      rawHtml = resultHtml?.content ?? null;
    }

    if (!rawHtml || typeof rawHtml !== 'string' || rawHtml.trim().length === 0) {
      return NextResponse.json(
        { error: 'No draft HTML found in outline (missing content_html and index.html in files)' },
        { status: 400 }
      );
    }

    const finalHtml = extractBodyContent(rawHtml);

    const { error: updateError } = await supabase
      .from('content_magic_articles')
      .update({ content_html: finalHtml })
      .eq('id', articleId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save adopted draft', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      articleId,
      adoptedLength: finalHtml.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to adopt draft', details: error.toString() },
      { status: 500 }
    );
  }
}
