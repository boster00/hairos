/**
 * CJGEO Content Benchmarking + Content Pipeline screenshots.
 * Requires: npm run dev, .env.local with CJGEO_DEV_FAKE_AUTH=1, TOPIC_RESEARCH_MOCK=1
 *   node scripts/benchmarking-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BENCH_E2E_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto(`${BASE}/competitor-research`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("heading", { name: /Content Benchmarking/i }).waitFor({ timeout: 30000 });
  await page.getByPlaceholder("e.g. abcam.com").fill("abcam.com");
  await page.getByRole("button", { name: "Analyze" }).click();
  await page.getByTestId("keywords-tab-results").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Select all" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "benchmarking-keywords.png") });

  await page.getByRole("button", { name: "Top Page Analysis" }).click();
  await page.getByRole("button", { name: "Analyze pages" }).click();
  await page.getByTestId("pages-tab-results").waitFor({ timeout: 15000 });
  await page.getByTestId("pages-tab-results").locator("tbody button.btn-square").first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "benchmarking-top-pages.png") });

  await page.getByRole("button", { name: "Keyword Rankings" }).click();
  await page.getByTestId("keywords-tab-results").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Select all" }).click();
  await page.getByRole("button", { name: "Suggest topics from selection" }).click();
  await page.getByTestId("topic-suggestion-cards").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "benchmarking-topic-suggestions.png") });

  await page.goto(`${BASE}/content-pipeline`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Content Pipeline/i }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "content-pipeline-sidebar.png"), fullPage: true });
  await page.screenshot({ path: path.join(OUT, "content-pipeline-page.png") });

  await browser.close();
  console.log("Wrote benchmarking-*.png and content-pipeline-*.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
