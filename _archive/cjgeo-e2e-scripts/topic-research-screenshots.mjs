/**
 * Capture Topic Research tabs (mock APIs). Requires dev server :3000 and CJGEO_DEV_FAKE_AUTH=1.
 *   node scripts/topic-research-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.TR_SCREENSHOT_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.route("**/api/**", async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === "/api/credits") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    await route.continue();
  });

  await page.goto(`${BASE}/competitor-research`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("heading", { name: /Topic Research/i }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, "topic-research-tab-keywords.png") });

  await page.getByPlaceholder("e.g. competitor.com").fill("competitor-demo.com");
  await page.getByRole("button", { name: "Analyze" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "topic-research-keywords-filled.png") });

  await page.getByRole("button", { name: "Top Pages Analysis" }).click();
  await page.getByPlaceholder("bosterbio.com").fill("bosterbio.com");
  await page.getByRole("button", { name: "Analyze pages" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "topic-research-tab-pages.png") });

  await page.getByRole("button", { name: "Keyword Gap" }).click();
  await page.getByRole("button", { name: "Compare" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "topic-research-tab-gap.png") });

  await page.route("**/api/content-pipeline**", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          pipelines: [{ id: "00000000-0000-0000-0000-000000000099", name: "Demo pipeline" }],
        }),
      });
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "Content Ideas" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Generate clusters" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "topic-research-tab-ideas.png") });

  await browser.close();
  console.log("Wrote screenshots/topic-research-*.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
