/**
 * Generates PNGs documenting the public article API flow (curl output or placeholders).
 *   node scripts/public-api-screenshots.mjs
 *
 * Optional env: PUBLIC_API_BASE, PUBLIC_API_TEST_KEY
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const OUT = path.join(process.cwd(), "screenshots");
const BASE = process.env.PUBLIC_API_BASE || "http://127.0.0.1:3000";
const KEY = process.env.PUBLIC_API_TEST_KEY || "";

async function pngWithText(filename, lines) {
  const text = lines.join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
    <rect width="100%" height="100%" fill="#f8fafc"/>
    <text x="24" y="40" font-family="monospace" font-size="14" fill="#0f172a">${escapeXml(text)}</text>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(OUT, filename), buf);
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  let postSample = 'HTTP 202\n{ "job_id": "<uuid>", "status": "pending" }';
  let getSample =
    'HTTP 200\n{ "job_id": "<uuid>", "status": "completed", "article_id": "<uuid>", "title": "...", "content_html": "<article>...</article>" }';

  if (KEY) {
    try {
      const postRes = await fetch(`${BASE}/api/v1/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": KEY },
        body: JSON.stringify({
          title: "API screenshot article",
          prompt: "Short technical overview for validation screenshot.",
          main_keyword: "test keyword",
        }),
      });
      const postJson = await postRes.json().catch(() => ({}));
      postSample = `POST ${postRes.status}\n${JSON.stringify(postJson, null, 2)}`;
      if (postRes.ok && postJson.job_id) {
        const getRes = await fetch(`${BASE}/api/v1/articles/${postJson.job_id}`, {
          headers: { "x-api-key": KEY },
        });
        const getJson = await getRes.json().catch(() => ({}));
        getSample = `GET ${getRes.status}\n${JSON.stringify(getJson, null, 2).slice(0, 3500)}`;
      }
    } catch (e) {
      postSample += `\n(curl failed: ${e.message})`;
    }
  }

  await pngWithText("public-api-db-tables.png", [
    "Database dashboard (manual)",
    "",
    "Tables: public.external_api_keys, public.article_jobs",
    "",
    "Open Table Editor after applying the migration (CLI or SQL editor).",
  ]);

  await pngWithText("public-api-post-articles.png", ["POST /api/v1/articles", "", postSample]);

  await pngWithText("public-api-get-article-job.png", ["GET /api/v1/articles/{job_id}", "", getSample]);

  console.log("Wrote screenshots/public-api-db-tables.png, public-api-post-articles.png, public-api-get-article-job.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
