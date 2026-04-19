"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/hair/clients");
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed to load clients");
      setClients([]);
    } else setClients(j.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const r = await fetch("/api/hair/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Save failed");
    else {
      toast.success("Client saved");
      setForm({ name: "", email: "", phone: "", notes: "" });
      load();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this client?")) return;
    const r = await fetch(`/api/hair/clients?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Delete failed");
    else {
      toast.success("Removed");
      load();
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Clients</h1>
      <p className="text-base-content/60 mb-8">Manage your client list and notes for follow-ups.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="card bg-base-200 card-border">
            <div className="card-body">
              <h2 className="card-title text-base">Add client</h2>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <label className="form-control w-full">
                  <span className="label-text text-xs">Name</span>
                  <input
                    className="input input-bordered input-sm w-full"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text text-xs">Email</span>
                  <input
                    type="email"
                    className="input input-bordered input-sm w-full"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text text-xs">Phone</span>
                  <input
                    className="input input-bordered input-sm w-full"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text text-xs">Notes</span>
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </label>
                <button type="submit" className="btn btn-primary btn-sm w-full">
                  Save client
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card bg-base-100 card-border">
            <div className="card-body p-0">
              <div className="px-6 py-4 border-b border-base-300 flex items-center justify-between">
                <h2 className="font-semibold">Directory</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 flex justify-center">
                    <span className="loading loading-spinner loading-md" />
                  </div>
                ) : !clients.length ? (
                  <p className="p-8 text-base-content/50 text-sm">No clients yet. Add your first client on the left.</p>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Visits</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c) => (
                        <tr key={c.id}>
                          <td className="font-medium">{c.name}</td>
                          <td className="text-xs text-base-content/70">
                            {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td>{c.visit_count ?? 0}</td>
                          <td className="text-right">
                            <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(c.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
