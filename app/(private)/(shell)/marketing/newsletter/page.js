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
    <div className="p-4 pb-28 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Newsletter</h1>
        <p className="text-base-content/60 text-sm sm:text-base">
          Build HTML campaigns for your client list. Sending integrates with Resend when configured.
        </p>
      </div>

      <div className="card bg-base-200 card-border">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">New campaign</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="form-control w-full">
              <span className="label-text font-medium">Subject line</span>
              <input
                className="input input-bordered w-full min-h-12 text-base"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text font-medium">HTML body</span>
              <textarea
                className="textarea textarea-bordered w-full font-mono text-sm min-h-[200px] sm:min-h-[240px]"
                placeholder="<p>Hi {{first_name}}, ...</p>"
                value={form.content_html}
                onChange={(e) => setForm((f) => ({ ...f, content_html: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary btn-lg w-full">
              Save campaign
            </button>
          </form>
        </div>
      </div>

      <div className="card bg-base-100 card-border">
        <div className="card-body p-0">
          <div className="px-4 py-4 sm:px-6 border-b border-base-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-lg">Campaigns</h2>
            <button type="button" className="btn btn-ghost btn-lg sm:btn-md w-full sm:w-auto" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : !campaigns.length ? (
            <p className="p-6 text-base-content/50 text-center text-sm">No campaigns yet.</p>
          ) : (
            <ul className="divide-y divide-base-200 max-h-[min(70vh,560px)] overflow-y-auto">
              {campaigns.map((c) => (
                <li key={c.id} className="p-4 flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-lg leading-snug">{c.subject}</p>
                    <p className="text-xs text-base-content/50 mt-2 line-clamp-3 font-mono break-words">{c.content_html}</p>
                    <p className="text-sm text-base-content/40 mt-2">
                      {c.sent_at ? `Sent ${new Date(c.sent_at).toLocaleDateString()}` : "Draft"}
                    </p>
                    {c.sent_at && c.open_rate_pct != null ? (
                      <div className="flex flex-wrap gap-3 mt-3">
                        <div className="stat bg-base-200 rounded-xl px-4 py-2 min-w-0 flex-1">
                          <div className="stat-title text-xs">Open rate</div>
                          <div className="stat-value text-lg text-primary">{c.open_rate_pct}%</div>
                        </div>
                        <div className="stat bg-base-200 rounded-xl px-4 py-2 min-w-0 flex-1">
                          <div className="stat-title text-xs">Click rate</div>
                          <div className="stat-value text-lg">{c.click_rate_pct ?? "—"}%</div>
                        </div>
                        <div className="stat bg-base-200 rounded-xl px-4 py-2 min-w-0 flex-1">
                          <div className="stat-title text-xs">Sent to</div>
                          <div className="stat-value text-lg">{c.recipient_count || "—"}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn-error btn-outline btn-lg w-full sm:w-auto sm:btn-md"
                    onClick={() => removeCampaign(c.id)}
                  >
                    Delete campaign
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
