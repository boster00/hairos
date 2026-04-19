import twilio from "twilio";
import { Resend } from "resend";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function sendSms({ to, body, from }) {
  const client = getTwilioClient();
  return client.messages.create({ to, body, from: from || process.env.TWILIO_FROM_NUMBER });
}

export async function sendEmail({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({ from: process.env.RESEND_FROM_EMAIL || "noreply@hairos.app", to, subject, html });
}

export async function processReminders(supabase) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const window = 5 * 60 * 1000; // 5-min cron window

  const results = { sent24h: 0, sent2h: 0, sentFollowup: 0, errors: [] };

  // 24h reminders
  const { data: upcoming24 } = await supabase.from("appointments")
    .select("*, salons(name, twilio_from_number)")
    .eq("status", "confirmed")
    .eq("reminder_24h_sent", false)
    .gte("starts_at", new Date(in24h.getTime() - window).toISOString())
    .lte("starts_at", new Date(in24h.getTime() + window).toISOString());

  for (const appt of upcoming24 || []) {
    try {
      const time = new Date(appt.starts_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "short", timeStyle: "short" });
      if (appt.client_phone) {
        await sendSms({ to: appt.client_phone, from: appt.salons?.twilio_from_number, body: `Reminder: your appointment at ${appt.salons?.name} is tomorrow at ${time}. Reply CANCEL to cancel.` });
      }
      if (appt.client_email) {
        await sendEmail({ to: appt.client_email, subject: `Your appointment at ${appt.salons?.name} is tomorrow`, html: `<p>See you tomorrow at ${time}!</p>` });
      }
      await supabase.from("appointments").update({ reminder_24h_sent: true }).eq("id", appt.id);
      results.sent24h++;
    } catch (e) {
      results.errors.push({ apptId: appt.id, error: e.message });
    }
  }

  // 2h reminders
  const { data: upcoming2 } = await supabase.from("appointments")
    .select("*, salons(name, twilio_from_number)")
    .eq("status", "confirmed")
    .eq("reminder_2h_sent", false)
    .gte("starts_at", new Date(in2h.getTime() - window).toISOString())
    .lte("starts_at", new Date(in2h.getTime() + window).toISOString());

  for (const appt of upcoming2 || []) {
    try {
      const time = new Date(appt.starts_at).toLocaleTimeString("en-US", { timeStyle: "short" });
      if (appt.client_phone) {
        await sendSms({ to: appt.client_phone, from: appt.salons?.twilio_from_number, body: `Just a heads up — your appointment at ${appt.salons?.name} is in about 2 hours (${time}).` });
      }
      await supabase.from("appointments").update({ reminder_2h_sent: true }).eq("id", appt.id);
      results.sent2h++;
    } catch (e) {
      results.errors.push({ apptId: appt.id, error: e.message });
    }
  }

  // Post-visit follow-ups (1h after ends_at)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const { data: completed } = await supabase.from("appointments")
    .select("*, salons(name)")
    .eq("status", "confirmed")
    .eq("followup_sent", false)
    .gte("ends_at", new Date(oneHourAgo.getTime() - window).toISOString())
    .lte("ends_at", new Date(oneHourAgo.getTime() + window).toISOString());

  for (const appt of completed || []) {
    try {
      // Mark as completed and send follow-up
      await supabase.from("appointments").update({ status: "completed", followup_sent: true }).eq("id", appt.id);
      if (appt.client_phone) {
        await sendSms({ to: appt.client_phone, body: `Thanks for visiting ${appt.salons?.name}! We'd love a review: [link]` });
      }
      results.sentFollowup++;
    } catch (e) {
      results.errors.push({ apptId: appt.id, error: e.message });
    }
  }

  return results;
}
