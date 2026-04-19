import { createClient as createServiceClient } from "@/libs/supabase/service";

export async function readSalon(supabase, { slug, id, ownerId } = {}) {
  let q = supabase.from("salons").select("*");
  if (slug) q = q.eq("slug", slug);
  else if (id) q = q.eq("id", id);
  else if (ownerId) q = q.eq("owner_id", ownerId);
  return q.maybeSingle();
}

export async function writeSalon(supabase, data) {
  const { id, ...fields } = data;
  if (id) {
    return supabase.from("salons").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  }
  return supabase.from("salons").insert(fields).select().single();
}

export async function readStaff(supabase, { salonId, active = true } = {}) {
  let q = supabase.from("staff").select("*, staff_services(service_id)").eq("salon_id", salonId);
  if (active !== null) q = q.eq("active", active);
  return q.order("name");
}

export async function writeStaff(supabase, data) {
  const { id, ...fields } = data;
  if (id) return supabase.from("staff").update(fields).eq("id", id).select().single();
  return supabase.from("staff").insert(fields).select().single();
}

export async function deleteStaff(supabase, staffId) {
  return supabase.from("staff").update({ active: false }).eq("id", staffId);
}

export async function readServices(supabase, { salonId, active = true } = {}) {
  let q = supabase.from("services").select("*").eq("salon_id", salonId);
  if (active !== null) q = q.eq("active", active);
  return q.order("name");
}

export async function writeService(supabase, data) {
  const { id, ...fields } = data;
  if (id) return supabase.from("services").update(fields).eq("id", id).select().single();
  return supabase.from("services").insert(fields).select().single();
}

export async function writeStaffServices(supabase, staffId, serviceIds) {
  await supabase.from("staff_services").delete().eq("staff_id", staffId);
  if (!serviceIds?.length) return { data: [] };
  return supabase.from("staff_services").insert(serviceIds.map(sid => ({ staff_id: staffId, service_id: sid })));
}
