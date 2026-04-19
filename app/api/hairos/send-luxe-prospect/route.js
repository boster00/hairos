import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { LUXE_PROSPECT_EMAILS } from "@/libs/hairos/luxeProspectEmails";
import { sendEmail } from "@/libs/reminders";

const TO = "xsj706@gmail.com";

export async function POST() {
  if (process.env.HAIR_OS_UI_DEMO !== "1" || process.env.CJGEO_DEV_FAKE_AUTH !== "1") {
    return NextResponse.json({ error: "only_in_hair_os_demo" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  const user =
    sessionUser ||
    (process.env.CJGEO_DEV_FAKE_AUTH === "1"
      ? { id: "00000000-0000-0000-0000-000000000001" }
      : null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "RESEND_API_KEY and RESEND_FROM_EMAIL required" }, { status: 500 });
  }

  const results = [];
  for (const mail of LUXE_PROSPECT_EMAILS) {
    try {
      await sendEmail({ to: TO, subject: mail.subject, html: mail.html });
      results.push({ id: mail.id, ok: true });
    } catch (e) {
      results.push({ id: mail.id, ok: false, error: String(e.message || e) });
    }
  }
  return NextResponse.json({ data: { sent: results.length, results } });
}
