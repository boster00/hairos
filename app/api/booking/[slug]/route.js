import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/service";
import { readSalon, readServices, readStaff } from "@/libs/salon";
import { readAvailableSlots, writeAppointment } from "@/libs/booking";
import { sendSms, sendEmail } from "@/libs/reminders";

// Public — no auth required
export async function GET(req, { params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "read_salon";

  const { data: salon } = await readSalon(supabase, { slug });
  if (!salon) return NextResponse.json({ error: "salon not found" }, { status: 404 });

  if (action === "read_salon") {
    const { data: services } = await readServices(supabase, { salonId: salon.id });
    const { data: staff } = await readStaff(supabase, { salonId: salon.id });
    return NextResponse.json({ data: { salon: { id: salon.id, name: salon.name, slug: salon.slug }, services, staff } });
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

export async function POST(req, { params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const body = await req.json();

  const { data: salon } = await readSalon(supabase, { slug });
  if (!salon) return NextResponse.json({ error: "salon not found" }, { status: 404 });

  const { data: appt, error } = await writeAppointment(supabase, { ...body, salon_id: salon.id });
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Confirmation SMS + email
  if (body.client_phone) {
    const time = new Date(appt.starts_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
    await sendSms({ to: body.client_phone, from: salon.twilio_from_number, body: `You're booked at ${salon.name} on ${time}. See you then!` }).catch(() => {});
  }
  if (body.client_email) {
    await sendEmail({ to: body.client_email, subject: `Booking confirmed at ${salon.name}`, html: `<p>Your appointment is confirmed!</p>` }).catch(() => {});
  }

  return NextResponse.json({ data: appt });
}
