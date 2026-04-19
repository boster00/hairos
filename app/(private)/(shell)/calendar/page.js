"use client";
import { useState, useEffect } from "react";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm
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

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffFilter, setStaffFilter] = useState("all");
  const [newAppt, setNewAppt] = useState(null); // { date, hour } for quick-add

  const weekDates = getWeekDates(anchor);
  const from = `${formatDate(weekDates[0])}T00:00:00Z`;
  const to = `${formatDate(weekDates[6])}T23:59:59Z`;

  useEffect(() => {
    fetch("/api/salon?action=read_staff").then(r => r.json()).then(({ data }) => setStaff(data || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ action: "read_appointments", from, to });
    if (staffFilter !== "all") params.set("staffId", staffFilter);
    fetch(`/api/appointments?${params}`).then(r => r.json()).then(({ data }) => setAppointments(data || []));
  }, [from, to, staffFilter]);

  function prevWeek() { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }
  function nextWeek() { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }

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
    return appointments.filter(a => a.starts_at.startsWith(dateStr));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-base-300">
        <button className="btn btn-ghost btn-sm" onClick={prevWeek}>‹</button>
        <span className="font-medium text-sm">
          {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
          {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={nextWeek}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
        <div className="ml-auto flex items-center gap-2">
          <select className="select select-bordered select-sm" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
            <option value="all">All staff</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setNewAppt({})}>+ Appointment</button>
        </div>
      </div>

      {/* Week grid */}
      <div className="flex flex-1 overflow-auto">
        {/* Time gutter */}
        <div className="w-14 flex-none border-r border-base-300">
          <div className="h-10" />
          {HOURS.map(h => (
            <div key={h} className="h-[60px] flex items-start justify-end pr-2 pt-1">
              <span className="text-xs text-base-content/40">{h % 12 || 12}{h < 12 ? "am" : "pm"}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, di) => {
          const isToday = formatDate(date) === formatDate(new Date());
          const dayAppts = getApptsForDay(date);
          return (
            <div key={di} className="flex-1 border-r border-base-300 min-w-[100px]">
              {/* Day header */}
              <div className={`h-10 flex flex-col items-center justify-center border-b border-base-300 ${isToday ? "bg-primary/10" : ""}`}>
                <span className="text-xs text-base-content/50">{DAYS[(di + 1) % 7]}</span>
                <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{date.getDate()}</span>
              </div>
              {/* Hour rows */}
              <div className="relative">
                {HOURS.map(h => (
                  <div key={h} className="h-[60px] border-b border-base-300/50 cursor-pointer hover:bg-base-200/50"
                    onClick={() => setNewAppt({ date: formatDate(date), hour: h })} />
                ))}
                {/* Appointments */}
                {dayAppts.map(appt => (
                  <div key={appt.id} className="absolute left-1 right-1 bg-primary text-primary-content rounded text-xs px-1 py-0.5 overflow-hidden cursor-pointer"
                    style={getApptStyle(appt)}>
                    <div className="font-medium truncate">{appt.client_name}</div>
                    <div className="opacity-80 truncate">{appt.services?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick-add modal */}
      {newAppt && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">New Appointment</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Use the public booking page to add appointments, or build the quick-add form here.
            </p>
            <div className="modal-action">
              <button className="btn" onClick={() => setNewAppt(null)}>Close</button>
              <a href={`/booking/${newAppt.salonSlug || ""}`} className="btn btn-primary" target="_blank">Open booking page</a>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setNewAppt(null)} />
        </div>
      )}
    </div>
  );
}
