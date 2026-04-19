"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function NewsletterPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: "", content_html: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/hair/newsletter");
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed to load");
      setCampaigns([]);
    } else setCampaigns(j.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.content_html.trim()) return;
    const r = await fetch("/api/hair/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.subject.trim(),
        content_html: form.content_html.trim(),
        recipient_count: 0,
      }),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Save failed");
    else {
      toast.success("Campaign saved");
      setForm({ subject: "", content_html: "" });
      load();
    }
  }

  async function removeCampaign(id) {
    if (!confirm("Delete this campaign draft?")) return;
    const r = await fetch(`/api/hair/newsletter?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Delete failed");
    else {
      toast.success("Removed");
      load();
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Newsletter</h1>
      <p className="text-base-content/60 mb-8">
        Build HTML campaigns for your client list. Sending integrates with Resend when configured.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card bg-base-200 card-border">
          <div className="card-body">
            <h2 className="card-title text-base">New campaign</h2>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="form-control w-full">
                <span className="label-text text-xs">Subject line</span>
                <input
                  className="input input-bordered input-sm w-full"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text text-xs">HTML body</span>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full font-mono text-xs min-h-[200px]"
                  placeholder="<p>Hi {{first_name}}, ...</p>"
                  value={form.content_html}
                  onChange={(e) => setForm((f) => ({ ...f, content_html: e.target.value }))}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary btn-sm">
                Save campaign
              </button>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 card-border">
          <div className="card-body p-0">
            <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
              <h2 className="font-semibold">Campaigns</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="p-12 flex justify-center">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : !campaigns.length ? (
              <p className="p-8 text-base-content/50 text-sm">No campaigns yet.</p>
            ) : (
              <ul className="divide-y divide-base-200 max-h-[480px] overflow-y-auto">
                {campaigns.map((c) => (
                  <li key={c.id} className="px-6 py-4">
                    <div className="flex justify-between gap-2 items-start">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.subject}</p>
                        <p className="text-xs text-base-content/50 mt-1 line-clamp-2 font-mono">{c.content_html}</p>
                        <p className="text-xs text-base-content/40 mt-2">
                          {c.sent_at ? `Sent ${new Date(c.sent_at).toLocaleDateString()}` : "Draft"}
                        </p>
                      </div>
                      <button type="button" className="btn btn-ghost btn-xs shrink-0" onClick={() => removeCampaign(c.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
