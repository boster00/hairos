import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { readAppointments, writeAppointment, readAvailableSlots, writeAvailabilityRules, writeAvailabilityException } from "@/libs/booking";
import { readSalon } from "@/libs/salon";

export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "read_appointments";

  const { data: salon } = await readSalon(supabase, { ownerId: user.id });
  if (!salon) return NextResponse.json({ error: "no salon" }, { status: 404 });

  if (action === "read_appointments") {
    const { data, error } = await readAppointments(supabase, {
      salonId: salon.id,
      staffId: searchParams.get("staffId"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      status: searchParams.get("status"),
    });
    return NextResponse.json(error ? { error } : { data });
  }

  if (action === "read_slots") {
    const { data, error } = await readAvailableSlots(supabase, {
      salonId: salon.id,
      staffId: searchParams.get("staffId"),
      serviceId: searchParams.get("serviceId"),
      date: searchParams.get("date"),
    });
    return NextResponse.json(error ? { error } : { data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  const { data: salon } = await readSalon(supabase, { ownerId: user.id });
  if (!salon) return NextResponse.json({ error: "no salon" }, { status: 404 });

  if (action === "write_appointment") {
    const { data, error } = await writeAppointment(supabase, { ...body.data, salon_id: salon.id });
    return NextResponse.json(error ? { error } : { data });
  }

  if (action === "write_availability_rules") {
    const { error } = await writeAvailabilityRules(supabase, body.staffId, body.rules);
    return NextResponse.json(error ? { error } : { success: true });
  }

  if (action === "write_availability_exception") {
    const { data, error } = await writeAvailabilityException(supabase, body.data);
    return NextResponse.json(error ? { error } : { data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
