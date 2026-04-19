"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import ComingSoonBanner from "@/components/hairos/ComingSoonBanner";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDates(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function localDatetimeValue(dateStr, hour) {
  const h = Math.min(19, Math.max(8, hour));
  return `${dateStr}T${String(h).padStart(2, "0")}:00`;
}

function formatHourLabel(h) {
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "am" : "pm";
  return `${hour12}:00 ${ampm}`;
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [salonSlug, setSalonSlug] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
  const [newAppt, setNewAppt] = useState(null);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    staff_id: "",
    service_id: "",
    starts_local: "",
  });
  const [saving, setSaving] = useState(false);

  const weekDates = getWeekDates(anchor);
  const from = `${formatDate(weekDates[0])}T00:00:00Z`;
  const to = `${formatDate(weekDates[6])}T23:59:59Z`;

  useEffect(() => {
    fetch("/api/salon?action=read_staff")
      .then((r) => r.json())
      .then(({ data }) => setStaff(data || []));
    fetch("/api/salon?action=read_services")
      .then((r) => r.json())
      .then(({ data }) => setServices(data || []));
    fetch("/api/salon?action=read_salon")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.slug) setSalonSlug(data.slug);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ action: "read_appointments", from, to });
    if (staffFilter !== "all") params.set("staffId", staffFilter);
    fetch(`/api/appointments?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setAppointments(data || []));
  }, [from, to, staffFilter]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === form.service_id),
    [services, form.service_id],
  );

  useEffect(() => {
    if (!newAppt) return;
    const defaultStaff = staff[0]?.id || "";
    const defaultService = services[0]?.id || "";
    let starts = "";
    if (newAppt.date && newAppt.hour != null) {
      starts = localDatetimeValue(newAppt.date, newAppt.hour);
    } else if (newAppt.date) {
      starts = localDatetimeValue(newAppt.date, 10);
    } else {
      starts = localDatetimeValue(formatDate(new Date()), 10);
    }
    setForm({
      client_name: "",
      client_email: "",
      client_phone: "",
      staff_id: defaultStaff,
      service_id: defaultService,
      starts_local: starts,
    });
  }, [newAppt, staff, services]);

  function prevWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  }
  function nextWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  }

  function getApptStyle(appt) {
    const start = new Date(appt.starts_at);
    const end = new Date(appt.ends_at);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end - start) / 3600000;
    const top = (startHour - 8) * 60;
    const height = duration * 60;
    return { top: `${top}px`, height: `${Math.max(height, 28)}px` };
  }

  function getApptsForDay(date) {
    const dateStr = formatDate(date);
    return appointments.filter((a) => a.starts_at.startsWith(dateStr));
  }

  function closeModal() {
    setNewAppt(null);
    setForm({
      client_name: "",
      client_email: "",
      client_phone: "",
      staff_id: "",
      service_id: "",
      starts_local: "",
    });
  }

  async function submitQuickAdd(e) {
    e.preventDefault();
    if (!form.client_name.trim() || !form.staff_id || !form.service_id || !form.starts_local) {
      toast.error("Fill in name, staff, service, and time");
      return;
    }
    const duration = selectedService?.duration_minutes ?? 60;
    const start = new Date(form.starts_local);
    if (Number.isNaN(start.getTime())) {
      toast.error("Invalid date/time");
      return;
    }
    const end = new Date(start.getTime() + duration * 60000);
    setSaving(true);
    const r = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "write_appointment",
        data: {
          staff_id: form.staff_id,
          service_id: form.service_id,
          client_name: form.client_name.trim(),
          client_email: form.client_email.trim() || null,
          client_phone: form.client_phone.trim() || null,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          status: "confirmed",
        },
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) {
      toast.error(j.error || "Could not create appointment");
      return;
    }
    toast.success("Appointment added");
    closeModal();
    const params = new URLSearchParams({ action: "read_appointments", from, to });
    if (staffFilter !== "all") params.set("staffId", staffFilter);
    const refetch = await fetch(`/api/appointments?${params}`).then((res) => res.json());
    setAppointments(refetch.data || []);
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-4 sm:px-6">
        <ComingSoonBanner />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6 border-b border-base-300">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className="btn btn-ghost btn-lg sm:btn-sm min-h-12 sm:min-h-0" onClick={prevWeek}>
            ‹
          </button>
          <span className="font-medium text-sm flex-1 min-w-0">
            {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button type="button" className="btn btn-ghost btn-lg sm:btn-sm min-h-12 sm:min-h-0" onClick={nextWeek}>
            ›
          </button>
          <button type="button" className="btn btn-ghost btn-lg sm:btn-sm min-h-12 sm:min-h-0" onClick={() => setAnchor(new Date())}>
            Today
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:ml-auto sm:items-center sm:gap-2">
          <select
            className="select select-bordered w-full min-h-12 text-base sm:select-sm sm:min-h-0 sm:w-48"
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
          >
            <option value="all">All staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary btn-lg w-full sm:btn-sm sm:w-auto" onClick={() => setNewAppt({})}>
            + Appointment
          </button>
        </div>
      </div>

      {/* Mobile: stacked day cards + tap slots */}
      <div className="sm:hidden flex-1 overflow-y-auto p-4 pb-28 space-y-5">
        {weekDates.map((date, di) => {
          const isToday = formatDate(date) === formatDate(new Date());
          const dayAppts = getApptsForDay(date);
          const dateStr = formatDate(date);
          return (
            <section key={di} className="card bg-base-100 card-border shadow-sm">
              <div className={`card-body p-4 gap-3 ${isToday ? "bg-primary/5" : ""}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-bold text-lg">
                    {DAYS[(di + 1) % 7]} {date.getDate()}
                  </h2>
                  {isToday ? <span className="badge badge-primary badge-lg">Today</span> : null}
                </div>
                {dayAppts.length > 0 ? (
                  <ul className="space-y-2">
                    {dayAppts.map((appt) => (
                      <li key={appt.id} className="rounded-xl bg-primary text-primary-content px-4 py-3">
                        <p className="font-semibold text-base">
                          {new Date(appt.starts_at).toLocaleTimeString("en-US", { timeStyle: "short" })} — {appt.client_name}
                        </p>
                        <p className="text-sm opacity-90 mt-1">{appt.services?.name}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-base-content/50">No appointments</p>
                )}
                <p className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Add at…</p>
                <div className="flex flex-col gap-2">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className="btn btn-ghost btn-lg justify-start border border-base-300 min-h-14 text-base font-normal"
                      onClick={() => setNewAppt({ date: dateStr, hour: h })}
                    >
                      {formatHourLabel(h)}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Desktop: week grid */}
      <div className="hidden sm:flex flex-1 overflow-auto">
        <div className="w-14 flex-none border-r border-base-300">
          <div className="h-10" />
          {HOURS.map((h) => (
            <div key={h} className="h-[60px] flex items-start justify-end pr-2 pt-1">
              <span className="text-xs text-base-content/40">
                {h % 12 || 12}
                {h < 12 ? "am" : "pm"}
              </span>
            </div>
          ))}
        </div>

        {weekDates.map((date, di) => {
          const isToday = formatDate(date) === formatDate(new Date());
          const dayAppts = getApptsForDay(date);
          return (
            <div key={di} className="flex-1 border-r border-base-300 min-w-[100px]">
              <div
                className={`h-10 flex flex-col items-center justify-center border-b border-base-300 ${isToday ? "bg-primary/10" : ""}`}
              >
                <span className="text-xs text-base-content/50">{DAYS[(di + 1) % 7]}</span>
                <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{date.getDate()}</span>
              </div>
              <div className="relative">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="h-[60px] w-full border-b border-base-300/50 cursor-pointer hover:bg-base-200/50 text-left"
                    onClick={() => setNewAppt({ date: formatDate(date), hour: h })}
                  />
                ))}
                {dayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="absolute left-1 right-1 bg-primary text-primary-content rounded text-xs px-1 py-0.5 overflow-hidden cursor-default"
                    style={getApptStyle(appt)}
                  >
                    <div className="font-medium truncate">{appt.client_name}</div>
                    <div className="opacity-80 truncate">{appt.services?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {newAppt && (
        <div className="modal modal-open">
          <div className="modal-box w-[calc(100vw-1.5rem)] max-w-lg p-4 sm:p-6">
            <h3 className="font-bold text-lg mb-1">Quick add appointment</h3>
            <p className="text-sm text-base-content/60 mb-4">Creates a confirmed block on the calendar for your salon.</p>
            <form className="space-y-4" onSubmit={submitQuickAdd}>
              <label className="form-control w-full">
                <span className="label-text font-medium">Client name</span>
                <input
                  className="input input-bordered w-full min-h-12 text-base"
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Phone</span>
                <input
                  className="input input-bordered w-full min-h-12 text-base"
                  value={form.client_phone}
                  onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Email</span>
                <input
                  type="email"
                  className="input input-bordered w-full min-h-12 text-base"
                  value={form.client_email}
                  onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Staff</span>
                <select
                  className="select select-bordered w-full min-h-12 text-base"
                  value={form.staff_id}
                  onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Service</span>
                <select
                  className="select select-bordered w-full min-h-12 text-base"
                  value={form.service_id}
                  onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes}m)
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Starts</span>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full min-h-12 text-base"
                  value={form.starts_local}
                  onChange={(e) => setForm((f) => ({ ...f, starts_local: e.target.value }))}
                  required
                />
              </label>
              <p className="text-xs text-base-content/50">
                Ends automatically based on the service duration ({selectedService?.duration_minutes ?? "—"} min).
              </p>
              <div className="modal-action flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="button" className="btn btn-lg w-full sm:w-auto" onClick={closeModal}>
                  Cancel
                </button>
                {salonSlug ? (
                  <a
                    href={`/booking/${salonSlug}`}
                    className="btn btn-outline btn-lg w-full sm:w-auto"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public booking
                  </a>
                ) : null}
                <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={saving}>
                  {saving ? <span className="loading loading-spinner loading-md" /> : "Save appointment"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeModal} onKeyDown={() => {}} role="presentation" />
        </div>
      )}
    </div>
  );
}
