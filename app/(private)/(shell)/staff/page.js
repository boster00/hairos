"use client";
import { useState, useEffect } from "react";

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/salon?action=read_staff").then(r => r.json()).then(({ data }) => setStaff(data || []));
    fetch("/api/salon?action=read_services").then(r => r.json()).then(({ data }) => setServices(data || []));
  }, []);

  function openNew() {
    setEditing({ name: "", role: "stylist", email: "", phone: "", serviceIds: [] });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write_staff", data: editing, serviceIds: editing.serviceIds }),
    }).then(r => r.json());
    setSaving(false);
    if (res.data) {
      setStaff(prev => editing.id ? prev.map(s => s.id === editing.id ? res.data : s) : [...prev, res.data]);
      setEditing(null);
    }
  }

  async function deactivate(id) {
    await fetch("/api/salon", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_staff", staffId: id }) });
    setStaff(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staff</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add stylist</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s.id} className="card bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-10">
                    <span>{s.name[0]}</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-base-content/50 capitalize">{s.role}</div>
                </div>
              </div>
              {s.email && <div className="text-sm text-base-content/60">{s.email}</div>}
              {s.phone && <div className="text-sm text-base-content/60">{s.phone}</div>}
              <div className="card-actions justify-end mt-2">
                <button className="btn btn-ghost btn-xs" onClick={() => setEditing({ ...s, serviceIds: s.staff_services?.map(ss => ss.service_id) || [] })}>Edit</button>
                <button className="btn btn-ghost btn-xs text-error" onClick={() => deactivate(s.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{editing.id ? "Edit" : "Add"} Stylist</h3>
            <div className="space-y-3">
              <input className="input input-bordered w-full" placeholder="Name" value={editing.name}
                onChange={e => setEditing(x => ({ ...x, name: e.target.value }))} />
              <input className="input input-bordered w-full" placeholder="Email" value={editing.email || ""}
                onChange={e => setEditing(x => ({ ...x, email: e.target.value }))} />
              <input className="input input-bordered w-full" placeholder="Phone" value={editing.phone || ""}
                onChange={e => setEditing(x => ({ ...x, phone: e.target.value }))} />
              <select className="select select-bordered w-full" value={editing.role}
                onChange={e => setEditing(x => ({ ...x, role: e.target.value }))}>
                <option value="owner">Owner</option>
                <option value="stylist">Stylist</option>
              </select>
              <div>
                <div className="text-sm font-medium mb-2">Services they perform</div>
                <div className="flex flex-wrap gap-2">
                  {services.map(svc => (
                    <label key={svc.id} className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" className="checkbox checkbox-sm"
                        checked={editing.serviceIds?.includes(svc.id)}
                        onChange={e => setEditing(x => ({
                          ...x,
                          serviceIds: e.target.checked ? [...(x.serviceIds || []), svc.id] : (x.serviceIds || []).filter(id => id !== svc.id)
                        }))} />
                      <span className="text-sm">{svc.name}</span>
                    </label>
                  ))}
                </div>
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
