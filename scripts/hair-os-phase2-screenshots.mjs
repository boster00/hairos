/**
 * HairOS Phase 2 — capture screenshots for quest evidence (Playwright).
 * Usage: BASE_URL=http://localhost:3004 node scripts/hair-os-phase2-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3004";
const OUT = process.env.SCREENSHOT_DIR || path.join(process.cwd(), ".hair-os-screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const shots = [
    { file: "clients.png", url: `${BASE}/clients`, wait: "Clients" },
    { file: "social-scheduler.png", url: `${BASE}/marketing/social`, wait: "Social scheduler" },
    { file: "newsletter.png", url: `${BASE}/marketing/newsletter`, wait: "Newsletter" },
    { file: "settings-integrations.png", url: `${BASE}/settings`, wait: "Integrations" },
    {
      file: "email-templates.png",
      url: `${BASE}/settings/integrations`,
      after: async (p) => {
        await p.getByRole("tab", { name: "Email HTML templates" }).click();
        await p.waitForTimeout(400);
      },
    },
    {
      file: "calendar-quick-add.png",
      url: `${BASE}/calendar`,
      after: async (p) => {
        await p.getByRole("button", { name: "+ Appointment" }).click();
        await p.waitForSelector("text=Quick add appointment");
      },
    },
  ];

  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "load", timeout: 60000 });
    if (s.wait) await page.getByText(s.wait, { exact: false }).first().waitFor({ timeout: 30000 }).catch(() => {});
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
