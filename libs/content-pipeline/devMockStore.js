/**
 * In-memory Content Pipeline store when CJGEO_DEV_FAKE_AUTH=1 (no Supabase).
 * Simulates tick: pending → processing (+ mock article) → done on next tick.
 */

export const FAKE_PIPELINE_USER_ID = "00000000-0000-0000-0000-000000000001";

const pipelines = new Map();
/** @type {Map<string, Array<object>>} */
const itemsByPipeline = new Map();
let seq = 1;

function nid(prefix) {
  return `${prefix}-${String(seq++).padStart(6, "0")}`;
}

/** In-memory mock only when fake auth is on AND real DB pipeline is not requested */
export function isPipelineDevMock() {
  if (process.env.CONTENT_PIPELINE_USE_REAL_DB === "1") return false;
  return process.env.CJGEO_DEV_FAKE_AUTH === "1";
}

function sortItems(list) {
  return [...list].sort((a, b) => a.position - b.position);
}

function ensureDefaultDemoPipeline(userId) {
  if (userId !== FAKE_PIPELINE_USER_ID) return;
  if (pipelines.size > 0) return;
  const now = new Date().toISOString();
  const id = nid("pl");
  pipelines.set(id, {
    id,
    user_id: userId,
    name: "Demo pipeline",
    icp_id: null,
    offer_id: null,
    frequency_hours: 24,
    next_run_at: new Date(Date.now() + 86400000).toISOString(),
    status: "active",
    current_index: 0,
    created_at: now,
    updated_at: now,
  });
  itemsByPipeline.set(id, []);
}

export function mockListPipelines(userId) {
  if (userId !== FAKE_PIPELINE_USER_ID) return [];
  ensureDefaultDemoPipeline(userId);
  return Array.from(pipelines.values())
    .filter((p) => p.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((p) => {
      const list = itemsByPipeline.get(p.id) || [];
      return {
        ...p,
        icps: null,
        offers: null,
        total_items: list.length,
        done_items: list.filter((i) => i.status === "done").length,
        pending_items: list.filter((i) => i.status === "pending").length,
      };
    });
}

export function mockCreatePipeline(userId, body) {
  const { name, icp_id, offer_id, frequency_hours = 24, items: itemInputs = [] } = body;
  const id = nid("pl");
  const now = new Date().toISOString();
  const freq = Math.max(1, parseInt(String(frequency_hours), 10) || 24);
  const pipeline = {
    id,
    user_id: userId,
    name,
    icp_id: icp_id || null,
    offer_id: offer_id || null,
    frequency_hours: freq,
    next_run_at: new Date(Date.now() - 2000).toISOString(),
    status: "active",
    current_index: 0,
    created_at: now,
    updated_at: now,
  };
  pipelines.set(id, pipeline);

  const rows = itemInputs.map((item, idx) => ({
    id: nid("it"),
    pipeline_id: id,
    keyword: typeof item === "string" ? item : item.keyword,
    title: typeof item === "object" ? item.title || null : null,
    position: idx,
    status: "pending",
    article_id: null,
    error_message: null,
    created_at: now,
    updated_at: now,
  }));
  itemsByPipeline.set(id, rows);
  return { pipeline };
}

export function mockGetPipeline(userId, pipelineId) {
  const p = pipelines.get(pipelineId);
  if (!p || p.user_id !== userId) return null;
  return {
    pipeline: { ...p, icps: null, offers: null },
    items: sortItems(itemsByPipeline.get(pipelineId) || []),
  };
}

export function mockPatchPipeline(userId, pipelineId, updates) {
  const p = pipelines.get(pipelineId);
  if (!p || p.user_id !== userId) return null;
  const allowed = ["status", "frequency_hours", "icp_id", "offer_id", "name"];
  for (const k of allowed) {
    if (updates[k] !== undefined) p[k] = updates[k];
  }
  p.updated_at = new Date().toISOString();
  return p;
}

export function mockDeletePipeline(userId, pipelineId) {
  const p = pipelines.get(pipelineId);
  if (!p || p.user_id !== userId) return false;
  pipelines.delete(pipelineId);
  itemsByPipeline.delete(pipelineId);
  return true;
}

export function mockAppendItems(userId, pipelineId, rawItems) {
  const p = pipelines.get(pipelineId);
  if (!p || p.user_id !== userId) return { error: "Not found" };
  const list = itemsByPipeline.get(pipelineId) || [];
  const maxPos = list.reduce((m, i) => Math.max(m, i.position), -1);
  const now = new Date().toISOString();
  let pos = maxPos + 1;
  for (const item of rawItems) {
    list.push({
      id: nid("it"),
      pipeline_id: pipelineId,
      keyword: typeof item === "string" ? item : item.keyword,
      title: typeof item === "object" ? item.title || null : null,
      position: pos++,
      status: "pending",
      article_id: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    });
  }
  itemsByPipeline.set(pipelineId, list);
  if (p.status === "completed") {
    p.status = "active";
    p.next_run_at = scheduleNextRunMock();
    p.updated_at = now;
  }
  return { inserted: rawItems.length };
}

/** Mock store: keep pipeline due so repeated ticks advance without waiting hours */
function scheduleNextRunMock() {
  return new Date(Date.now() - 5000).toISOString();
}

/**
 * One transition per due active pipeline per tick:
 * - If an item is processing → mark done (simulated agent finished).
 * - Else if pending exists → first pending → processing + mock article_id.
 * - If no pending left → completed.
 */
export function mockTick() {
  const now = new Date().toISOString();
  const results = [];

  const due = Array.from(pipelines.values()).filter(
    (p) =>
      p.status === "active" &&
      p.next_run_at &&
      new Date(p.next_run_at) <= new Date(now)
  );

  for (const pipeline of due) {
    const list = itemsByPipeline.get(pipeline.id) || [];
    const processing = list.find((i) => i.status === "processing");

    if (processing) {
      processing.status = "done";
      processing.updated_at = now;
      pipeline.current_index = (pipeline.current_index || 0) + 1;
      pipeline.updated_at = now;

      const anyPending = list.some((i) => i.status === "pending");
      if (anyPending) {
        pipeline.next_run_at = scheduleNextRunMock();
      } else {
        pipeline.status = "completed";
        pipeline.next_run_at = null;
      }

      results.push({
        pipelineId: pipeline.id,
        itemId: processing.id,
        articleId: processing.article_id,
        action: "finished_processing",
      });
      continue;
    }

    const pending = sortItems(list).find((i) => i.status === "pending");
    if (!pending) {
      pipeline.status = "completed";
      pipeline.next_run_at = null;
      pipeline.updated_at = now;
      continue;
    }

    const articleId = nid("art");
    pending.status = "processing";
    pending.article_id = articleId;
    pending.updated_at = now;
    pipeline.updated_at = now;
    pipeline.next_run_at = scheduleNextRunMock();

    results.push({
      pipelineId: pipeline.id,
      itemId: pending.id,
      articleId,
      action: "started_processing",
    });
  }

  return { processed: results.length, items: results };
}

/** Test helper: reset store */
export function __resetDevMockStore() {
  pipelines.clear();
  itemsByPipeline.clear();
  seq = 1;
}
