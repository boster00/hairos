"use client";

import { useEffect, useState } from "react";

export default function GoogleCalendarProofPage() {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/hair/google-cal-proof")
      .then((r) => r.json())
      .then((j) => {
        if (j.url) setUrl(j.url);
        else {
          setErr("no_event");
        }
      })
      .catch(() => setErr("fetch"));
  }, []);

  if (err === "no_event") {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-base-200 text-center gap-4">
        <p className="text-base-content/80 max-w-md">
          No Google Calendar event link yet. Connect Google in Settings, then book once on{" "}
          <a className="link link-primary" href="/booking/luxe-maya">
            /booking/luxe-maya
          </a>{" "}
          with a Google-connected salon, or set <code className="text-xs">HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL</code> in{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-base-300">
      <iframe title="Google Calendar event" src={url} className="w-full h-full border-0" />
    </div>
  );
}
