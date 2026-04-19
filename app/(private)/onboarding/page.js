"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [salon, setSalon] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    timezone: "America/Los_Angeles",
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/salon?action=read_salon");
        const j = await r.json();
        if (r.ok && j.data?.id) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        /* ignore */
      }
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const name = salon.name.trim();
    if (!name) return;
    const slug = (salon.slug || slugify(name)).trim().toLowerCase();
    if (!slug) {
      setError("Please enter a URL slug for your booking page.");
      return;
    }
    setSaving(true);
    try {
      const salonRes = await fetch("/api/salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "write_salon",
          data: {
            name,
            slug,
            phone: salon.phone.trim() || null,
            address: salon.address.trim() || null,
            timezone: salon.timezone,
          },
        }),
      });
      const j = await salonRes.json();
      if (!salonRes.ok || j.error) {
        setError(typeof j.error === "string" ? j.error : j.error?.message || "Could not create salon");
        setSaving(false);
        return;
      }
      if (!j.data?.id) {
        setError("Unexpected response from server");
        setSaving(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err?.message || "Network error");
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-1 text-center">Welcome to HairOS</h1>
        <p className="text-base-content/70 text-sm text-center mb-6">
          Create your salon profile. You can add staff, services, and hours from the app anytime.
        </p>

        <form onSubmit={handleSubmit} className="card bg-base-100 card-border shadow-sm">
          <div className="card-body gap-4">
            {error ? (
              <div className="alert alert-error text-sm" role="alert">
                {error}
              </div>
            ) : null}

            <label className="form-control w-full">
              <span className="label-text font-medium">Salon name</span>
              <input
                className="input input-bordered w-full min-h-12 text-base"
                required
                value={salon.name}
                onChange={(e) =>
                  setSalon((s) => ({
                    ...s,
                    name: e.target.value,
                    slug: s.slug ? s.slug : slugify(e.target.value),
                  }))
                }
                placeholder="e.g. Luxe Studio by Maya"
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text font-medium">Booking URL slug</span>
              <div className="join w-full">
                <span className="join-item btn btn-disabled btn-outline no-animation shrink text-xs sm:text-sm">
                  /booking/
                </span>
                <input
                  className="input input-bordered join-item flex-1 min-w-0 min-h-12 text-base"
                  required
                  value={salon.slug}
                  onChange={(e) => setSalon((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="your-salon"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Lowercase letters, numbers, and hyphens only"
                />
              </div>
            </label>

            <label className="form-control w-full">
              <span className="label-text font-medium">Phone</span>
              <input
                className="input input-bordered w-full min-h-12 text-base"
                type="tel"
                value={salon.phone}
                onChange={(e) => setSalon((s) => ({ ...s, phone: e.target.value }))}
                placeholder="(323) 555-0100"
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text font-medium">Address</span>
              <input
                className="input input-bordered w-full min-h-12 text-base"
                value={salon.address}
                onChange={(e) => setSalon((s) => ({ ...s, address: e.target.value }))}
                placeholder="Street, city, state"
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text font-medium">Timezone</span>
              <select
                className="select select-bordered w-full min-h-12"
                value={salon.timezone}
                onChange={(e) => setSalon((s) => ({ ...s, timezone: e.target.value }))}
              >
                <option value="America/Los_Angeles">Pacific (LA)</option>
                <option value="America/Denver">Mountain (Denver)</option>
                <option value="America/Chicago">Central (Chicago)</option>
                <option value="America/New_York">Eastern (New York)</option>
              </select>
            </label>

            <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-md" /> : "Create salon & go to dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
