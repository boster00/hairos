import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getSalonForHairApi } from "@/libs/hair/getSalonForHairApi";
import { sendEmail } from "@/libs/reminders";
import { isDemoHairContext, getDemoSalon } from "@/libs/hairos/demoStore";

export async function POST(req) {
  const supabase = await createClient();
  const ctx = await getSalonForHairApi(supabase);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => ({}));
  const { to_email, to_name } = body;

  if (!to_email) return NextResponse.json({ error: "to_email required" }, { status: 400 });

  const salon = isDemoHairContext() ? getDemoSalon() : ctx.salon;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";
  const bookingUrl = `${origin}/booking/${salon.slug}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin-bottom:8px">${salon.name}</h2>
      <p style="color:#555;margin-bottom:24px">
        ${to_name ? `Hi ${to_name}, ` : ""}You're invited to book an appointment online — pick a time that works for you.
      </p>
      <a href="${bookingUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Book now
      </a>
      <p style="color:#888;font-size:12px;margin-top:32px">
        Or copy this link: <a href="${bookingUrl}" style="color:#555">${bookingUrl}</a>
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: to_email,
      subject: `Book your appointment at ${salon.name}`,
      html,
    });
    return NextResponse.json({ data: { sent: true, to: to_email, booking_url: bookingUrl } });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "send_failed" }, { status: 500 });
  }
}
