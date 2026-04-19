/**
 * Gated screenshots after DB verification shows ADOPTED OK.
 * Requires: npm run dev, CJGEO_DEV_FAKE_AUTH + NEXT_PUBLIC_CJGEO_DEV_FAKE_AUTH
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const BASE = process.env.ADOPT_FINAL_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: rows, error } = await sb
    .from("content_magic_articles")
    .select("id,title,content_html")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  const adopted = rows.find((a) => {
    const len = (a.content_html || "").length;
    const ph =
      len < 200 ||
      String(a.content_html || "").includes("Generating content");
    return !ph;
  });

  if (!adopted) {
    throw new Error("GATE FAIL: no adopted article in last 10 rows");
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto(`${BASE}/content-magic`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2500);
  const listText = await page.locator("body").innerText();
  if (
    listText.includes("Generating content...") &&
    !rows.some((r) => listText.includes(r.title?.slice(0, 30) || ""))
  ) {
    await browser.close();
    throw new Error("GATE FAIL: list looks like placeholder only");
  }
  // Softer gate: at least one real title from DB appears
  const titleHit = rows.some(
    (r) => r.title && listText.includes(r.title.slice(0, Math.min(25, r.title.length)))
  );
  if (!titleHit) {
    await browser.close();
    throw new Error("GATE FAIL: expected article title not visible in list");
  }

  await page.screenshot({ path: path.join(OUT, "adopt-final-list.png"), fullPage: true });

  await page.goto(`${BASE}/content-magic/${adopted.id}`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.waitForTimeout(3000);
  const articleText = await page.locator("body").innerText();
  if (
    articleText.includes("Generating content...") ||
    articleText.includes("Start writing...")
  ) {
    await browser.close();
    throw new Error("GATE FAIL: article page still shows placeholder copy");
  }

  await page.screenshot({ path: path.join(OUT, "adopt-final-article.png"), fullPage: true });
  await browser.close();
  console.log("OK:", adopted.id, adopted.title);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
