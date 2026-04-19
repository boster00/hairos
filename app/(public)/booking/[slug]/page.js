"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function BookingPage() {
  const { slug } = useParams();
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [step, setStep] = useState("service");
  const [selection, setSelection] = useState({ serviceId: null, staffId: null, date: null, slot: null });
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ client_name: "", client_email: "", client_phone: "" });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setLoadError(null);
    fetch(`/api/booking/${slug}?action=read_salon`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.data?.salon) {
          setLoadError("We could not find that salon booking page.");
          setSalon(false);
          return;
        }
        setSalon(j.data.salon);
        setServices(j.data.services || []);
        setStaff(j.data.staff || []);
      })
      .catch(() => {
        setLoadError("Something went wrong. Please try again.");
        setSalon(false);
      });
  }, [slug]);

  async function loadSlots(date) {
    const params = new URLSearchParams({ action: "read_slots", serviceId: selection.serviceId, date });
    if (selection.staffId) params.set("staffId", selection.staffId);
    const { data } = await fetch(`/api/booking/${slug}?${params}`).then((r) => r.json());
    setSlots(data || []);
  }

  async function book() {
    setLoading(true);
    const body = {
      staff_id: selection.slot.staffId,
      service_id: selection.serviceId,
      starts_at: selection.slot.startsAt,
      ends_at: selection.slot.endsAt,
      ...form,
    };
    const res = await fetch(`/api/booking/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.error) setStep("done");
  }

  if (salon === null)
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );

  if (salon === false)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-6 text-center">
        <h1 className="text-xl font-bold mb-2">Salon not found</h1>
        <p className="text-base-content/70 text-sm max-w-sm">{loadError || "Check the link or ask your stylist for an updated booking URL."}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100 flex flex-col py-8 px-4 pb-16">
      <div className="w-full max-w-md mx-auto">
        <p className="text-xs uppercase tracking-widest text-amber-700/80 font-semibold mb-1">Book online</p>
        <h1 className="text-3xl font-bold text-base-content mb-1 leading-tight">{salon.name}</h1>
        <p className="text-base-content/60 text-sm mb-8">Choose a service, stylist, and time — real-time availability.</p>

        {step === "service" && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg mb-2">Choose a service</h2>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn-lg btn-outline w-full justify-between h-auto min-h-16 py-3 normal-case text-left border-base-300"
                onClick={() => {
                  setSelection((sel) => ({ ...sel, serviceId: s.id }));
                  setStep("staff");
                }}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-base-content/50 text-sm shrink-0 ml-2">
                  {s.duration_minutes} min · ${(s.price_cents / 100).toFixed(0)}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "staff" && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg mb-2">Choose a stylist</h2>
            <button type="button" className="btn btn-lg btn-outline w-full min-h-14" onClick={() => setStep("date")}>
              First available
            </button>
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn-lg btn-outline w-full min-h-16 h-auto py-2 gap-3 normal-case"
                onClick={() => {
                  setSelection((sel) => ({ ...sel, staffId: s.id }));
                  setStep("date");
                }}
              >
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="avatar placeholder w-12 h-12 rounded-full bg-base-300 shrink-0" />
                )}
                <span className="flex-1 text-left font-medium">{s.name}</span>
              </button>
            ))}
            <button type="button" className="btn btn-ghost btn-lg w-full mt-2" onClick={() => setStep("service")}>
              Back
            </button>
          </div>
        )}

        {step === "date" && (
          <div>
            <h2 className="font-semibold text-lg mb-3">Pick a date</h2>
            <input
              type="date"
              className="input input-bordered input-lg w-full mb-4 min-h-14 text-base"
              min={new Date().toISOString().split("T")[0]}
              onChange={async (e) => {
                setSelection((sel) => ({ ...sel, date: e.target.value }));
                await loadSlots(e.target.value);
              }}
            />
            {slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn btn-outline btn-lg min-h-14 text-base"
                    onClick={() => {
                      setSelection((sel) => ({ ...sel, slot }));
                      setStep("confirm");
                    }}
                  >
                    {new Date(slot.startsAt).toLocaleTimeString("en-US", { timeStyle: "short" })}
                  </button>
                ))}
              </div>
            ) : selection.date ? (
              <p className="text-sm text-base-content/50">No open slots that day — try another date.</p>
            ) : null}
            <button type="button" className="btn btn-ghost btn-lg w-full mt-4" onClick={() => setStep("staff")}>
              Back
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg mb-2">Your details</h2>
            <input
              className="input input-bordered input-lg w-full min-h-14 text-base"
              placeholder="Full name"
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
            />
            <input
              className="input input-bordered input-lg w-full min-h-14 text-base"
              placeholder="Phone"
              type="tel"
              value={form.client_phone}
              onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
            />
            <input
              className="input input-bordered input-lg w-full min-h-14 text-base"
              placeholder="Email (recommended)"
              type="email"
              value={form.client_email}
              onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg w-full mt-2 min-h-14"
              onClick={book}
              disabled={loading || !form.client_name || !form.client_phone}
            >
              {loading ? <span className="loading loading-spinner loading-md" /> : "Confirm booking"}
            </button>
            <button type="button" className="btn btn-ghost btn-lg w-full" onClick={() => setStep("date")}>
              Back
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-10 card bg-base-100 card-border">
            <div className="card-body">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re booked!</h2>
              <p className="text-base-content/60 text-sm leading-relaxed">
                Maya&apos;s team will text you a confirmation. If you added email, you&apos;ll also see calendar details there.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
