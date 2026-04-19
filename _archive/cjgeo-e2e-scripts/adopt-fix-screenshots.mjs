/**
 * Screenshots for full-auto adopt fix (Content Magic list + article detail).
 * Requires: npm run dev, .env.local with CJGEO_DEV_FAKE_AUTH=1, NEXT_PUBLIC_CJGEO_DEV_FAKE_AUTH=1,
 *   SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *
 *   node scripts/adopt-fix-screenshots.mjs
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });

const BASE = process.env.ADOPT_FIX_E2E_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto(`${BASE}/content-magic`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "adopt-fix-list.png"), fullPage: true });

  const listRes = await fetch(`${BASE}/api/content-magic/dev-articles`);
  const listJson = await listRes.json().catch(() => ({}));
  const articles = listJson.articles || [];
  const withBody = articles.find(
    (a) =>
      a.content_html &&
      String(a.content_html).length > 80 &&
      !String(a.content_html).includes("Generating content...")
  );
  const slug = withBody?.id || articles[0]?.id;
  if (!slug) {
    console.error("No articles from dev-articles API; capture article screenshot skipped.");
  } else {
    await page.goto(`${BASE}/content-magic/${slug}`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "adopt-fix-article.png"), fullPage: true });
  }

  await browser.close();
  console.log("Wrote screenshots/adopt-fix-list.png and adopt-fix-article.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
