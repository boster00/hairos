"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
];

function formatLocal(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return dt;
  }
}

export default function SocialSchedulerPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    content: "",
    platforms: ["instagram"],
    scheduled_at: "",
  });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/hair/social");
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed to load");
      setPosts([]);
    } else setPosts(j.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function togglePlatform(id) {
    setForm((f) => {
      const set = new Set(f.platforms);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      const platforms = [...set];
      if (!platforms.length) platforms.push(id);
      return { ...f, platforms };
    });
  }

  async function savePost(status) {
    if (!form.content.trim()) {
      toast.error("Write something for your post");
      return;
    }
    const scheduled_at = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;
    const r = await fetch("/api/hair/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: form.content.trim(),
        platforms: form.platforms,
        scheduled_at,
        status: status === "scheduled" && scheduled_at ? "scheduled" : "draft",
      }),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Save failed");
    else {
      toast.success(status === "scheduled" ? "Post scheduled" : "Draft saved");
      setForm({ content: "", platforms: ["instagram"], scheduled_at: "" });
      load();
    }
  }

  async function removePost(id) {
    if (!confirm("Delete this post?")) return;
    const r = await fetch(`/api/hair/social?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Delete failed");
    else {
      toast.success("Deleted");
      load();
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Social scheduler</h1>
      <p className="text-base-content/60 mb-8">
        Draft posts, pick platforms, and schedule send times. Buffer integration connects from Settings.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="card bg-base-200 card-border">
            <div className="card-body gap-3">
              <h2 className="card-title text-base">Compose</h2>
              <textarea
                className="textarea textarea-bordered w-full min-h-[140px]"
                placeholder="What are you posting?"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
              <div>
                <p className="text-xs font-medium text-base-content/60 mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <label key={p.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm mr-1"
                        checked={form.platforms.includes(p.id)}
                        onChange={() => togglePlatform(p.id)}
                      />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="form-control w-full">
                <span className="label-text text-xs">Schedule for</span>
                <input
                  type="datetime-local"
                  className="input input-bordered input-sm w-full"
                  value={form.scheduled_at}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => savePost("scheduled")}>
                  Schedule
                </button>
                <button type="button" className="btn btn-ghost btn-sm border border-base-300" onClick={() => savePost("draft")}>
                  Save draft
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card bg-base-100 card-border">
            <div className="card-body p-0">
              <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
                <h2 className="font-semibold">Queue</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                  Refresh
                </button>
              </div>
              {loading ? (
                <div className="p-12 flex justify-center">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : !posts.length ? (
                <p className="p-8 text-base-content/50 text-sm">No posts yet.</p>
              ) : (
                <ul className="divide-y divide-base-200">
                  {posts.map((p) => (
                    <li key={p.id} className="px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                        <p className="text-xs text-base-content/50 mt-2">
                          {(p.platforms || []).join(", ")} · {p.status}
                          {p.scheduled_at ? ` · ${formatLocal(p.scheduled_at)}` : ""}
                        </p>
                      </div>
                      <button type="button" className="btn btn-ghost btn-xs shrink-0" onClick={() => removePost(p.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
