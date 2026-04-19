import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');
  if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });

  const { data: article } = await supabase
    .from('content_magic_articles')
    .select('id, status, context, title')
    .eq('id', articleId)
    .eq('user_id', user.id)
    .single();

  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const agenticState = article.context?.agenticState || {};
  const isDone = article.status !== 'agentic_processing';

  return NextResponse.json({
    success: true,
    articleId: article.id,
    title: article.title,
    status: article.status,
    isDone,
    currentPhase: agenticState.currentPhase,
    phaseMessage: agenticState.phaseMessage,
    agenticState,
  });
}
