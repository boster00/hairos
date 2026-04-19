/**
 * HairOS Phase 2 — core deliverables + pitch deck path, 390×844.
 * Six UI screenshots (quest evidence per Cat WBS). pitch_deck stays separate in inventory.
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
    console.log("send-luxe-prospect", r.status);
  } catch (e) {
    console.warn("send-luxe-prospect skip", e.message);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  const shots = [
    { file: "clients.png", url: `${BASE}/clients`, wait: "Clients" },
    {
      file: "social-scheduler.png",
      url: `${BASE}/marketing/social`,
      wait: "Image URL",
      after: async (p) => {
        await p.getByPlaceholder(/What are you posting/i).scrollIntoViewIfNeeded();
      },
    },
    { file: "newsletter.png", url: `${BASE}/marketing/newsletter`, wait: "Open rate" },
    { file: "settings-integrations.png", url: `${BASE}/settings`, wait: "Google Calendar" },
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
  ];

  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "load", timeout: 90000 });
    if (s.wait) {
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
