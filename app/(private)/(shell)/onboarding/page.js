"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_HOURS = [
  { day: 0, label: "Sun", enabled: false, start: "09:00", end: "17:00" },
  { day: 1, label: "Mon", enabled: true, start: "09:00", end: "18:00" },
  { day: 2, label: "Tue", enabled: true, start: "09:00", end: "18:00" },
  { day: 3, label: "Wed", enabled: true, start: "09:00", end: "18:00" },
  { day: 4, label: "Thu", enabled: true, start: "09:00", end: "18:00" },
  { day: 5, label: "Fri", enabled: true, start: "09:00", end: "18:00" },
  { day: 6, label: "Sat", enabled: true, start: "10:00", end: "16:00" },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [salon, setSalon] = useState({ name: "", phone: "", address: "", timezone: "America/Los_Angeles", slug: "" });
  const [staffList, setStaffList] = useState([{ name: "", role: "owner" }]);
  const [serviceList, setServiceList] = useState([{ name: "Haircut", duration_minutes: 60, price_cents: 5000 }]);
  const [hours, setHours] = useState(DEFAULT_HOURS);

  async function finish() {
    setSaving(true);
    const salonRes = await fetch("/api/salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write_salon", data: { ...salon, slug: salon.slug || slugify(salon.name) } }),
    }).then(r => r.json());

    const salonId = salonRes.data?.id;
    if (!salonId) { setSaving(false); alert("Failed to save salon"); return; }

    for (const s of staffList.filter(s => s.name)) {
      await fetch("/api/salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write_staff", data: { ...s, salon_id: salonId } }),
      });
    }

    for (const s of serviceList.filter(s => s.name)) {
      await fetch("/api/salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write_service", data: { ...s, salon_id: salonId } }),
      });
    }

    const staffRes = await fetch("/api/salon?action=read_staff").then(r => r.json());
    const firstStaff = staffRes.data?.[0];
    if (firstStaff) {
      const rules = hours.filter(h => h.enabled).map(h => ({ day_of_week: h.day, start_time: h.start, end_time: h.end }));
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write_availability_rules", staffId: firstStaff.id, rules }),
      });
    }

    router.push("/dashboard");
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <ul className="steps steps-horizontal w-full mb-8">
        {["Salon", "Staff", "Services", "Hours"].map((label, i) => (
          <li key={i} className={`step ${i <= step ? "step-primary" : ""}`}>{label}</li>
        ))}
      </ul>

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Tell us about your salon</h2>
          <input className="input input-bordered w-full" placeholder="Salon name" value={salon.name}
            onChange={e => setSalon(s => ({ ...s, name: e.target.value, slug: slugify(e.target.value) }))} />
          <div className="flex gap-2 items-center">
            <span className="text-sm text-base-content/50 whitespace-nowrap">hairos.app/booking/</span>
            <input className="input input-bordered flex-1" placeholder="your-salon" value={salon.slug}
              onChange={e => setSalon(s => ({ ...s, slug: e.target.value }))} />
          </div>
          <input className="input input-bordered w-full" placeholder="Phone number" value={salon.phone}
            onChange={e => setSalon(s => ({ ...s, phone: e.target.value }))} />
          <input className="input input-bordered w-full" placeholder="Address" value={salon.address}
            onChange={e => setSalon(s => ({ ...s, address: e.target.value }))} />
          <select className="select select-bordered w-full" value={salon.timezone}
            onChange={e => setSalon(s => ({ ...s, timezone: e.target.value }))}>
            <option value="America/Los_Angeles">Pacific (LA)</option>
            <option value="America/Denver">Mountain (Denver)</option>
            <option value="America/Chicago">Central (Chicago)</option>
            <option value="America/New_York">Eastern (New York)</option>
          </select>
          <button className="btn btn-primary w-full" disabled={!salon.name} onClick={() => setStep(1)}>Next</button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Add your stylists</h2>
          {staffList.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input className="input input-bordered flex-1" placeholder="Stylist name" value={s.name}
                onChange={e => setStaffList(list => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <select className="select select-bordered w-32" value={s.role}
                onChange={e => setStaffList(list => list.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
                <option value="owner">Owner</option>
                <option value="stylist">Stylist</option>
              </select>
              {staffList.length > 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setStaffList(list => list.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setStaffList(l => [...l, { name: "", role: "stylist" }])}>+ Add stylist</button>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-ghost flex-1" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary flex-1" disabled={!staffList.some(s => s.name)} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Add your services</h2>
          {serviceList.map((s, i) => (
            <div key={i} className="flex gap-2 items-center flex-wrap">
              <input className="input input-bordered flex-1 min-w-32" placeholder="Service name" value={s.name}
                onChange={e => setServiceList(list => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="input input-bordered w-20" placeholder="Min" type="number" value={s.duration_minutes}
                onChange={e => setServiceList(list => list.map((x, j) => j === i ? { ...x, duration_minutes: +e.target.value } : x))} />
              <div className="flex items-center gap-1">
                <span className="text-sm">$</span>
                <input className="input input-bordered w-20" type="number" value={s.price_cents / 100}
                  onChange={e => setServiceList(list => list.map((x, j) => j === i ? { ...x, price_cents: +e.target.value * 100 } : x))} />
              </div>
              {serviceList.length > 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setServiceList(list => list.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setServiceList(l => [...l, { name: "", duration_minutes: 60, price_cents: 5000 }])}>+ Add service</button>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-ghost flex-1" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary flex-1" disabled={!serviceList.some(s => s.name)} onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Set your hours</h2>
          {hours.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <input type="checkbox" className="checkbox" checked={h.enabled}
                onChange={e => setHours(list => list.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} />
              <span className="w-8 text-sm font-medium">{h.label}</span>
              {h.enabled ? (
                <>
                  <input type="time" className="input input-bordered input-sm" value={h.start}
                    onChange={e => setHours(list => list.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} />
                  <span className="text-sm">–</span>
                  <input type="time" className="input input-bordered input-sm" value={h.end}
                    onChange={e => setHours(list => list.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} />
                </>
              ) : (
                <span className="text-base-content/40 text-sm">Closed</span>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <button className="btn btn-ghost flex-1" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-primary flex-1" disabled={saving} onClick={finish}>
              {saving ? <span className="loading loading-spinner" /> : "Finish setup"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
