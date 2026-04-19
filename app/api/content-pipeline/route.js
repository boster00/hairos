import { NextResponse } from "next/server";
import {
  FAKE_PIPELINE_USER_ID,
  isPipelineDevMock,
  mockCreatePipeline,
  mockListPipelines,
} from "@/libs/content-pipeline/devMockStore";
import { getPipelineDbContext } from "@/libs/content-pipeline/getPipelineDbContext";

// GET - list all pipelines for user
export async function GET() {
  const { supabase, userId, sessionUser } = await getPipelineDbContext();
  if (isPipelineDevMock()) {
    const uid = sessionUser?.id || FAKE_PIPELINE_USER_ID;
    const pipelines = mockListPipelines(uid);
    return NextResponse.json({ success: true, pipelines, dev_mock: true });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pipelines, error } = await supabase
    .from("content_pipelines")
    .select(`
      *,
      icps(id, name),
      offers(id, name),
      content_pipeline_items(id, status)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute item counts
  const enriched = (pipelines || []).map(p => {
    const items = p.content_pipeline_items || [];
    return {
      ...p,
      total_items: items.length,
      done_items: items.filter(i => i.status === "done").length,
      pending_items: items.filter(i => i.status === "pending").length,
      content_pipeline_items: undefined,
    };
  });

  return NextResponse.json({ success: true, pipelines: enriched });
}

// POST - create new pipeline
export async function POST(request) {
  const { supabase, userId, sessionUser } = await getPipelineDbContext();

  const { name, icp_id, offer_id, frequency_hours = 24, items = [] } = await request.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ error: "At least one topic/keyword is required" }, { status: 400 });

  if (isPipelineDevMock()) {
    const uid = sessionUser?.id || FAKE_PIPELINE_USER_ID;
    const { pipeline } = mockCreatePipeline(uid, {
      name,
      icp_id,
      offer_id,
      frequency_hours,
      items,
    });
    const list = mockListPipelines(uid);
    const enriched = list.find((p) => p.id === pipeline.id);
    return NextResponse.json({
      success: true,
      pipeline: enriched || pipeline,
      dev_mock: true,
    });
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const freqHours = Math.max(1, parseInt(frequency_hours) || 24);
  const nextRunAt = new Date(Date.now() + freqHours * 60 * 60 * 1000).toISOString();

  const { data: pipeline, error: pipelineError } = await supabase
    .from("content_pipelines")
    .insert({
      user_id: userId,
      name,
      icp_id: icp_id || null,
      offer_id: offer_id || null,
      frequency_hours: freqHours,
      next_run_at: nextRunAt,
      status: "active",
      current_index: 0,
    })
    .select()
    .single();

  if (pipelineError) return NextResponse.json({ error: pipelineError.message }, { status: 500 });

  // Insert items
  const itemRows = items.map((item, idx) => ({
    pipeline_id: pipeline.id,
    keyword: typeof item === "string" ? item : item.keyword,
    title: typeof item === "object" ? item.title || null : null,
    position: idx,
    status: "pending",
  }));

  await supabase.from("content_pipeline_items").insert(itemRows);

  return NextResponse.json({ success: true, pipeline });
}
