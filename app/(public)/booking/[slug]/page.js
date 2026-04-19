"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function BookingPage() {
  const { slug } = useParams();
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [step, setStep] = useState("service"); // service → staff → date → confirm → done
  const [selection, setSelection] = useState({ serviceId: null, staffId: null, date: null, slot: null });
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ client_name: "", client_email: "", client_phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/booking/${slug}?action=read_salon`)
      .then(r => r.json())
      .then(({ data }) => { setSalon(data.salon); setServices(data.services || []); setStaff(data.staff || []); });
  }, [slug]);

  async function loadSlots(date) {
    const params = new URLSearchParams({ action: "read_slots", serviceId: selection.serviceId, date });
    if (selection.staffId) params.set("staffId", selection.staffId);
    const { data } = await fetch(`/api/booking/${slug}?${params}`).then(r => r.json());
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
    const { data, error } = await fetch(`/api/booking/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
    setLoading(false);
    if (!error) setStep("done");
  }

  if (!salon) return <div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner" /></div>;

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-1">{salon.name}</h1>
        <p className="text-base-content/60 mb-8">Book an appointment</p>

        {step === "service" && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg mb-3">Choose a service</h2>
            {services.map(s => (
              <button key={s.id} className="btn btn-outline w-full justify-between"
                onClick={() => { setSelection(sel => ({ ...sel, serviceId: s.id })); setStep("staff"); }}>
                <span>{s.name}</span>
                <span className="text-base-content/50">{s.duration_minutes}min · ${(s.price_cents / 100).toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}

        {step === "staff" && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg mb-3">Choose a stylist</h2>
            <button className="btn btn-outline w-full" onClick={() => setStep("date")}>Anyone available</button>
            {staff.map(s => (
              <button key={s.id} className="btn btn-outline w-full"
                onClick={() => { setSelection(sel => ({ ...sel, staffId: s.id })); setStep("date"); }}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        {step === "date" && (
          <div>
            <h2 className="font-semibold text-lg mb-3">Pick a date</h2>
            <input type="date" className="input input-bordered w-full mb-4"
              min={new Date().toISOString().split("T")[0]}
              onChange={async e => { setSelection(sel => ({ ...sel, date: e.target.value })); await loadSlots(e.target.value); }} />
            {slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {slots.map((slot, i) => (
                  <button key={i} className="btn btn-sm btn-outline"
                    onClick={() => { setSelection(sel => ({ ...sel, slot })); setStep("confirm"); }}>
                    {new Date(slot.startsAt).toLocaleTimeString("en-US", { timeStyle: "short" })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg mb-3">Your details</h2>
            <input className="input input-bordered w-full" placeholder="Full name" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
            <input className="input input-bordered w-full" placeholder="Phone" type="tel" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
            <input className="input input-bordered w-full" placeholder="Email (optional)" type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
            <button className="btn btn-primary w-full mt-2" onClick={book} disabled={loading || !form.client_name || !form.client_phone}>
              {loading ? <span className="loading loading-spinner" /> : "Confirm booking"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">You&apos;re booked!</h2>
            <p className="text-base-content/60">Check your phone for a confirmation text.</p>
          </div>
        )}
      </div>
    </div>
  );
}
