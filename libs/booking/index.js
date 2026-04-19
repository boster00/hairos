// Availability calculation and appointment management

const SLOT_INTERVAL_MINUTES = 15;

export async function readAvailableSlots(supabase, { salonId, staffId, serviceId, date }) {
  const { data: service } = await supabase.from("services").select("duration_minutes").eq("id", serviceId).single();
  if (!service) return { data: [], error: "service not found" };
  const duration = service.duration_minutes;

  const dayOfWeek = new Date(date).getDay();

  // Get staff to check (all active if no staffId specified)
  let staffQuery = supabase.from("staff").select("id, name").eq("salon_id", salonId).eq("active", true);
  if (staffId) staffQuery = staffQuery.eq("id", staffId);
  const { data: staffList } = await staffQuery;

  const slots = [];

  for (const member of staffList || []) {
    // Check if they can perform this service
    const { data: canDo } = await supabase.from("staff_services")
      .select("service_id").eq("staff_id", member.id).eq("service_id", serviceId).maybeSingle();
    if (!canDo) continue;

    // Get recurring availability for this day
    const { data: rules } = await supabase.from("availability_rules")
      .select("start_time, end_time").eq("staff_id", member.id).eq("day_of_week", dayOfWeek);
    if (!rules?.length) continue;

    // Check for exception on this date
    const { data: exception } = await supabase.from("availability_exceptions")
      .select("*").eq("staff_id", member.id).eq("date", date).maybeSingle();
    if (exception?.is_blocked) continue;

    const startTime = exception?.start_time || rules[0].start_time;
    const endTime = exception?.end_time || rules[0].end_time;

    // Get existing appointments for this staff on this date
    const dateStart = `${date}T00:00:00Z`;
    const dateEnd = `${date}T23:59:59Z`;
    const { data: booked } = await supabase.from("appointments")
      .select("starts_at, ends_at")
      .eq("staff_id", member.id)
      .neq("status", "cancelled")
      .gte("starts_at", dateStart)
      .lte("starts_at", dateEnd);

    // Generate slots
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let cursor = sh * 60 + sm;
    const end = eh * 60 + em;

    while (cursor + duration <= end) {
      const slotStart = new Date(`${date}T${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      const conflict = (booked || []).some(b => {
        const bs = new Date(b.starts_at);
        const be = new Date(b.ends_at);
        return slotStart < be && slotEnd > bs;
      });

      if (!conflict) {
        slots.push({ staffId: member.id, staffName: member.name, startsAt: slotStart.toISOString(), endsAt: slotEnd.toISOString() });
      }

      cursor += SLOT_INTERVAL_MINUTES;
    }
  }

  return { data: slots };
}

export async function writeAppointment(supabase, data) {
  const { id, ...fields } = data;
  if (id) return supabase.from("appointments").update(fields).eq("id", id).select().single();

  // Upsert client record
  let clientId = fields.client_id;
  if (!clientId && fields.client_phone) {
    const { data: existing } = await supabase.from("clients")
      .select("id, visit_count").eq("salon_id", fields.salon_id).eq("phone", fields.client_phone).maybeSingle();
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: newClient } = await supabase.from("clients").insert({
        salon_id: fields.salon_id,
        name: fields.client_name,
        email: fields.client_email,
        phone: fields.client_phone,
      }).select().single();
      clientId = newClient?.id;
    }
  }

  return supabase.from("appointments").insert({ ...fields, client_id: clientId }).select().single();
}

export async function readAppointments(supabase, { salonId, staffId, from, to, status }) {
  let q = supabase.from("appointments")
    .select("*, staff(name), services(name, duration_minutes, price_cents)")
    .eq("salon_id", salonId);
  if (staffId) q = q.eq("staff_id", staffId);
  if (from) q = q.gte("starts_at", from);
  if (to) q = q.lte("starts_at", to);
  if (status) q = q.eq("status", status);
  return q.order("starts_at");
}

export async function writeAvailabilityRules(supabase, staffId, rules) {
  await supabase.from("availability_rules").delete().eq("staff_id", staffId);
  if (!rules?.length) return { data: [] };
  return supabase.from("availability_rules").insert(rules.map(r => ({ ...r, staff_id: staffId })));
}

export async function writeAvailabilityException(supabase, data) {
  const { staff_id, date, ...fields } = data;
  await supabase.from("availability_exceptions").delete().eq("staff_id", staff_id).eq("date", date);
  return supabase.from("availability_exceptions").insert({ staff_id, date, ...fields }).select().single();
}
