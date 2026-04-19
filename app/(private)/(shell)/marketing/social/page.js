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
    <div className="p-4 pb-28 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Social scheduler</h1>
        <p className="text-base-content/60 text-sm sm:text-base">
          Draft posts, pick platforms, and schedule send times. Buffer connects from Settings.
        </p>
      </div>

      <div className="card bg-base-200 card-border">
        <div className="card-body gap-4">
          <h2 className="card-title text-base">Compose</h2>
          <textarea
            className="textarea textarea-bordered w-full min-h-[160px] text-base"
            placeholder="What are you posting?"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div>
            <p className="text-sm font-medium text-base-content/70 mb-3">Platforms</p>
            <div className="flex flex-col gap-3">
              {PLATFORMS.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 cursor-pointer min-h-14 px-3 py-3 rounded-lg bg-base-100 border border-base-300 active:bg-base-200/80"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-lg shrink-0"
                    checked={form.platforms.includes(p.id)}
                    onChange={() => togglePlatform(p.id)}
                  />
                  <span className="text-base font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="form-control w-full">
            <span className="label-text font-medium">Schedule for</span>
            <input
              type="datetime-local"
              className="input input-bordered w-full min-h-12 text-base"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => savePost("scheduled")}>
              Schedule
            </button>
            <button type="button" className="btn btn-outline btn-lg flex-1 border-base-300" onClick={() => savePost("draft")}>
              Save draft
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 card-border">
        <div className="card-body p-0">
          <div className="px-4 py-4 sm:px-6 border-b border-base-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-lg">Queue</h2>
            <button type="button" className="btn btn-ghost btn-lg sm:btn-md w-full sm:w-auto" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : !posts.length ? (
            <p className="p-6 text-base-content/50 text-center text-sm">No posts yet.</p>
          ) : (
            <ul className="divide-y divide-base-200">
              {posts.map((p) => (
                <li key={p.id} className="p-4 flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-base whitespace-pre-wrap leading-relaxed">{p.content}</p>
                    <p className="text-sm text-base-content/50 mt-3 leading-snug">
                      {(p.platforms || []).join(", ")} · {p.status}
                      {p.scheduled_at ? ` · ${formatLocal(p.scheduled_at)}` : ""}
                    </p>
                  </div>
                  <button type="button" className="btn btn-error btn-outline btn-lg w-full sm:w-auto sm:btn-md" onClick={() => removePost(p.id)}>
                    Remove post
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
