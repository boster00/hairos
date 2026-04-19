/**
 * HairOS Phase 2 — full evidence pack: Resend 5 emails, mobile screenshots (390×844),
 * optional Google Calendar event, flat quest inventory on sdrqhej Supabase.
 *
 * Requires in .env.local: RESEND_API_KEY, RESEND_FROM_EMAIL (and HAIR_OS_* demo flags for local).
 * Optional: HAIR_OS_GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET for calendar event.
 *
 * Usage: node scripts/quest-submit-evidence.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { LUXE_PROSPECT_EMAILS } from "../libs/hairos/luxeProspectEmails.js";
import { createCalendarEvent } from "../libs/google/calendarSync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const QUEST_ID = "e36d2438-6a29-47bf-a591-8d1fb772a816";
const BUCKET = "GuildOS_Bucket";
const PREFIX = `cursor_cloud/${QUEST_ID}`;
const TO = "xsj706@gmail.com";

const SDR_URL = process.env.GUILDOS_QUEST_SUPABASE_URL;
const SDR_KEY = process.env.GUILDOS_QUEST_SUPABASE_SERVICE_KEY;

const BASE = process.env.BASE_URL || "http://localhost:3004";
const OUT = path.join(ROOT, ".hair-os-screenshots");
const VIEWPORT = { width: 390, height: 844 };

async function sendEmails() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    console.error("[BLOCKER] RESEND_API_KEY and RESEND_FROM_EMAIL must be set in .env.local");
    process.exit(3);
  }
  const resend = new Resend(key);
  for (const mail of LUXE_PROSPECT_EMAILS) {
    const { error } = await resend.emails.send({ from, to: TO, subject: mail.subject, html: mail.html });
    if (error) {
      console.error("[BLOCKER] Resend send failed", mail.id, error);
      process.exit(4);
    }
    console.log("sent email", mail.id);
  }
}

async function maybeGoogleEvent() {
  const rt = process.env.HAIR_OS_GOOGLE_REFRESH_TOKEN;
  const cid = process.env.GOOGLE_CLIENT_ID;
  const cs = process.env.GOOGLE_CLIENT_SECRET;
  if (!rt || !cid || !cs) {
    console.warn("skip google event: missing HAIR_OS_GOOGLE_REFRESH_TOKEN or GOOGLE_CLIENT_*");
    return null;
  }
  const start = new Date("2026-05-02T14:00:00-07:00");
  const end = new Date(start.getTime() + 120 * 60000);
  const cal = await createCalendarEvent({
    refreshToken: rt,
    calendarId: "primary",
    summary: "Brazilian Blowout — Sarah | Luxe Studio by Maya",
    description: "HairOS test booking for Sarah Chen",
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    timeZone: "America/Los_Angeles",
  });
  if (cal.error) {
    console.error("[BLOCKER] Google Calendar event failed", cal.error, cal.details || "");
    process.exit(5);
  }
  console.log("google event", cal.data?.htmlLink);
  return cal.data?.htmlLink || null;
}

function googleCalendarProofUrl(googleUrl) {
  const fromEnv = process.env.HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL?.trim();
  const u = (googleUrl || fromEnv || "").trim();
  if (!u) return null;
  try {
    const h = new URL(u).hostname;
    if (h.includes("calendar.google.com") || h.includes("google.com")) return u;
  } catch {
    return null;
  }
  return null;
}

async function captureAll(googleProofUrl) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const shots = [
    { key: "clients_mobile", file: "clients_mobile.png", url: `${BASE}/clients`, wait: "Clients" },
    {
      key: "newsletter_mobile",
      file: "newsletter_mobile.png",
      url: `${BASE}/marketing/newsletter`,
      wait: "Past campaigns",
      after: async (p) => {
        await p.getByText("Open rate", { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
      },
    },
    {
      key: "calendar_quick_add_mobile",
      file: "calendar_quick_add_mobile.png",
      url: `${BASE}/calendar`,
      after: async (p) => {
        await p.getByRole("button", { name: "+ Appointment" }).click();
        await p.getByText("Quick add appointment").waitFor({ timeout: 20000 });
      },
    },
    {
      key: "social_scheduler_mobile",
      file: "social_scheduler_mobile.png",
      url: `${BASE}/marketing/social`,
      wait: "Get AI post ideas",
      after: async (p) => {
        await p.getByRole("heading", { name: "Queue" }).scrollIntoViewIfNeeded();
      },
    },
    {
      key: "settings_integrations_mobile",
      file: "settings_integrations_mobile.png",
      url: `${BASE}/settings`,
      wait: "Squarespace",
    },
    {
      key: "email_confirm_mobile",
      file: "email_confirm_mobile.png",
      url: `${BASE}/hair/email-html/confirm`,
    },
    {
      key: "email_reminder24_mobile",
      file: "email_reminder24_mobile.png",
      url: `${BASE}/hair/email-html/reminder24h`,
    },
    {
      key: "email_winback30_mobile",
      file: "email_winback30_mobile.png",
      url: `${BASE}/hair/email-html/winback30`,
    },
    {
      key: "email_winback60_mobile",
      file: "email_winback60_mobile.png",
      url: `${BASE}/hair/email-html/winback60`,
    },
    {
      key: "email_feedback_mobile",
      file: "email_feedback_mobile.png",
      url: `${BASE}/hair/email-html/feedback`,
    },
    {
      key: "google_calendar_sync_mobile",
      file: "google_calendar_sync_mobile.png",
      url: googleProofUrl || `${BASE}/settings`,
      wait: googleProofUrl ? undefined : "Google Calendar",
      isGoogle: !!googleProofUrl,
    },
    {
      key: "booking_luxe_maya_mobile",
      file: "booking_luxe_maya_mobile.png",
      url: `${BASE}/booking/luxe-maya`,
      after: async (p) => {
        await p.getByRole("button", { name: /Brazilian Blowout/i }).first().click();
        await p.locator("button.btn-lg.btn-outline").first().waitFor({ state: "visible", timeout: 15000 });
      },
    },
  ];

  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "load", timeout: 120000 });
    if (s.isGoogle) await page.waitForTimeout(5000);
    else if (s.wait) await page.getByText(s.wait, { exact: false }).first().waitFor({ timeout: 45000 }).catch(() => {});
    if (s.after) await s.after(page);
    const dest = path.join(OUT, s.file);
    await page.screenshot({ path: dest, fullPage: true });
    console.log("screenshot", s.file);
  }
  await browser.close();
  return shots;
}

async function main() {
  if (!SDR_URL || !SDR_KEY) {
    console.error("[BLOCKER] GUILDOS_QUEST_SUPABASE_URL and GUILDOS_QUEST_SUPABASE_SERVICE_KEY must be set");
    process.exit(2);
  }

  let googleProofUrl = googleCalendarProofUrl(null);
  if (!googleProofUrl) {
    const googleLink = await maybeGoogleEvent();
    if (googleLink) process.env.HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL = googleLink;
    googleProofUrl = googleCalendarProofUrl(googleLink);
  }
  if (!googleProofUrl) {
    console.error(
      "[BLOCKER] Google Calendar sync evidence requires a real Calendar UI URL. Set HAIR_OS_GOOGLE_CALENDAR_SCREENSHOT_URL (event htmlLink) or provide HAIR_OS_GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET so an event can be created.",
    );
    process.exit(6);
  }

  await sendEmails();

  const shots = await captureAll(googleProofUrl);

  const sb = createClient(SDR_URL, SDR_KEY, { auth: { persistSession: false } });
  const { data: quest } = await sb.from("quests").select("inventory").eq("id", QUEST_ID).single();
  const prevPitch = quest?.inventory?.pitch_deck || quest?.inventory?.evidence?.find((e) => e.item_key === "pitch_deck")?.payload;

  /** @type {Record<string, { url: string; description: string }>} */
  const inventory = {};

  for (const s of shots) {
    const storagePath = `${PREFIX}/${s.file}`;
    await sb.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    const body = fs.readFileSync(path.join(OUT, s.file));
    const { error } = await sb.storage.from(BUCKET).upload(storagePath, body, { contentType: "image/png", upsert: true });
    if (error) throw error;
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
    inventory[s.key] = {
      url: pub.publicUrl,
      description: s.key.replace(/_/g, " "),
    };
  }

  if (prevPitch?.url) {
    inventory.pitch_deck = { url: prevPitch.url, description: prevPitch.description || "HairOS pitch deck" };
  }

  const deliverableKeys = Object.keys(inventory).filter((k) => k !== "pitch_deck");
  if (deliverableKeys.length < 12) {
    console.error("[BLOCKER] inventory missing deliverables", { count: deliverableKeys.length, keys: deliverableKeys });
    process.exit(7);
  }

  // submitForPurrview: persist inventory, verify, then stage (housekeeping skill book)
  const { error: invErr } = await sb.from("quests").update({ inventory }).eq("id", QUEST_ID);
  if (invErr) throw invErr;

  const { data: afterInv, error: selInvErr } = await sb.from("quests").select("inventory, stage").eq("id", QUEST_ID).single();
  if (selInvErr) throw selInvErr;
  const invKeys = afterInv?.inventory && typeof afterInv.inventory === "object" ? Object.keys(afterInv.inventory) : [];
  if (!invKeys.length) {
    console.error("[BLOCKER] SELECT after inventory update returned empty inventory");
    process.exit(8);
  }

  const { error: stErr } = await sb.from("quests").update({ stage: "purrview" }).eq("id", QUEST_ID);
  if (stErr) throw stErr;

  const { data: v, error: selStErr } = await sb.from("quests").select("stage, inventory").eq("id", QUEST_ID).single();
  if (selStErr) throw selStErr;
  if (v.stage !== "purrview") {
    console.error("[BLOCKER] stage not purrview after update", v.stage);
    process.exit(9);
  }
  console.log("done stage=", v.stage, "inventory_keys=", Object.keys(v.inventory || {}).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
