"use client";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SendBookingLink({ salonSlug }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const r = await fetch("/api/hairos/send-booking-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_email: email, to_name: name }),
    });
    const j = await r.json();
    setSending(false);
    if (r.ok) {
      toast.success(`Booking link sent to ${email}`);
      setEmail("");
      setName("");
    } else {
      toast.error(j.error || "Send failed");
    }
  }

  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/booking/${salonSlug}`
    : `/booking/${salonSlug}`;

  return (
    <div className="card bg-base-200 rounded-box p-5">
      <h2 className="text-base font-semibold mb-1">Send booking link</h2>
      <p className="text-sm text-base-content/60 mb-4">
        Email a scheduling link to a client so they can pick a time.
      </p>
      <form onSubmit={send} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Client name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input input-bordered flex-1"
        />
        <input
          type="email"
          placeholder="client@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="input input-bordered flex-1"
        />
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? <span className="loading loading-spinner loading-sm" /> : "Send"}
        </button>
      </form>
      <p className="text-xs text-base-content/40 mt-2">
        Booking page: <a href={bookingUrl} target="_blank" rel="noreferrer" className="link">{bookingUrl}</a>
      </p>
    </div>
  );
}
