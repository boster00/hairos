/**
 * HairOS Phase 2 — 8 deliverables, 390×844 mobile screenshots.
 * Usage: BASE_URL=http://localhost:3004 node scripts/hair-os-phase2-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3004";
const OUT = process.env.SCREENSHOT_DIR || path.join(process.cwd(), ".hair-os-screenshots");
const VIEWPORT = { width: 390, height: 844 };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  try {
    const r = await fetch(`${BASE}/api/hairos/send-luxe-prospect`, { method: "POST" });
    const t = await r.text();
    console.log("send-luxe-prospect", r.status, t.slice(0, 200));
  } catch (e) {
    console.warn("send-luxe-prospect skip", e.message);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  let googleEventUrl = null;
  try {
    const gr = await fetch(`${BASE}/api/hair/google-cal-proof`);
    const gj = await gr.json();
    googleEventUrl = gj.url || null;
  } catch {
    googleEventUrl = null;
  }

  const shots = [
    { file: "clients.png", url: `${BASE}/clients`, wait: "Clients" },
    { file: "social-scheduler.png", url: `${BASE}/marketing/social`, wait: "Get AI post ideas" },
    { file: "newsletter.png", url: `${BASE}/marketing/newsletter`, wait: "Open rate" },
    { file: "settings-integrations.png", url: `${BASE}/settings`, wait: "Squarespace" },
    {
      file: "email-templates.png",
      url: `${BASE}/settings/integrations`,
      wait: "Send 5 real prospect emails",
    },
    {
      file: "calendar-quick-add.png",
      url: `${BASE}/calendar`,
      after: async (p) => {
        await p.getByRole("button", { name: "+ Appointment" }).click();
        await p.getByText("Quick add appointment").waitFor({ timeout: 20000 });
      },
    },
    {
      file: "google-calendar-sync.png",
      url: googleEventUrl || `${BASE}/settings`,
      wait: googleEventUrl ? "Google" : "Google Calendar",
      isGoogle: !!googleEventUrl,
    },
    {
      file: "booking-luxe-maya.png",
      url: `${BASE}/booking/luxe-maya`,
      after: async (p) => {
        await p.getByRole("button", { name: /Brazilian Blowout/i }).first().click();
        await p.getByRole("button", { name: /Maya Johnson/i }).first().click();
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const ds = d.toISOString().split("T")[0];
        await p.locator('input[type="date"]').fill(ds);
        await p.waitForTimeout(800);
        await p.locator("button.btn-outline.btn-lg").first().waitFor({ state: "visible", timeout: 25000 });
      },
    },
  ];

  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "load", timeout: 90000 });
    if (s.isGoogle) {
      await page.waitForTimeout(4000);
    } else if (s.wait) {
      await page.getByText(s.wait, { exact: false }).first().waitFor({ timeout: 45000 }).catch(() => {});
    }
    if (s.after) await s.after(page);
    const dest = path.join(OUT, s.file);
    await page.screenshot({ path: dest, fullPage: true });
    console.log("wrote", dest);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
