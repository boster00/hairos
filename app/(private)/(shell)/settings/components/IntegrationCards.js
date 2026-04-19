"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function siteOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function IntegrationCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioFrom, setTwilioFrom] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/hair/integrations");
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed to load");
      setData(null);
    } else {
      setData(j.data);
      setTwilioFrom(j.data?.twilio_from_number ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (q?.get("google") === "connected") {
      toast.success("Google Calendar connected");
      window.history.replaceState({}, "", "/settings");
      load();
    }
  }, []);

  async function saveTwilio() {
    setSavingTwilio(true);
    const r = await fetch("/api/hair/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ set_twilio_from_number: twilioFrom }),
    });
    const j = await r.json();
    setSavingTwilio(false);
    if (!r.ok) toast.error(j.error || "Save failed");
    else {
      toast.success("SMS number saved");
      setData(j.data);
      setTwilioFrom(j.data?.twilio_from_number ?? "");
    }
  }

  async function connectSquarespace() {
    const r = await fetch("/api/hair/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connect_squarespace: true }),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed");
    else {
      setData(j.data);
      toast.success("Squarespace saved for demo");
    }
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const googleConnected = !!data.google_calendar_connected;

  return (
    <div className="mt-6 sm:mt-8">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">Integrations</h2>
      <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-5">
        Connect phone, calendar, site, social scheduling, and SMS for Luxe Studio.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-5 text-blue-900">
          <h3 className="font-semibold text-base sm:text-lg mb-1">AI Phone (Vapi)</h3>
          <p className="text-sm opacity-85 mb-4 leading-relaxed">Voice assistant for incoming calls.</p>
          {data.vapi_assistant_id ? (
            <p className="text-xs font-mono break-all bg-white/70 rounded-lg px-3 py-3 border border-blue-100">{data.vapi_assistant_id}</p>
          ) : (
            <a href="https://vapi.ai" target="_blank" rel="noreferrer" className="btn btn-primary btn-lg w-full sm:w-auto">
              Set up
            </a>
          )}
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-5 text-gray-800">
          <h3 className="font-semibold text-base sm:text-lg mb-1">Google Calendar</h3>
          <p className="text-sm opacity-85 mb-4 leading-relaxed">Sync new bookings to your calendar automatically.</p>
          {googleConnected ? (
            <div className="flex flex-col gap-2">
              <span className="badge badge-success badge-lg w-fit">Connected</span>
              {data.last_google_calendar_event_url ? (
                <a
                  href={data.last_google_calendar_event_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-lg border-gray-400 w-full"
                >
                  View last event in Google
                </a>
              ) : null}
              <a href="/hair/google-calendar-proof" target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg w-full text-sm">
                Open calendar proof page
              </a>
            </div>
          ) : (
            <a href={`${siteOrigin()}/api/oauth/google`} className="btn btn-primary btn-lg w-full">
              Connect Google Calendar
            </a>
          )}
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-5 text-gray-800">
          <h3 className="font-semibold text-base sm:text-lg mb-1">Buffer</h3>
          <p className="text-sm opacity-85 mb-4 leading-relaxed">Schedule posts to social channels.</p>
          <button type="button" className="btn btn-outline btn-lg w-full" onClick={() => toast("Buffer connects in a future release.")}>
            Connect
          </button>
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-5 text-blue-900">
          <h3 className="font-semibold text-base sm:text-lg mb-1">SMS (Twilio)</h3>
          <p className="text-sm opacity-85 mb-4 leading-relaxed">Outbound SMS from your salon.</p>
          <div className="flex flex-col gap-3">
            <input
              className="input input-bordered w-full min-h-12 text-base bg-white"
              placeholder="+13235550148"
              value={twilioFrom}
              onChange={(e) => setTwilioFrom(e.target.value)}
              aria-label="Twilio from number"
            />
            <button type="button" className="btn btn-primary btn-lg w-full sm:w-fit" onClick={saveTwilio} disabled={savingTwilio}>
              {savingTwilio ? <span className="loading loading-spinner loading-md" /> : "Save"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-800 bg-white p-4 sm:p-5 text-gray-900 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <img
              src="https://www.squarespace.com/favicon.ico"
              alt=""
              className="shrink-0 w-14 h-14 rounded-lg bg-black p-2 object-contain"
              width={56}
              height={56}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg mb-1">Squarespace</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Connect your Squarespace site to automate client communications with AI-assisted message drafting. Set up in minutes.
              </p>
              {data.squarespace_connected ? (
                <span className="badge badge-success badge-lg">Connected (demo)</span>
              ) : (
                <button type="button" className="btn btn-neutral btn-lg w-full sm:w-auto" onClick={connectSquarespace}>
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
