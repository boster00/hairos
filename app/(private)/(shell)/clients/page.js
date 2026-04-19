"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ComingSoonBanner from "@/components/hairos/ComingSoonBanner";

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
    <div className="p-4 pb-28 sm:p-8 max-w-5xl mx-auto space-y-6">
      <ComingSoonBanner />
      <div>
        <h1 className="text-2xl font-bold mb-1">Clients</h1>
        <p className="text-base-content/60 text-sm sm:text-base">Manage your client list and notes for follow-ups.</p>
      </div>

      <div className="card bg-base-200 card-border">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Add client</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="form-control w-full">
              <span className="label-text font-medium">Name</span>
              <input
                className="input input-bordered w-full min-h-12 text-base"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text font-medium">Email</span>
              <input
                type="email"
                className="input input-bordered w-full min-h-12 text-base"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text font-medium">Phone</span>
              <input
                className="input input-bordered w-full min-h-12 text-base"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text font-medium">Notes</span>
              <textarea
                className="textarea textarea-bordered w-full min-h-[120px] text-base"
                rows={4}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn btn-primary btn-lg w-full">
              Save client
            </button>
          </form>
        </div>
      </div>

      <div className="card bg-base-100 card-border">
        <div className="card-body p-0">
          <div className="px-4 py-4 sm:px-6 border-b border-base-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-lg">Directory</h2>
            <button type="button" className="btn btn-ghost btn-lg sm:btn-md w-full sm:w-auto" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>

          <div className="p-4 sm:p-0">
            {loading ? (
              <div className="py-12 flex justify-center">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : !clients.length ? (
              <p className="py-8 text-base-content/50 text-center text-sm">No clients yet. Add one above.</p>
            ) : (
              <>
                <ul className="sm:hidden space-y-3">
                  {clients.map((c) => (
                    <li key={c.id} className="card bg-base-200 card-border">
                      <div className="card-body p-4 gap-3">
                        <div>
                          <p className="font-semibold text-lg">{c.name}</p>
                          <p className="text-sm text-base-content/70 mt-1">
                            {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact on file"}
                          </p>
                          <p className="text-sm text-base-content/50 mt-2">Visits: {c.visit_count ?? 0}</p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-error btn-lg btn-outline w-full"
                          onClick={() => handleDelete(c.id)}
                        >
                          Remove client
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="table table-lg">
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
                          <td className="text-sm text-base-content/70">
                            {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td>{c.visit_count ?? 0}</td>
                          <td className="text-right">
                            <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(c.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
