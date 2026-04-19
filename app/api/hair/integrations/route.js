import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import { isDemoHairContext, getDemoSalon, updateDemoSalonIntegration } from "@/libs/hairos/demoStore";

function summarizeSalon(salon) {
  const hasGoogle = !!salon.google_calendar_token;
  const hasBuffer = !!salon.buffer_token;
  return {
    google_calendar: { connected: hasGoogle },
    buffer: { connected: hasBuffer },
    resend: {
      configured: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      from: process.env.RESEND_FROM_EMAIL || null,
    },
  };
}

export async function GET() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const salon = isDemoHairContext() ? getDemoSalon() : ctx.salon;
  return NextResponse.json({ data: summarizeSalon(salon) });
}

export async function POST(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();

  if (isDemoHairContext()) {
    const patch = {};
    if (body.connect_google === true) patch.google_calendar_token = { demo: true, connected_at: new Date().toISOString() };
    if (body.disconnect_google === true) patch.google_calendar_token = null;
    if (body.connect_buffer === true) patch.buffer_token = { demo: true, connected_at: new Date().toISOString() };
    if (body.disconnect_buffer === true) patch.buffer_token = null;
    const salon = updateDemoSalonIntegration(patch);
    return NextResponse.json({ data: summarizeSalon(salon) });
  }

  const updates = { updated_at: new Date().toISOString() };
  if (body.connect_google === true) updates.google_calendar_token = { placeholder: true };
  if (body.disconnect_google === true) updates.google_calendar_token = null;
  if (body.connect_buffer === true) updates.buffer_token = { placeholder: true };
  if (body.disconnect_buffer === true) updates.buffer_token = null;

  const { data, error } = await supabase.from("salons").update(updates).eq("id", ctx.salon.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: summarizeSalon(data) });
}
