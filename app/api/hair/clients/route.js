import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import {
  deleteDemoClient,
  isDemoHairContext,
  listDemoClients,
  upsertDemoClient,
} from "@/libs/hairos/demoStore";

export async function GET() {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (isDemoHairContext()) {
    return NextResponse.json({ data: listDemoClients() });
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("salon_id", ctx.salon.id)
    .order("name");
  return NextResponse.json(error ? { error: error.message } : { data: data || [] });
}

export async function POST(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json();
  const row = {
    name: String(body.name || "").trim(),
    email: body.email ? String(body.email).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
  };
  if (!row.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  if (isDemoHairContext()) {
    return NextResponse.json({ data: upsertDemoClient({ ...row, id: body.id }) });
  }

  const payload = { ...row, salon_id: ctx.salon.id };
  if (body.id) {
    const { data, error } = await supabase.from("clients").update(payload).eq("id", body.id).eq("salon_id", ctx.salon.id).select().single();
    return NextResponse.json(error ? { error: error.message } : { data });
  }
  const { data, error } = await supabase.from("clients").insert(payload).select().single();
  return NextResponse.json(error ? { error: error.message } : { data });
}

export async function DELETE(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (isDemoHairContext()) {
    deleteDemoClient(id);
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase.from("clients").delete().eq("id", id).eq("salon_id", ctx.salon.id);
  return NextResponse.json(error ? { error: error.message } : { success: true });
}
