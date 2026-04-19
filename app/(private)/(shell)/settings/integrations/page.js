"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function IntegrationsEmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  async function loadTemplates() {
    const r = await fetch("/api/hairos/email-templates");
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed to load templates");
    else setTemplates(j.data || []);
  }

  useEffect(() => {
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

  return (
    <div className="p-4 pb-28 sm:p-8 max-w-4xl mx-auto">
      <div className="breadcrumbs text-sm mb-4">
        <ul>
          <li>
            <Link href="/settings">Settings</Link>
          </li>
          <li>Email templates</li>
        </ul>
      </div>

      <h1 className="text-2xl font-bold mb-1">Email HTML templates</h1>
      <p className="text-base-content/60 mb-6">
        Transactional layouts for booking and reminders. Integration connections (Vapi, Google, Buffer, SMS) live on the main{" "}
        <Link href="/settings" className="link link-primary">
          Settings
        </Link>{" "}
        page.
      </p>

      <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-4">
        <div className="md:col-span-1 space-y-3">
          <p className="text-xs font-medium text-base-content/50 uppercase tracking-wide">Templates</p>
          <ul className="menu bg-base-200 rounded-box p-2 gap-1 flex flex-col">
            {templates.map((t) => (
              <li key={t.id} className="w-full">
                <button
                  type="button"
                  className={`btn btn-ghost btn-lg w-full justify-start min-h-14 text-left font-normal ${selectedId === t.id ? "btn-active border border-base-300" : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2 min-w-0">
          {!detail ? (
            <p className="text-sm text-base-content/50 py-4">Select a template to preview HTML and placeholders.</p>
          ) : (
            <div className="card bg-base-100 card-border">
              <div className="card-body gap-4 p-4 sm:p-6">
                <h2 className="card-title text-base sm:text-lg">{detail.name}</h2>
                <p className="text-sm text-base-content/60 leading-relaxed">{detail.description}</p>
                <p className="text-xs font-mono text-base-content/50 break-all">Subject: {detail.subject}</p>
                <div className="border border-base-300 rounded-lg overflow-hidden bg-base-200 -mx-1 sm:mx-0">
                  <iframe title="preview" className="w-full h-[280px] sm:h-[360px] bg-white" srcDoc={detail.html} sandbox="allow-same-origin" />
                </div>
                <details className="collapse collapse-arrow bg-base-200 rounded-box">
                  <summary className="collapse-title text-sm font-medium min-h-12">Raw HTML</summary>
                  <div className="collapse-content">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap p-2 max-h-48 overflow-y-auto">{detail.html}</pre>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
