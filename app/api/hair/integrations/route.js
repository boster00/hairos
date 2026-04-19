import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import { isDemoHairContext, getDemoSalon, updateDemoSalonIntegration, getLastGoogleCalendarHtmlLink } from "@/libs/hairos/demoStore";
import { getGoogleIntegration } from "@/libs/hairos/integrationsDb";

function integrationFieldsFromSalon(salon, googleExtra = {}) {
  const googleConnected = googleExtra.hasGoogleRow || !!(salon.google_oauth_refresh_token);
  return {
    vapi_assistant_id: salon.vapi_assistant_id ?? null,
    twilio_from_number: salon.twilio_from_number ?? null,
    google_calendar_connected: googleConnected,
    google_calendar_email: googleExtra.email ?? null,
    squarespace_connected: !!salon.squarespace_connected,
    last_google_calendar_event_url:
      isDemoHairContext() ? getLastGoogleCalendarHtmlLink() : null,
  };
}

export async function GET() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const salon = isDemoHairContext() ? getDemoSalon() : ctx.salon;
  let googleExtra = {};
  if (!isDemoHairContext()) {
    const { data: g } = await getGoogleIntegration(supabase, salon.id);
    googleExtra = { hasGoogleRow: !!(g?.refresh_token), email: g?.email ?? null };
  }
  const data = integrationFieldsFromSalon(salon, googleExtra);
  return NextResponse.json({ data });
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

  if (body.connect_squarespace === true) {
    if (isDemoHairContext()) {
      const salon = updateDemoSalonIntegration({ squarespace_connected: true });
      return NextResponse.json({ data: integrationFieldsFromSalon(salon) });
    }
    const { data, error } = await supabase
      .from("salons")
      .update({ squarespace_connected: true, updated_at: new Date().toISOString() })
      .eq("id", ctx.salon.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: integrationFieldsFromSalon(data) });
  }

  return NextResponse.json({ error: "unsupported action" }, { status: 400 });
}
