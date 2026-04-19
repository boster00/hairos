import { NextResponse, after } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { createServiceRoleClient } from '@/libs/supabase/serviceRole';
import { runFullAgentic, updateAgenticState } from '@/libs/full-agentic/runner';

export const maxDuration = 120;

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, mainKeyword, icp_id, offer_id } = await request.json();
  if (!mainKeyword) return NextResponse.json({ error: 'mainKeyword is required' }, { status: 400 });

  // Create the article record immediately
  const articleTitle = title || mainKeyword;
  const serviceSupabase = createServiceRoleClient();

  const { data: article, error: createError } = await supabase
    .from('content_magic_articles')
    .insert({
      user_id: user.id,
      title: articleTitle,
      status: 'agentic_processing',
      context: {
        mainKeyword,
        icp_id: icp_id || null,
        offer_id: offer_id || null,
        agenticState: {
          currentPhase: 'starting',
          phaseMessage: 'Starting full agentic creation...',
          startedAt: new Date().toISOString(),
        },
        isAgenticCreation: true,
      },
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const articleId = article.id;

  // Get cookies for internal API calls
  const cookieHeader = request.headers.get('cookie') || '';

  // Run the agentic pipeline in the background
  after(async () => {
    try {
      await runFullAgentic({ supabase: serviceSupabase, articleId, cookies: cookieHeader });
    } catch (e) {
      await updateAgenticState(serviceSupabase, articleId, {
        currentPhase: 'error',
        phaseMessage: `Error: ${e.message}`,
        error: e.message,
      });
      await serviceSupabase.from('content_magic_articles').update({ status: 'draft' }).eq('id', articleId);
    }
  });

  return NextResponse.json({ success: true, articleId });
}
