/**
 * HairOS MVP — mobile screenshots 390×844 (requires dev server: npm run dev:hairos).
 * Usage: BASE_URL=http://localhost:3004 node scripts/mvp-hairos-screenshots.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:3004";
const OUT = path.join(ROOT, ".mvp-hairos-screenshots");
const VIEWPORT = { width: 390, height: 844 };

const shots = [
  { file: "signin.png", url: `${BASE}/signin`, wait: "Sign-in" },
  { file: "onboarding.png", url: `${BASE}/onboarding`, wait: "Welcome" },
  { file: "dashboard.png", url: `${BASE}/dashboard`, wait: "Dashboard" },
  { file: "pricing.png", url: `${BASE}/pricing`, wait: "HairOS pricing" },
  { file: "settings.png", url: `${BASE}/settings`, wait: "Google Calendar" },
  { file: "booking.png", url: `${BASE}/booking/test-slug`, wait: "Salon not found" },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "load", timeout: 60000 });
    if (s.wait) await page.getByText(s.wait, { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => {});
    await page.screenshot({ path: path.join(OUT, s.file), fullPage: true });
    console.log("wrote", s.file);
  }
  await browser.close();
  console.log("done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
