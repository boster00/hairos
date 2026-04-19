import { NextResponse } from "next/server";
import {
  FAKE_PIPELINE_USER_ID,
  isPipelineDevMock,
  mockAppendItems,
} from "@/libs/content-pipeline/devMockStore";
import { getPipelineDbContext } from "@/libs/content-pipeline/getPipelineDbContext";

/**
 * POST /api/content-pipeline/[id]/items
 * Append items to an existing pipeline (for Topic Research "Send to Pipeline").
 */
export async function POST(request, { params }) {
  const { id: pipelineId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items = [] } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const { supabase, userId, sessionUser } = await getPipelineDbContext();
  const uid = userId || (isPipelineDevMock() ? FAKE_PIPELINE_USER_ID : null);
  if (!uid || (!isPipelineDevMock() && !sessionUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPipelineDevMock()) {
    const r = mockAppendItems(uid, pipelineId, items);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 404 });
    return NextResponse.json({
      success: true,
      inserted: r.inserted,
      dev_mock: true,
    });
  }

  const { data: pipeline, error: pErr } = await supabase
    .from("content_pipelines")
    .select("id, user_id")
    .eq("id", pipelineId)
    .eq("user_id", uid)
    .single();

  if (pErr || !pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("content_pipeline_items")
    .select("position")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: false })
    .limit(1);

  let start = 0;
  if (existing?.length && typeof existing[0].position === "number") {
    start = existing[0].position + 1;
  }

  const rows = items.map((item, idx) => ({
    pipeline_id: pipelineId,
    keyword: typeof item === "string" ? item : item.keyword,
    title: typeof item === "object" ? item.title || null : null,
    position: start + idx,
    status: "pending",
  }));

  const { error: insErr } = await supabase.from("content_pipeline_items").insert(rows);

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, inserted: rows.length });
}
