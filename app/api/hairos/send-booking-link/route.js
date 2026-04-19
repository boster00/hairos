import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import { isDemoHairContext, getDemoSalon } from "@/libs/hairos/demoStore";
import { Resend } from "resend";

function siteOrigin() {
  const u =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.NODE_ENV === "development" ? `http://localhost:${process.env.PORT || 3004}` : "");
  return u ? String(u).replace(/\/$/, "") : "";
}

export async function POST(req) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    return NextResponse.json({ error: "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const clientEmail = String(body.clientEmail ?? body.to_email ?? "").trim();
  const clientName = String(body.clientName ?? body.to_name ?? "").trim();
  const salonSlug = String(body.salonSlug ?? "").trim().toLowerCase();

  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return NextResponse.json({ error: "valid clientEmail (or to_email) required" }, { status: 400 });
  }

  const salon = isDemoHairContext() ? getDemoSalon() : ctx.salon;
  if (!salon?.slug) return NextResponse.json({ error: "no salon" }, { status: 404 });

  if (salonSlug && salon.slug !== salonSlug) {
    return NextResponse.json({ error: "salonSlug does not match your salon" }, { status: 403 });
  }

  const origin = siteOrigin();
  if (!origin) return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL or SITE_URL required" }, { status: 500 });
  const bookingUrl = `${origin}/booking/${encodeURIComponent(salon.slug)}`;

  const displayName = clientName || "there";
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: clientEmail,
    subject: `Your booking link for ${salon.name}`,
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;padding:24px;">
<p>Hi ${displayName},</p>
<p>Book your next visit at <strong>${salon.name}</strong> online — pick a service and time that works for you.</p>
<p><a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Book now</a></p>
<p style="font-size:14px;color:#555;">Or copy this link:<br/><a href="${bookingUrl}">${bookingUrl}</a></p>
<p style="font-size:14px;color:#888;">— ${salon.name}</p>
</body></html>`,
  });

  if (error) {
    return NextResponse.json({ error: error.message || "send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true, booking_url: bookingUrl });
}
