import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import { isDemoHairContext, getDemoSalon, updateDemoSalonIntegration } from "@/libs/hairos/demoStore";

/** Salon fields used by HairOS settings (no live Google/Buffer state in UI — stubs only). */
function integrationFieldsFromSalon(salon) {
  return {
    vapi_assistant_id: salon.vapi_assistant_id ?? null,
    twilio_from_number: salon.twilio_from_number ?? null,
  };
}

export async function GET() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const salon = isDemoHairContext() ? getDemoSalon() : ctx.salon;
  return NextResponse.json({ data: integrationFieldsFromSalon(salon) });
}

export async function POST(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();

  if (body.set_twilio_from_number != null) {
    const raw = String(body.set_twilio_from_number).trim();
    if (isDemoHairContext()) {
      const salon = updateDemoSalonIntegration({ twilio_from_number: raw || null });
      return NextResponse.json({ data: integrationFieldsFromSalon(salon) });
    }
    const { data, error } = await supabase
      .from("salons")
      .update({ twilio_from_number: raw || null, updated_at: new Date().toISOString() })
      .eq("id", ctx.salon.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: integrationFieldsFromSalon(data) });
  }

  return NextResponse.json({ error: "unsupported action" }, { status: 400 });
}
