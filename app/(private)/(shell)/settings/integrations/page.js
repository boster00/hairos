"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function IntegrationsPage() {
  const [tab, setTab] = useState("integrations");
  const [status, setStatus] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  async function loadIntegrations() {
    const r = await fetch("/api/hair/integrations");
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed to load integrations");
    else setStatus(j.data);
  }

  async function loadTemplates() {
    const r = await fetch("/api/hairos/email-templates");
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed to load templates");
    else setTemplates(j.data || []);
  }

  useEffect(() => {
    loadIntegrations();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    (async () => {
      const r = await fetch(`/api/hairos/email-templates?id=${encodeURIComponent(selectedId)}`);
      const j = await r.json();
      if (r.ok) setDetail(j.data);
    })();
  }, [selectedId]);

  async function connectGoogle() {
    const r = await fetch("/api/hair/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connect_google: true }),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed");
    else {
      setStatus(j.data);
      toast.success("Google Calendar connected (demo)");
    }
  }

  async function connectBuffer() {
    const r = await fetch("/api/hair/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connect_buffer: true }),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed");
    else {
      setStatus(j.data);
      toast.success("Buffer connected (demo)");
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <Link href="/settings">Settings</Link>
          </li>
          <li>Integrations</li>
        </ul>
      </div>

      <h1 className="text-2xl font-bold mb-1">Integrations & email</h1>
      <p className="text-base-content/60 mb-6">Connect third-party tools and review transactional email HTML.</p>

      <div role="tablist" className="tabs tabs-boxed w-fit mb-6">
        <button type="button" role="tab" className={`tab ${tab === "integrations" ? "tab-active" : ""}`} onClick={() => setTab("integrations")}>
          Integrations
        </button>
        <button type="button" role="tab" className={`tab ${tab === "templates" ? "tab-active" : ""}`} onClick={() => setTab("templates")}>
          Email HTML templates
        </button>
      </div>

      {tab === "integrations" && (
        <div className="space-y-4">
          {!status ? (
            <span className="loading loading-spinner loading-md" />
          ) : (
            <>
              <div className="card bg-base-100 card-border">
                <div className="card-body flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Google Calendar</h2>
                    <p className="text-sm text-base-content/60">Sync appointments to your team calendar.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${status.google_calendar?.connected ? "badge-success" : "badge-ghost"}`}>
                      {status.google_calendar?.connected ? "Connected" : "Not connected"}
                    </span>
                    {!status.google_calendar?.connected && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={connectGoogle}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card bg-base-100 card-border">
                <div className="card-body flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Buffer</h2>
                    <p className="text-sm text-base-content/60">Schedule social posts from the marketing queue.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${status.buffer?.connected ? "badge-success" : "badge-ghost"}`}>
                      {status.buffer?.connected ? "Connected" : "Not connected"}
                    </span>
                    {!status.buffer?.connected && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={connectBuffer}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card bg-base-100 card-border">
                <div className="card-body flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Resend</h2>
                    <p className="text-sm text-base-content/60">Transactional and newsletter delivery.</p>
                  </div>
                  <span className={`badge shrink-0 ${status.resend?.configured ? "badge-success" : "badge-warning"}`}>
                    {status.resend?.configured ? "API key set" : "Configure env"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            <p className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Templates</p>
            <ul className="menu bg-base-200 rounded-box">
              {templates.map((t) => (
                <li key={t.id}>
                  <button type="button" className={selectedId === t.id ? "active" : ""} onClick={() => setSelectedId(t.id)}>
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            {!detail ? (
              <p className="text-sm text-base-content/50">Select a template to preview HTML and placeholders.</p>
            ) : (
              <div className="card bg-base-100 card-border">
                <div className="card-body gap-3">
                  <h2 className="card-title text-base">{detail.name}</h2>
                  <p className="text-sm text-base-content/60">{detail.description}</p>
                  <p className="text-xs font-mono text-base-content/50">Subject: {detail.subject}</p>
                  <div className="border border-base-300 rounded-lg overflow-hidden bg-base-200">
                    <iframe
                      title="preview"
                      className="w-full h-[360px] bg-white"
                      srcDoc={detail.html}
                      sandbox="allow-same-origin"
                    />
                  </div>
                  <details className="collapse collapse-arrow bg-base-200 rounded-box">
                    <summary className="collapse-title text-sm font-medium">Raw HTML</summary>
                    <div className="collapse-content">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap p-2 max-h-48 overflow-y-auto">{detail.html}</pre>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
