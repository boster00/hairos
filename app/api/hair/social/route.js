import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import {
  deleteDemoSocialPost,
  isDemoHairContext,
  listDemoSocialPosts,
  upsertDemoSocialPost,
} from "@/libs/hairos/demoStore";

export async function GET() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (isDemoHairContext()) {
    return NextResponse.json({ data: listDemoSocialPosts() });
  }

  const { data, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("salon_id", ctx.salon.id)
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  return NextResponse.json(error ? { error: error.message } : { data: data || [] });
}

export async function POST(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const platforms = Array.isArray(body.platforms) ? body.platforms.map(String) : [];
  const scheduled_at = body.scheduled_at ? String(body.scheduled_at) : null;
  const status = body.status === "draft" || body.status === "scheduled" ? body.status : "draft";

  const row = { content, platforms, scheduled_at, status, image_urls: body.image_urls || [] };

  if (isDemoHairContext()) {
    return NextResponse.json({ data: upsertDemoSocialPost({ ...row, id: body.id }) });
  }

  const payload = { ...row, salon_id: ctx.salon.id };
  if (body.id) {
    const { data, error } = await supabase.from("social_posts").update(payload).eq("id", body.id).eq("salon_id", ctx.salon.id).select().single();
    return NextResponse.json(error ? { error: error.message } : { data });
  }
  const { data, error } = await supabase.from("social_posts").insert(payload).select().single();
  return NextResponse.json(error ? { error: error.message } : { data });
}

export async function DELETE(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (isDemoHairContext()) {
    deleteDemoSocialPost(id);
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase.from("social_posts").delete().eq("id", id).eq("salon_id", ctx.salon.id);
  return NextResponse.json(error ? { error: error.message } : { success: true });
}
