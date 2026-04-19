"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function IntegrationCards() {
  const [vapiAssistantId, setVapiAssistantId] = useState(null);
  const [twilioFrom, setTwilioFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTwilio, setSavingTwilio] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/hair/integrations");
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Failed to load");
    } else {
      setVapiAssistantId(j.data?.vapi_assistant_id ?? null);
      setTwilioFrom(j.data?.twilio_from_number ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
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
      setTwilioFrom(j.data?.twilio_from_number ?? "");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-8">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">Integrations</h2>
      <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-5">Connect phone, calendar, social, and SMS for your salon.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-5 text-blue-800">
          <h3 className="font-semibold text-base sm:text-lg mb-1">AI Phone (Vapi)</h3>
          <p className="text-sm opacity-80 mb-4 leading-relaxed">Voice assistant for incoming calls.</p>
          {vapiAssistantId ? (
            <p className="text-xs font-mono break-all bg-white/60 rounded-lg px-3 py-3 border border-blue-100">{vapiAssistantId}</p>
          ) : (
            <a href="https://vapi.ai" target="_blank" rel="noreferrer" className="btn btn-primary btn-lg w-full sm:w-auto">
              Set up
            </a>
          )}
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-5 text-gray-700">
          <h3 className="font-semibold text-base sm:text-lg mb-1">Google Calendar</h3>
          <p className="text-sm opacity-80 mb-4 leading-relaxed">Sync appointments to Google Calendar.</p>
          <span className="badge badge-ghost badge-lg">Coming soon</span>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-5 text-gray-700">
          <h3 className="font-semibold text-base sm:text-lg mb-1">Buffer</h3>
          <p className="text-sm opacity-80 mb-4 leading-relaxed">Schedule posts to social channels.</p>
          <button
            type="button"
            className="btn btn-outline btn-lg w-full sm:w-auto"
            onClick={() => toast("Buffer integration is not wired up yet.")}
          >
            Connect
          </button>
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-5 text-blue-800">
          <h3 className="font-semibold text-base sm:text-lg mb-1">SMS (Twilio)</h3>
          <p className="text-sm opacity-80 mb-4 leading-relaxed">Outbound SMS from your salon.</p>
          <div className="flex flex-col gap-3">
            <input
              className="input input-bordered w-full min-h-12 text-base bg-white"
              placeholder="+15551234567"
              value={twilioFrom}
              onChange={(e) => setTwilioFrom(e.target.value)}
              aria-label="Twilio from number"
            />
            <button type="button" className="btn btn-primary btn-lg w-full sm:w-fit" onClick={saveTwilio} disabled={savingTwilio}>
              {savingTwilio ? <span className="loading loading-spinner loading-md" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
