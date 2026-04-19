/**
 * Content Magic — Example page layout / template-from-url UI (Playwright).
 * Requires: npm run dev, CJGEO_DEV_FAKE_AUTH=1, NEXT_PUBLIC_CJGEO_DEV_FAKE_AUTH=1, CONTENT_MAGIC_TEMPLATE_MOCK=1
 *   node scripts/template-url-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.TEMPLATE_URL_E2E_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.route("**/api/credits**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );

  await page.goto(`${BASE}/content-magic`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("heading", { name: /Content Magic/i }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "template-url-1.png") });

  await page.getByTestId("example-page-layout-toggle").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "template-url-2.png") });

  await page.getByTestId("example-template-url-input").fill("https://example.com/product");
  await page.getByTestId("example-template-fetch").click();
  await page.getByTestId("example-template-success").waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "template-url-3.png") });

  await page.goto(`${BASE}/content-magic/dev/edit-draft-preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "template-url-4.png") });

  await page.goto(`${BASE}/content-magic`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("example-page-layout-toggle").click();
  await page.getByTestId("example-template-url-input").fill("%%%invalid%%%");
  await page.getByTestId("example-template-fetch").click();
  await page.getByTestId("example-template-error").waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "template-url-5.png") });

  await browser.close();
  console.log("Wrote screenshots/template-url-1.png … template-url-5.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
