import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/libs/supabase/serviceRole';
import { processOutlineStatusForArticle } from '@/libs/content-magic/outlineStatusCheck';
import { adoptDraftHtmlToArticle } from '@/libs/content-magic/adoptDraftFromOutline';

const IDS = [
  '48a69152-3c3b-46ea-9cc9-21f85239288a',
  '57174dce-cfe7-4868-be66-4fcb10eb159d',
  'c10c10a1-e8d2-4c03-8d95-92ffd385706e',
];

const POLL_MS = 10_000;
const TIMEOUT_MS = 5 * 60_000;

async function markOutlineFailed(svc, articleId, userId, message) {
  const { data } = await svc
    .from('content_magic_articles')
    .select('outline')
    .eq('id', articleId)
    .eq('user_id', userId)
    .maybeSingle();
  const o = data?.outline || {};
  await svc
    .from('content_magic_articles')
    .update({
      outline: {
        ...o,
        status: 'failed',
        last_error: message,
        last_error_at: new Date().toISOString(),
      },
    })
    .eq('id', articleId)
    .eq('user_id', userId);
}

async function repairOne(svc, articleId) {
  const { data: row, error } = await svc
    .from('content_magic_articles')
    .select('user_id, outline')
    .eq('id', articleId)
    .maybeSingle();

  if (error || !row) {
    return { articleId, ok: false, error: error?.message || 'not found' };
  }

  const userId = row.user_id;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const payload = await processOutlineStatusForArticle(svc, {
      articleId,
      userId,
      initialCheck: false,
    });

    if (payload._httpStatus) {
      return { articleId, ok: false, error: payload.error };
    }

    const st = payload.status;

    if (st === 'failed') {
      return { articleId, ok: false, error: 'outline status failed' };
    }

    if (st === 'completed') {
      const outline = payload.outline || {};
      const adopt = await adoptDraftHtmlToArticle(svc, {
        articleId,
        userId,
        outline,
        outlinePatch: {
          status: 'adopted',
          adopted_at: new Date().toISOString(),
        },
      });
      if (!adopt.success) {
        return { articleId, ok: false, error: adopt.error };
      }
      return { articleId, ok: true, adoptedLength: adopt.adoptedLength };
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  await markOutlineFailed(svc, articleId, userId, 'Timed out after 5 minutes (dev-repair-adopts)');
  return { articleId, ok: false, error: 'timeout' };
}

/**
 * Dev-only one-time repair for stuck full-auto articles (poll v0 + adopt).
 * POST when CJGEO_DEV_FAKE_AUTH=1 (local) or call from trusted ops with real DB.
 */
export async function POST() {
  if (process.env.CJGEO_DEV_FAKE_AUTH !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const svc = createServiceRoleClient();
    const results = [];
    for (const id of IDS) {
      results.push(await repairOne(svc, id));
    }
    return NextResponse.json({ success: true, results });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'repair failed' },
      { status: 500 }
    );
  }
}
