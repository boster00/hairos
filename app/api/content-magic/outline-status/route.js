import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { processOutlineStatusForArticle } from '@/libs/content-magic/outlineStatusCheck';

/**
 * Outline status check.
 *
 * chatIdCheckOnly mode (body.chatIdCheckOnly = true):
 *   Lightweight DB-only read. Returns { chatId, status } immediately.
 *   Used by the client during the init-polling phase to confirm chatId was saved.
 *
 * Normal mode:
 *   - If status is 'queued' and stuck (queued_at > threshold ago)
 *     and attempt_count < max: re-fires sendMessage as a recovery kick.
 *   - If status is 'rendering' or 'failed' and chatId exists: fetches v0 for results.
 *   - If status is 'completed' but files missing: re-fetches v0.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { articleId, chatIdCheckOnly = false, initialCheck = false } = body;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await processOutlineStatusForArticle(supabase, {
      articleId,
      userId: user.id,
      chatIdCheckOnly,
      initialCheck,
      user_context: body?.user_context,
    });

    if (payload._httpStatus) {
      return NextResponse.json(
        { error: payload.error },
        { status: payload._httpStatus }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.log('[outline-status]', 'exit', { path: 'exception', error: error?.message, status: 500 });
    return NextResponse.json(
      { error: error.message || 'Failed to check outline status' },
      { status: 500 }
    );
  }
}
