import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { adoptDraftHtmlToArticle } from '@/libs/content-magic/adoptDraftFromOutline';

/**
 * Primary adopt-draft API: saves the same body HTML as the draft preview (extractBodyContent). No section slicing or shadow CSS rewrite.
 */
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

    const result = await adoptDraftHtmlToArticle(supabase, {
      articleId,
      userId: user.id,
    });

    if (!result.success) {
      const isNotReady = result.error?.includes('not completed');
      return NextResponse.json(
        { error: result.error || 'Adopt failed' },
        { status: isNotReady ? 400 : (result.error === 'Article not found' ? 404 : 500) }
      );
    }

    return NextResponse.json({
      success: true,
      articleId,
      adoptedLength: result.adoptedLength,
      mode: 'preview-body',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to adopt draft (new)', details: error.toString() },
      { status: 500 }
    );
  }
}
