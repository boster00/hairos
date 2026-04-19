/**
 * Real DataForSEO + pipeline + full-auto E2E (Playwright).
 * Requires: npm run dev, .env.local without TOPIC_RESEARCH_MOCK, DataForSEO keys,
 *   CJGEO_DEV_FAKE_AUTH=1, CONTENT_PIPELINE_USE_REAL_DB=1
 *
 *   node scripts/real-data-e2e.mjs
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const BASE = process.env.REAL_DATA_E2E_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function assertNoMockBanner(page, tab) {
  const tid =
    tab === "pages" ? "benchmarking-mock-banner-pages" : "benchmarking-mock-banner-keywords";
  if ((await page.getByTestId(tid).count()) > 0) {
    throw new Error("GATE: API mock banner visible — expected real DataForSEO");
  }
}

async function main() {
  if (process.env.TOPIC_RESEARCH_MOCK === "1") {
    throw new Error("TOPIC_RESEARCH_MOCK must not be set to 1");
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  // --- Content Benchmarking: keywords ---
  await page.goto(`${BASE}/competitor-research`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByRole("heading", { name: /Content Benchmarking/i }).waitFor({ timeout: 60000 });
  await page.getByPlaceholder("e.g. abcam.com").fill("ptglab.com");
  const kwResp = page.waitForResponse(
    (r) => r.url().includes("/api/competitor-research/domain-keywords") && r.request().method() === "POST",
    { timeout: 180000 }
  );
  await page.getByRole("button", { name: "Analyze" }).click();
  const resp = await kwResp;
  const kwJson = await resp.json().catch(() => ({}));
  if (kwJson.mock === true) throw new Error("GATE: API returned mock: true for domain-keywords");
  await page.getByTestId("keywords-tab-results").waitFor({ state: "visible", timeout: 120000 });
  await page.waitForTimeout(800);
  await assertNoMockBanner(page, "keywords");
  await page.screenshot({ path: path.join(OUT, "real-data-keywords.png"), fullPage: true });

  // --- Top pages ---
  await page.getByRole("button", { name: "Top Page Analysis" }).click();
  const pagesRespWait = page.waitForResponse(
    (r) => r.url().includes("/api/competitor-research/top-pages-analysis") && r.request().method() === "POST",
    { timeout: 180000 }
  );
  await page.getByRole("button", { name: "Analyze pages" }).click();
  const pagesResp = await pagesRespWait;
  const pagesJson = await pagesResp.json().catch(() => ({}));
  if (pagesJson.mock === true) throw new Error("GATE: API returned mock: true for top-pages-analysis");
  await page.getByTestId("pages-tab-results").waitFor({ state: "visible", timeout: 120000 });
  await assertNoMockBanner(page, "pages");
  const expandBtn = page.getByTestId("pages-tab-results").locator("tbody button.btn-square").first();
  if ((await expandBtn.count()) > 0) {
    await expandBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(OUT, "real-data-top-pages.png"), fullPage: true });

  // --- Topic selector (real keywords) ---
  await page.getByRole("button", { name: "Keyword Rankings" }).click();
  await page.getByTestId("keywords-tab-results").waitFor({ state: "visible", timeout: 60000 });
  await page.getByRole("button", { name: "Select all" }).click();
  await page.waitForTimeout(400);
  const ideasResp = page.waitForResponse(
    (r) => r.url().includes("/api/competitor-research/content-ideas") && r.request().method() === "POST",
    { timeout: 120000 }
  );
  await page.getByRole("button", { name: /Suggest topics from selection/i }).click();
  await ideasResp;
  await page.getByTestId("topic-suggestion-cards").waitFor({ state: "visible", timeout: 120000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "real-data-topic-selector.png"), fullPage: true });

  // --- Content pipeline ---
  await page.goto(`${BASE}/content-pipeline`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("heading", { name: "Content Pipeline" }).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "New Pipeline" }).click();
  await page.getByPlaceholder("e.g. Q2 Blog Content").fill("PTGLab Topics");
  await page.getByRole("textbox").nth(1).fill("western blot protocol");
  await page.getByRole("button", { name: "Create Pipeline" }).click();
  await page.waitForTimeout(2500);
  await expectPipelineVisible(page);
  await page.screenshot({ path: path.join(OUT, "real-data-pipeline.png"), fullPage: true });

  await browser.close();
  console.log("Benchmarking + pipeline screenshots OK");
}

async function expectPipelineVisible(page) {
  const t = await page.locator("body").innerText();
  if (t.includes("PTGLab Topics")) return;
  const err = page.locator(".bg-red-50, .alert-error");
  if ((await err.count()) > 0) {
    throw new Error("Pipeline create failed: " + (await err.first().innerText()));
  }
  throw new Error("GATE: PTGLab Topics pipeline not visible after create");
}

async function runFullAutoAndArticleShot() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const before = Date.now();
  const curl = await fetch(`${BASE}/api/content-magic/full-auto/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Complete Guide to Co-Immunoprecipitation",
      mainKeyword: "co-immunoprecipitation protocol",
    }),
  });
  const curlJson = await curl.json().catch(() => ({}));
  if (!curl.ok) {
    throw new Error(`full-auto/run failed ${curl.status}: ${curlJson.error || JSON.stringify(curlJson)}`);
  }
  const articleId = curlJson.articleId;
  if (!articleId) throw new Error("full-auto: no articleId in response");

  const deadline = Date.now() + 8 * 60_000;
  let adopted = false;
  while (Date.now() < deadline) {
    const { data } = await sb
      .from("content_magic_articles")
      .select("content_html, outline")
      .eq("id", articleId)
      .maybeSingle();
    const html = data?.content_html || "";
    const ph = html.length < 200 || html.includes("Generating content");
    const outlineStatus = data?.outline?.status;
    if (outlineStatus === "failed") {
      throw new Error("full-auto outline failed: " + (data?.outline?.last_error || "unknown"));
    }
    if (outlineStatus === "adopted" || !ph) {
      adopted = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 15000));
  }

  if (!adopted) throw new Error("GATE: full-auto article not adopted within 8 minutes");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
  await page.goto(`${BASE}/content-magic/${articleId}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(3000);
  const body = await page.locator("body").innerText();
  if (body.includes("Generating content") || body.includes("Start writing")) {
    await browser.close();
    throw new Error("GATE: article page still shows placeholder");
  }
  await page.screenshot({ path: path.join(OUT, "real-data-adopted-article.png"), fullPage: true });
  await browser.close();
  console.log("full-auto article OK:", articleId);
}

await main();
await runFullAutoAndArticleShot();
