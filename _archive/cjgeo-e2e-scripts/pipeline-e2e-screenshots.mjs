/**
 * Content Pipeline E2E with dev mock (CJGEO_DEV_FAKE_AUTH=1, CRON_SECRET in .env.local).
 * npm run dev on :3000, then: node scripts/pipeline-e2e-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.PIPELINE_E2E_BASE || "http://localhost:3000";
const CRON = process.env.CRON_SECRET || "local-cron-secret";
const OUT = path.join(process.cwd(), "screenshots");

async function tick() {
  const res = await fetch(`${BASE}/api/content-pipeline/tick`, {
    method: "POST",
    headers: { "x-cron-secret": CRON },
  });
  return res.json();
}

async function resetMock() {
  await fetch(`${BASE}/api/content-pipeline/dev/reset-mock`, {
    method: "POST",
    headers: { "x-cron-secret": CRON },
  });
}

async function appendItems(pipelineId) {
  const res = await fetch(`${BASE}/api/content-pipeline/${encodeURIComponent(pipelineId)}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ keyword: "ihc staining tips", title: "IHC Staining Tips for Reliable Results" }],
    }),
  });
  return res.json();
}

async function expandFirstCard(page) {
  const card = page.locator("div.bg-white.border.rounded-xl.shadow-sm").first();
  await card.locator("button").last().click();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await resetMock();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });

  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-1.png") });

  await page.goto(`${BASE}/content-pipeline`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Content Pipeline/i }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-2.png") });

  await page.getByRole("button", { name: /Create your first pipeline/i }).click();
  await page.getByPlaceholder(/Q2 Blog/i).fill("E2E Test Pipeline");
  const topics = `elisa kit guide | Complete Guide to ELISA Kits
western blot protocol | Western Blot Step-by-Step Protocol`;
  await page.locator("textarea").first().fill(topics);
  await page.locator("select").first().selectOption("1");
  await page.screenshot({ path: path.join(OUT, "pipeline-test-3.png") });

  await page.getByRole("button", { name: /Create Pipeline/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-4.png") });

  const t1 = await tick();
  console.log("tick1", t1);
  const pipelineId = t1.items?.[0]?.pipelineId;
  if (!pipelineId) throw new Error("tick1 missing pipelineId");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await expandFirstCard(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-5.png") });

  const t2 = await tick();
  console.log("tick2", t2);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await expandFirstCard(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-6.png") });

  await page.getByRole("button", { name: /^Pause$/ }).click();
  await page.waitForTimeout(400);
  const tPaused = await tick();
  console.log("tick while paused (expect processed 0)", tPaused);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-7.png") });

  const addRes = await appendItems(pipelineId);
  console.log("POST /items", addRes);
  if (!addRes.success) throw new Error(addRes.error || "append failed");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^Resume$/ }).click();
  await page.waitForTimeout(400);
  await tick();
  await tick();
  await tick();

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await expandFirstCard(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "pipeline-test-8.png") });

  await browser.close();
  console.log("Wrote screenshots/pipeline-test-1.png … pipeline-test-8.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
