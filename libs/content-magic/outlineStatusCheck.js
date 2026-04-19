import { initMonkey } from '../monkey.js';
import { findResultHtmlFile } from './outlineAssembly.js';
import { decideRenderingStatus, toMs } from './utils/decideRenderingStatus.js';

const STUCK_QUEUED_THRESHOLD_MS = 60_000;
const MAX_SEND_ATTEMPTS = 3;

const LOG = '[outline-status]';
function logDecision(step, detail = {}) {
  console.log(LOG, step, detail);
}

function outlineForRendering(outline) {
  return { ...outline, files: [], content_html: undefined };
}

/**
 * Core outline-status logic (same as POST /api/content-magic/outline-status).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ articleId: string, userId: string, chatIdCheckOnly?: boolean, initialCheck?: boolean, user_context?: object }} params
 * @returns {Promise<object>} Payload suitable for NextResponse.json (status, outline, reason, error, etc.)
 */
export async function processOutlineStatusForArticle(supabase, params) {
  const {
    articleId,
    userId,
    chatIdCheckOnly = false,
    initialCheck = false,
    user_context = {},
  } = params;

  if (!articleId) {
    return { error: 'articleId is required', _httpStatus: 400 };
  }

  const { data: article, error: articleError } = await supabase
    .from('content_magic_articles')
    .select('outline')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return { error: 'Article not found', _httpStatus: 404 };
  }

  const outline = article.outline || {};

  logDecision('request', {
    articleId,
    chatIdCheckOnly,
    initialCheck,
    dbStatus: outline.status ?? 'none',
    chatId: outline.chatId ? `${String(outline.chatId).slice(0, 8)}…` : null,
  });

  if (chatIdCheckOnly) {
    logDecision('exit', {
      path: 'chatIdCheckOnly',
      v0Pull: false,
      reason: 'DB-only mode for client chatId confirmation',
    });
    return {
      chatId: outline.chatId || null,
      status: outline.status || 'none',
    };
  }

  if (outline.status === 'queued' && outline.chatId) {
    const queuedAt = outline.queued_at ? new Date(outline.queued_at).getTime() : 0;
    const ageMs = Date.now() - queuedAt;
    const attemptCount = outline.attempt_count ?? 0;

    logDecision('branch_queued', {
      ageMs,
      stuckThresholdMs: STUCK_QUEUED_THRESHOLD_MS,
      attemptCount,
      willStuckKick: ageMs > STUCK_QUEUED_THRESHOLD_MS && attemptCount < MAX_SEND_ATTEMPTS,
    });

    if (ageMs > STUCK_QUEUED_THRESHOLD_MS && attemptCount < MAX_SEND_ATTEMPTS) {
      logDecision('stuck_kick', {
        v0Call: 'v0SendMessage',
        note: 'Recovery: queued too long, sending prompt to v0',
      });
      const sendingOutline = {
        ...outline,
        status: 'sending',
        send_started_at: new Date().toISOString(),
        attempt_count: attemptCount + 1,
      };
      await supabase
        .from('content_magic_articles')
        .update({ outline: sendingOutline })
        .eq('id', articleId)
        .eq('user_id', userId);

      try {
        const monkey = await initMonkey();
        monkey.loadUserContext({ ...user_context, userId });
        const prompt = outline.prompt || '';
        const sendResult = await monkey.v0SendMessage(outline.chatId, prompt);

        if (sendResult.success) {
          await supabase
            .from('content_magic_articles')
            .update({ outline: { ...sendingOutline, status: 'rendering', send_finished_at: new Date().toISOString() } })
            .eq('id', articleId)
            .eq('user_id', userId);
          logDecision('exit', {
            path: 'stuck_kick_success',
            v0Pull: false,
            v0Send: true,
            responseStatus: 'rendering',
          });
          return { status: 'rendering', outline: outlineForRendering({ ...sendingOutline, status: 'rendering' }) };
        }
        const errOutline = {
          ...sendingOutline,
          status: attemptCount + 1 >= MAX_SEND_ATTEMPTS ? 'failed' : 'queued',
          last_error: sendResult.error,
          last_error_at: new Date().toISOString(),
          queued_at: new Date().toISOString(),
        };
        await supabase
          .from('content_magic_articles')
          .update({ outline: errOutline })
          .eq('id', articleId)
          .eq('user_id', userId);
        logDecision('exit', {
          path: 'stuck_kick_send_failed',
          v0Pull: false,
          v0Send: true,
          responseStatus: errOutline.status,
        });
        return { status: errOutline.status, outline: errOutline };
      } catch (kickErr) {
        const failedOutline = {
          ...sendingOutline,
          status: 'failed',
          last_error: kickErr?.message || 'stuck-kick failed',
          last_error_at: new Date().toISOString(),
        };
        await supabase
          .from('content_magic_articles')
          .update({ outline: failedOutline })
          .eq('id', articleId)
          .eq('user_id', userId);
        logDecision('exit', {
          path: 'stuck_kick_exception',
          v0Pull: false,
          v0Send: true,
          responseStatus: 'failed',
        });
        return { status: 'failed', outline: failedOutline };
      }
    }

    if (attemptCount >= MAX_SEND_ATTEMPTS) {
      const failedOutline = { ...outline, status: 'failed', last_error: 'Max sendMessage attempts reached' };
      await supabase
        .from('content_magic_articles')
        .update({ outline: failedOutline })
        .eq('id', articleId)
        .eq('user_id', userId);
      logDecision('exit', {
        path: 'queued_max_attempts',
        v0Pull: false,
        v0Send: false,
        responseStatus: 'failed',
      });
      return { status: 'failed', outline: failedOutline };
    }

    logDecision('exit', {
      path: 'queued_no_pull_yet',
      v0Pull: false,
      v0Send: false,
      reason: 'Within stuck threshold or waiting for background sendMessage',
      responseStatus: 'queued',
    });
    return { status: 'queued', outline };
  }

  let needsPull = false;
  let needsPullReason = 'no_chatId';
  if (outline.chatId) {
    if (outline.status === 'rendering' || outline.status === 'sending' || outline.status === 'failed') {
      needsPull = true;
      needsPullReason =
        outline.status === 'sending'
          ? 'status_sending_or_rendering_failed → poll v0 for progress/result'
          : `status_${outline.status}_→ poll v0`;
    } else if (outline.status === 'completed') {
      const hasIndexHtml = Array.isArray(outline.files)
        ? outline.files.some(f => f?.name === 'index.html')
        : false;
      if (!hasIndexHtml || initialCheck) {
        needsPull = true;
        needsPullReason = !hasIndexHtml
          ? 'completed_but_missing_index_html'
          : 'initialCheck_force_pull';
      } else {
        needsPullReason = 'completed_with_index_html_no_pull';
      }
    } else {
      needsPullReason = `status_${outline.status || 'none'}_no_v0_pull_rule`;
    }
  }

  logDecision('needsPull_decision', {
    needsPull,
    needsPullReason,
    dbStatus: outline.status,
  });

  if (!needsPull) {
    logDecision('exit', {
      path: 'no_v0_pull',
      v0Pull: false,
      v0GetChatRaw: false,
      responseStatus: outline.status || 'none',
      note: 'Returning DB outline as-is (no v0GetChatRaw)',
    });
    return { status: outline.status || 'none', outline };
  }

  logDecision('v0GetChatRaw_start', {
    chatId: String(outline.chatId).slice(0, 12) + '…',
  });
  const monkey = await initMonkey();
  monkey.loadUserContext({ ...user_context, userId });
  const rawResult = await monkey.v0GetChatRaw(outline.chatId);
  logDecision('v0GetChatRaw_done', {
    success: rawResult.success,
    error: rawResult.success ? undefined : String(rawResult.error || '').slice(0, 200),
  });

  if (!rawResult.success) {
    const isHardError = (rawResult.error && (
      String(rawResult.error).includes('404') ||
      String(rawResult.error).toLowerCase().includes('not found') ||
      String(rawResult.error).includes('Unauthorized')
    ));
    if (isHardError) {
      const failedOutline = {
        ...outline,
        status: 'failed',
        last_error: rawResult.error,
        last_error_at: new Date().toISOString(),
      };
      await supabase
        .from('content_magic_articles')
        .update({ outline: failedOutline })
        .eq('id', articleId)
        .eq('user_id', userId);
      logDecision('exit', {
        path: 'v0GetChatRaw_hard_error',
        v0Pull: true,
        responseStatus: 'failed',
      });
      return { status: 'failed', outline: failedOutline };
    }
    logDecision('exit', {
      path: 'v0GetChatRaw_transient',
      v0Pull: true,
      responseStatus: 'rendering',
      reason: 'v0_fetch_transient_error',
    });
    return { status: 'rendering', outline: outlineForRendering(outline), reason: 'v0_fetch_transient_error' };
  }

  const raw = rawResult.raw;

  const v0UpdatedMs = toMs(raw?.latestVersion?.updatedAt);
  if (outline.feedbackSubmittedAt) {
    const feedbackMs = toMs(outline.feedbackSubmittedAt);
    if (!isNaN(v0UpdatedMs) && !isNaN(feedbackMs) && v0UpdatedMs < feedbackMs) {
      logDecision('exit', {
        path: 'v0_stale_vs_feedback',
        v0Pull: true,
        responseStatus: 'rendering',
        reason: 'v0_response_predates_feedback',
      });
      return { status: 'rendering', outline: outlineForRendering(outline), reason: 'v0_response_predates_feedback' };
    }
  }
  if (outline.lastImproveStartedAt && !isNaN(v0UpdatedMs)) {
    const improveMs = toMs(outline.lastImproveStartedAt);
    if (!isNaN(improveMs) && v0UpdatedMs < improveMs) {
      logDecision('exit', {
        path: 'v0_stale_vs_improve',
        v0Pull: true,
        responseStatus: 'rendering',
        reason: 'v0_response_predates_improvement',
      });
      return {
        status: 'rendering',
        outline: outlineForRendering(outline),
        reason: 'v0_response_predates_improvement',
      };
    }
  }

  const attemptStartedAtMs = outline.retryStartedAt
    ? new Date(outline.retryStartedAt).getTime()
    : undefined;
  const initiatedAtMs = attemptStartedAtMs
    ?? (outline.send_finished_at ? new Date(outline.send_finished_at).getTime() : undefined)
    ?? (outline.startedAt ? new Date(outline.startedAt).getTime() : undefined);
  const { status: renderingStatus, reason } = decideRenderingStatus(raw, { attemptStartedAtMs, initiatedAtMs });

  if (renderingStatus === 'Rendering') {
    logDecision('exit', {
      path: 'decideRenderingStatus_still_rendering',
      v0Pull: true,
      responseStatus: 'rendering',
      decideReason: reason,
    });
    return { status: 'rendering', outline: outlineForRendering(outline), reason };
  }

  if (renderingStatus === 'Failed') {
    const failedOutline = {
      ...outline,
      status: 'failed',
      last_error: reason,
      last_error_at: new Date().toISOString(),
    };
    await supabase
      .from('content_magic_articles')
      .update({ outline: failedOutline })
      .eq('id', articleId)
      .eq('user_id', userId);
    logDecision('exit', {
      path: 'decideRenderingStatus_failed',
      v0Pull: true,
      responseStatus: 'failed',
      decideReason: reason,
    });
    return { status: 'failed', outline: failedOutline, reason };
  }

  if (renderingStatus === 'Completed') {
    const rawFiles = raw.latestVersion?.files || [];
    const files = rawFiles.map((f) => ({
      name: f?.name ?? f?.meta?.file ?? 'unnamed',
      content: f?.source ?? f?.content ?? f?.code ?? '',
    }));

    let content_html = null;
    const resultHtml = findResultHtmlFile(files);
    if (resultHtml?.content) {
      content_html = resultHtml.content;
    } else {
      const pageTsx = files.find((f) => f.name === 'app/page.tsx');
      if (pageTsx?.content) content_html = pageTsx.content;
    }

    const chatId = outline.chatId;
    const demoUrl = `https://v0.dev/chat/${chatId}`;
    const completedAt = new Date().toISOString();
    const version = raw.latestVersion;
    const createdMs = version?.createdAt ? new Date(version.createdAt).getTime() : NaN;
    const updatedMs = version?.updatedAt ? new Date(version.updatedAt).getTime() : NaN;
    let generationTime;
    if (!isNaN(createdMs) && !isNaN(updatedMs) && updatedMs >= createdMs) {
      const elapsedSec = ((updatedMs - createdMs) / 1000).toFixed(1);
      generationTime = `${elapsedSec}s`;
    } else {
      const startMs = outline.startedAt ? new Date(outline.startedAt).getTime() : Date.now();
      const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
      generationTime = `${elapsedSec}s`;
    }
    const completedOutline = {
      ...outline,
      status: 'completed',
      chatId,
      demoUrl,
      content_html,
      files,
      completedAt,
      generationTime,
    };

    const { error: updateError } = await supabase
      .from('content_magic_articles')
      .update({ outline: completedOutline })
      .eq('id', articleId)
      .eq('user_id', userId);

    if (updateError) {
      logDecision('exit', {
        path: 'completed_db_update_failed',
        v0Pull: true,
        responseStatus: 'rendering',
      });
      return { status: 'rendering', outline: outlineForRendering(outline) };
    }

    logDecision('exit', {
      path: 'completed',
      v0Pull: true,
      responseStatus: 'completed',
      hasContentHtml: Boolean(content_html),
    });
    return { status: 'completed', outline: completedOutline };
  }

  logDecision('exit', {
    path: 'fallback',
    v0Pull: true,
    responseStatus: outline.status || 'rendering',
  });
  return { status: outline.status || 'rendering', outline: outlineForRendering(outline) };
}
