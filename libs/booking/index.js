// Availability calculation and appointment management

import {
  getDemoSalon,
  insertDemoAppointment,
  isDemoHairContext,
  listDemoAppointments,
  listDemoAvailabilityRules,
  listDemoServices,
  listDemoStaff,
  setLastGoogleCalendarHtmlLink,
  updateDemoAppointment,
} from "@/libs/hairos/demoStore";
import { createCalendarEvent } from "@/libs/google/calendarSync";
import { getGoogleCalendarRefreshTokenForSalon } from "@/libs/hairos/integrationsDb";
import { sendEmail } from "@/libs/reminders";

const SLOT_INTERVAL_MINUTES = 15;

function parseTimeToMinutes(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Demo Luxe: real slot grid from availability_rules + conflicts. */
function readDemoAvailableSlots({ staffId, serviceId, date }) {
  const services = listDemoServices();
  const staffMembers = listDemoStaff();
  const rules = listDemoAvailabilityRules();
  const appts = listDemoAppointments();
  const service = services.find((s) => s.id === serviceId);
  if (!service) return { data: [], error: "service not found" };
  const duration = service.duration_minutes;
  const dow = new Date(`${date}T12:00:00`).getDay();

  const eligibleStaff = (staffMembers || []).filter((m) => {
    if (staffId && m.id !== staffId) return false;
    const ids = (m.staff_services || []).map((x) => x.service_id);
    return ids.includes(serviceId);
  });

  const slots = [];
  for (const member of eligibleStaff) {
    const dayRules = rules.filter((r) => r.staff_id === member.id && r.day_of_week === dow);
    if (!dayRules.length) continue;
    const startM = Math.min(...dayRules.map((r) => parseTimeToMinutes(r.start_time)));
    const endM = Math.max(...dayRules.map((r) => parseTimeToMinutes(r.end_time)));
    let cursor = startM;
    while (cursor + duration <= endM) {
      const sh = Math.floor(cursor / 60);
      const sm = cursor % 60;
      const slotStart = new Date(`${date}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const booked = appts.filter(
        (a) =>
          a.staff_id === member.id &&
          typeof a.starts_at === "string" &&
          a.starts_at.startsWith(date) &&
          a.status !== "cancelled",
      );
      const conflict = booked.some((b) => {
        const bs = new Date(b.starts_at);
        const be = new Date(b.ends_at);
        return slotStart < be && slotEnd > bs;
      });
      if (!conflict) {
        slots.push({
          staffId: member.id,
          staffName: member.name,
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
        });
      }
      cursor += SLOT_INTERVAL_MINUTES;
    }
  }
  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { data: slots.slice(0, 24) };
}

export async function readAvailableSlots(supabase, { salonId, staffId, serviceId, date }) {
  if (isDemoHairContext() && salonId === getDemoSalon().id) {
    return readDemoAvailableSlots({ staffId, serviceId, date });
  }

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
  if (isDemoHairContext() && data.salon_id === getDemoSalon().id) {
    const { id: _id, ...fields } = data;
    let row = insertDemoAppointment(fields);
    const salon = getDemoSalon();
    const rt = salon.google_oauth_refresh_token;
    if (rt && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const svc = listDemoServices().find((s) => s.id === fields.service_id);
      const summary = `${svc?.name || "Appointment"} · ${fields.client_name || "Guest"}`;
      const cal = await createCalendarEvent({
        refreshToken: rt,
        calendarId: salon.google_calendar_id || "primary",
        summary,
        description: `HairOS booking · ${fields.client_phone || ""} ${fields.client_email || ""}`.trim(),
        startIso: fields.starts_at,
        endIso: fields.ends_at,
        timeZone: salon.timezone || "America/Los_Angeles",
      });
      if (cal.data?.htmlLink) {
        setLastGoogleCalendarHtmlLink(cal.data.htmlLink);
        row = updateDemoAppointment(row.id, { google_calendar_event_id: cal.data.id || null }) || row;
        try {
          if (fields.client_email) {
            await sendEmail({
              to: fields.client_email,
              subject: "Added to calendar — Luxe Studio by Maya",
              html: `<p>Your appointment is on the calendar.</p><p><a href="${cal.data.htmlLink}">Open in Google Calendar</a></p>`,
            });
          }
        } catch {
          /* ignore */
        }
      }
    }
    return { data: row, error: null };
  }
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

  const ins = await supabase.from("appointments").insert({ ...fields, client_id: clientId }).select().single();
  if (ins.error) return ins;
  const apptRow = ins.data;
  const { data: salonRow } = await supabase
    .from("salons")
    .select("google_calendar_id, timezone, name")
    .eq("id", fields.salon_id)
    .single();
  const rt = await getGoogleCalendarRefreshTokenForSalon(supabase, fields.salon_id);
  if (rt && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const { data: svc } = await supabase.from("services").select("name").eq("id", fields.service_id).single();
      const cal = await createCalendarEvent({
        refreshToken: rt,
        calendarId: salonRow?.google_calendar_id || "primary",
        summary: `${svc?.name || "Appointment"} · ${fields.client_name || "Guest"} · ${salonRow?.name || ""}`,
        description: `HairOS · ${fields.client_phone || ""} ${fields.client_email || ""}`.trim(),
        startIso: fields.starts_at,
        endIso: fields.ends_at,
        timeZone: salonRow?.timezone || "America/Los_Angeles",
      });
      if (cal.data?.id) {
        await supabase.from("appointments").update({ google_calendar_event_id: cal.data.id }).eq("id", apptRow.id);
        apptRow.google_calendar_event_id = cal.data.id;
        if (cal.data.htmlLink) setLastGoogleCalendarHtmlLink(cal.data.htmlLink);
        try {
          if (fields.client_email) {
            await sendEmail({
              to: fields.client_email,
              subject: `Calendar invite · ${salonRow?.name || "Your salon"}`,
              html: `<p>Your appointment was added to Google Calendar.</p><p><a href="${cal.data.htmlLink}">Open event</a></p>`,
            });
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* Calendar sync is best-effort; booking still succeeds */
    }
  }
  return { data: apptRow, error: null };
}

export async function readAppointments(supabase, { salonId, staffId, from, to, status }) {
  if (isDemoHairContext() && salonId === getDemoSalon().id) {
    let list = listDemoAppointments();
    if (staffId) list = list.filter((a) => a.staff_id === staffId);
    if (from) list = list.filter((a) => a.starts_at >= from);
    if (to) list = list.filter((a) => a.starts_at <= to);
    if (status) list = list.filter((a) => a.status === status);
    list = [...list].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return { data: list, error: null };
  }
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
