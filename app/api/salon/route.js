import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { readSalon, writeSalon, readStaff, writeStaff, deleteStaff, readServices, writeService, writeStaffServices } from "@/libs/salon";

export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "read_salon";

  if (action === "read_salon") {
    const { data, error } = await readSalon(supabase, { ownerId: user.id });
    return NextResponse.json(error ? { error } : { data });
  }

  if (action === "read_staff") {
    const { data: salon } = await readSalon(supabase, { ownerId: user.id });
    if (!salon) return NextResponse.json({ error: "no salon" }, { status: 404 });
    const { data, error } = await readStaff(supabase, { salonId: salon.id });
    return NextResponse.json(error ? { error } : { data });
  }

  if (action === "read_services") {
    const { data: salon } = await readSalon(supabase, { ownerId: user.id });
    if (!salon) return NextResponse.json({ error: "no salon" }, { status: 404 });
    const { data, error } = await readServices(supabase, { salonId: salon.id });
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

  if (action === "write_salon") {
    const { data, error } = await writeSalon(supabase, { ...body.data, owner_id: user.id });
    return NextResponse.json(error ? { error } : { data });
  }

  if (action === "write_staff") {
    const { data: salon } = await readSalon(supabase, { ownerId: user.id });
    if (!salon) return NextResponse.json({ error: "no salon" }, { status: 404 });
    const { data, error } = await writeStaff(supabase, { ...body.data, salon_id: salon.id });
    if (!error && body.serviceIds) await writeStaffServices(supabase, data.id, body.serviceIds);
    return NextResponse.json(error ? { error } : { data });
  }

  if (action === "delete_staff") {
    const { error } = await deleteStaff(supabase, body.staffId);
    return NextResponse.json(error ? { error } : { success: true });
  }

  if (action === "write_service") {
    const { data: salon } = await readSalon(supabase, { ownerId: user.id });
    if (!salon) return NextResponse.json({ error: "no salon" }, { status: 404 });
    const { data, error } = await writeService(supabase, { ...body.data, salon_id: salon.id });
    return NextResponse.json(error ? { error } : { data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
