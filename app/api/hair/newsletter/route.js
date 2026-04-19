import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import {
  deleteDemoNewsletter,
  isDemoHairContext,
  listDemoNewsletters,
  upsertDemoNewsletter,
} from "@/libs/hairos/demoStore";

export async function GET() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (isDemoHairContext()) {
    return NextResponse.json({ data: listDemoNewsletters() });
  }

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select("*")
    .eq("salon_id", ctx.salon.id)
    .order("created_at", { ascending: false });
  return NextResponse.json(error ? { error: error.message } : { data: data || [] });
}

export async function POST(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();
  const subject = String(body.subject || "").trim();
  const content_html = String(body.content_html || "").trim();
  if (!subject) return NextResponse.json({ error: "subject required" }, { status: 400 });
  if (!content_html) return NextResponse.json({ error: "content_html required" }, { status: 400 });

  const row = {
    subject,
    content_html,
    recipient_count: Number(body.recipient_count) || 0,
    sent_at: body.sent_at || null,
  };

  if (isDemoHairContext()) {
    return NextResponse.json({ data: upsertDemoNewsletter({ ...row, id: body.id }) });
  }

  const payload = { ...row, salon_id: ctx.salon.id };
  if (body.id) {
    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .update(payload)
      .eq("id", body.id)
      .eq("salon_id", ctx.salon.id)
      .select()
      .single();
    return NextResponse.json(error ? { error: error.message } : { data });
  }
  const { data, error } = await supabase.from("newsletter_campaigns").insert(payload).select().single();
  return NextResponse.json(error ? { error: error.message } : { data });
}

export async function DELETE(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (isDemoHairContext()) {
    deleteDemoNewsletter(id);
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase.from("newsletter_campaigns").delete().eq("id", id).eq("salon_id", ctx.salon.id);
  return NextResponse.json(error ? { error: error.message } : { success: true });
}
