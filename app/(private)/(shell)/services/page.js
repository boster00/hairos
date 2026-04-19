"use client";
import { useState, useEffect } from "react";
import ComingSoonBanner from "@/components/hairos/ComingSoonBanner";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/salon?action=read_services").then(r => r.json()).then(({ data }) => setServices(data || []));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write_service", data: editing }),
    }).then(r => r.json());
    setSaving(false);
    if (res.data) {
      setServices(prev => editing.id ? prev.map(s => s.id === editing.id ? res.data : s) : [...prev, res.data]);
      setEditing(null);
    }
  }

  return (
    <div className="p-8">
      <ComingSoonBanner />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ name: "", duration_minutes: 60, price_cents: 5000, description: "" })}>+ Add service</button>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Service</th><th>Duration</th><th>Price</th><th /></tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="font-medium">{s.name}</div>
                  {s.description && <div className="text-xs text-base-content/50">{s.description}</div>}
                </td>
                <td>{s.duration_minutes} min</td>
                <td>${(s.price_cents / 100).toFixed(0)}</td>
                <td>
                  <button className="btn btn-ghost btn-xs" onClick={() => setEditing(s)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{editing.id ? "Edit" : "Add"} Service</h3>
            <div className="space-y-3">
              <input className="input input-bordered w-full" placeholder="Service name" value={editing.name}
                onChange={e => setEditing(x => ({ ...x, name: e.target.value }))} />
              <textarea className="textarea textarea-bordered w-full" placeholder="Description (optional)" value={editing.description || ""}
                onChange={e => setEditing(x => ({ ...x, description: e.target.value }))} />
              <div className="flex gap-3">
                <label className="flex-1">
                  <div className="text-sm mb-1">Duration (minutes)</div>
                  <input className="input input-bordered w-full" type="number" value={editing.duration_minutes}
                    onChange={e => setEditing(x => ({ ...x, duration_minutes: +e.target.value }))} />
                </label>
                <label className="flex-1">
                  <div className="text-sm mb-1">Price ($)</div>
                  <input className="input input-bordered w-full" type="number" value={editing.price_cents / 100}
                    onChange={e => setEditing(x => ({ ...x, price_cents: +e.target.value * 100 }))} />
                </label>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !editing.name} onClick={save}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : "Save"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditing(null)} />
        </div>
      )}
    </div>
  );
}
