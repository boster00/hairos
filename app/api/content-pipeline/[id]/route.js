import { NextResponse } from "next/server";
import {
  FAKE_PIPELINE_USER_ID,
  isPipelineDevMock,
  mockDeletePipeline,
  mockGetPipeline,
  mockPatchPipeline,
} from "@/libs/content-pipeline/devMockStore";
import { getPipelineDbContext } from "@/libs/content-pipeline/getPipelineDbContext";

// GET - get single pipeline with items
export async function GET(request, { params }) {
  const { supabase, userId, sessionUser } = await getPipelineDbContext();
  const uid = userId || (isPipelineDevMock() ? FAKE_PIPELINE_USER_ID : null);
  if (!uid || (!isPipelineDevMock() && !sessionUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (isPipelineDevMock()) {
    const got = mockGetPipeline(uid, id);
    if (!got) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, ...got, dev_mock: true });
  }

  const { data: pipeline, error } = await supabase
    .from("content_pipelines")
    .select("*, icps(id, name), offers(id, name)")
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error || !pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase
    .from("content_pipeline_items")
    .select("*")
    .eq("pipeline_id", id)
    .order("position", { ascending: true });

  return NextResponse.json({ success: true, pipeline, items: items || [] });
}

// PATCH - update pipeline (pause/resume/update settings)
export async function PATCH(request, { params }) {
  const { supabase, userId, sessionUser } = await getPipelineDbContext();
  const uid = userId || (isPipelineDevMock() ? FAKE_PIPELINE_USER_ID : null);
  if (!uid || (!isPipelineDevMock() && !sessionUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await request.json();

  const allowedFields = ["status", "frequency_hours", "icp_id", "offer_id", "name"];
  const patch = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) patch[field] = updates[field];
  }
  patch.updated_at = new Date().toISOString();

  if (isPipelineDevMock()) {
    const data = mockPatchPipeline(uid, id, patch);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, pipeline: data, dev_mock: true });
  }

  const { data, error } = await supabase
    .from("content_pipelines")
    .update(patch)
    .eq("id", id)
    .eq("user_id", uid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, pipeline: data });
}

// DELETE - delete pipeline
export async function DELETE(request, { params }) {
  const { supabase, userId, sessionUser } = await getPipelineDbContext();
  const uid = userId || (isPipelineDevMock() ? FAKE_PIPELINE_USER_ID : null);
  if (!uid || (!isPipelineDevMock() && !sessionUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (isPipelineDevMock()) {
    const ok = mockDeletePipeline(uid, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, dev_mock: true });
  }

  const { error } = await supabase
    .from("content_pipelines")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
