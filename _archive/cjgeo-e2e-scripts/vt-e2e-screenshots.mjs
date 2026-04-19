/**
 * Visibility Tracker UI walkthrough with mocked VT APIs (no real Supabase).
 * Requires: npm run dev on port 3000, CJGEO_DEV_FAKE_AUTH=1 in .env.local.
 *
 *   node scripts/vt-e2e-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.VT_E2E_BASE_URL || "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "screenshots");

const PROJECT_ID = "vt-e2e-bosterbio";
const DOMAIN = "bosterbio.com";
const BRAND_TERMS = ["Boster Bio", "Boster"];
const KEYWORD_STRINGS = [
  "ELISA kit",
  "western blot antibody",
  "cell proliferation assay",
];
const PROMPT_TEXT = "What is the best ELISA kit supplier?";
const PROMPT_MODELS = ["chatgpt", "perplexity"];
const RUN_ID = "vt-e2e-run-1";

let keywords = [];
let prompts = [];
let projectRow = null;
/** @type {Array<object>} */
let reportRuns = [];
let activeRun = null;

function kwRows() {
  return KEYWORD_STRINGS.map((keyword, i) => ({
    id: `kw-e2e-${i + 1}`,
    keyword,
    project_id: PROJECT_ID,
    is_active: true,
  }));
}

function promptRows() {
  return [
    {
      id: "pr-e2e-1",
      prompt_text: PROMPT_TEXT,
      models: PROMPT_MODELS,
      project_id: PROJECT_ID,
      is_active: true,
    },
  ];
}

function projectGetJson() {
  return {
    success: true,
    project: {
      id: PROJECT_ID,
      domain: DOMAIN,
      brand_terms: BRAND_TERMS,
      cadence: "weekly",
      last_run_at: projectRow?.last_run_at ?? null,
    },
    keywords,
    prompts,
  };
}

function projectsListJson() {
  if (!projectRow) {
    return { success: true, projects: [] };
  }
  return {
    success: true,
    projects: [
      {
        ...projectRow,
        keyword_count: keywords.length,
        prompt_count: prompts.length,
      },
    ],
  };
}

function runsListJson() {
  return { success: true, runs: reportRuns };
}

function reportHistoryJson() {
  return { success: true, project_id: PROJECT_ID, runs: reportRuns };
}

function runStatusJson() {
  if (activeRun) {
    return {
      active: true,
      run_id: activeRun.run_id,
      status: activeRun.status,
    };
  }
  return { active: false };
}

function fulfill(route, status, json) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(json),
  });
}

async function setupMockRoutes(page) {
  await page.route((url) => url.pathname.startsWith("/api/visibility_tracker"), async (route) => {
    const req = route.request();
    const urlObj = new URL(req.url());
    const p = urlObj.pathname;
    const method = req.method();

    try {
      if (p === "/api/visibility_tracker/projects" && method === "GET") {
        return fulfill(route, 200, projectsListJson());
      }

      if (p === "/api/visibility_tracker/runs" && method === "GET") {
        return fulfill(route, 200, runsListJson());
      }

      if (p.startsWith("/api/visibility_tracker/projects/") && p.endsWith("/report-history")) {
        return fulfill(route, 200, reportHistoryJson());
      }

      if (p.startsWith("/api/visibility_tracker/projects/") && p.endsWith("/run-status")) {
        return fulfill(route, 200, runStatusJson());
      }

      if (p === "/api/visibility_tracker/project" && method === "GET") {
        const pid = urlObj.searchParams.get("projectId");
        if (pid !== PROJECT_ID) {
          return fulfill(route, 404, { error: "Project not found" });
        }
        return fulfill(route, 200, projectGetJson());
      }

      if (p === "/api/visibility_tracker/project" && method === "POST") {
        const body = req.postDataJSON() || {};
        if (!body.projectId) {
          projectRow = {
            id: PROJECT_ID,
            domain: body.domain || DOMAIN,
            brand_terms: body.brand_terms || BRAND_TERMS,
            cadence: body.cadence || "weekly",
          };
          keywords = [];
          prompts = [];
          return fulfill(route, 200, {
            success: true,
            project: projectRow,
          });
        }
        projectRow = {
          ...projectRow,
          domain: body.domain,
          brand_terms: body.brand_terms,
          cadence: body.cadence,
        };
        return fulfill(route, 200, { success: true, project: projectRow });
      }

      if (p === "/api/visibility_tracker/keywords" && method === "POST") {
        const body = req.postDataJSON() || {};
        keywords = (body.keywords || []).map((k, i) => ({
          id: k.id || `kw-e2e-${i + 1}`,
          keyword: k.keyword,
          project_id: PROJECT_ID,
          is_active: true,
        }));
        return fulfill(route, 200, { success: true, keywords });
      }

      if (p === "/api/visibility_tracker/prompts" && method === "POST") {
        const body = req.postDataJSON() || {};
        const list = body.prompts || [];
        const built = [];
        let ni = 0;
        for (const item of list) {
          if (item.id) {
            const existing = prompts.find((x) => x.id === item.id);
            if (existing) built.push(existing);
          } else {
            ni += 1;
            built.push({
              id: `pr-e2e-${ni}`,
              prompt_text: item.prompt_text || item.promptText,
              models: item.models || ["chatgpt"],
              project_id: PROJECT_ID,
              is_active: true,
            });
          }
        }
        prompts = built;
        return fulfill(route, 200, { success: true, prompts });
      }

      if (p === "/api/visibility_tracker/cron/run-now" && method === "POST") {
        const now = new Date().toISOString();
        activeRun = { run_id: RUN_ID, status: "running" };
        reportRuns = [
          {
            id: RUN_ID,
            started_at: now,
            finished_at: null,
            status: "running",
            error_summary: null,
            seo: [],
            ai: [],
          },
        ];
        return fulfill(route, 200, {
          success: true,
          jobs_created: 5,
          run_ids: [RUN_ID],
          worker_triggered: true,
        });
      }

      return fulfill(route, 501, {
        error: "E2E mock: unhandled",
        path: p,
        method,
      });
    } catch (e) {
      return fulfill(route, 500, { error: String(e?.message || e) });
    }
  });
}

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("Wrote", file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await setupMockRoutes(page);

  // Step 1 — app up (public home)
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot(page, "vt-test-1.png");

  // Step 2–3 — visibility tracking list
  await page.goto(`${BASE}/geo-seo-visibility-tracking`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /AI\+SEO Visibility Tracking/i }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, "vt-test-2.png");

  // Step 3 — new project form
  await page.getByRole("link", { name: /Add project/i }).first().click();
  await page.waitForURL("**/geo-seo-visibility-tracking/new**");
  await shot(page, "vt-test-3.png");

  // Step 4 — create project
  await page.fill('input[placeholder="example.com"]', DOMAIN);
  await page.getByPlaceholder("Brand Name, Acme").fill("Boster Bio, Boster");
  await page.click('button[type="submit"]');
  await page.waitForURL(`**/geo-seo-visibility-tracking/${PROJECT_ID}/edit**`);
  await shot(page, "vt-test-4.png");

  // Step 5–6 — keywords + prompts
  await page.getByPlaceholder(/keyword one/i).fill(KEYWORD_STRINGS.join("\n"));
  await page.getByRole("button", { name: /Save keywords/i }).click();
  await page.waitForTimeout(400);

  await page.getByPlaceholder("Prompt text").fill(PROMPT_TEXT);
  await page.getByRole("checkbox", { name: "perplexity" }).check();
  await page.getByRole("button", { name: "Add prompt" }).click();
  await page.getByRole("button", { name: /Save prompts/i }).click();
  await page.waitForTimeout(400);

  // Step 7 — project dashboard (view)
  await page.goto(`${BASE}/geo-seo-visibility-tracking/${PROJECT_ID}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);
  await shot(page, "vt-test-7.png");

  // Step 8 — Run now
  await page.getByRole("button", { name: /Run now/i }).click();
  await page.waitForTimeout(800);
  await shot(page, "vt-test-8.png");

  // Step 9 — simulate completed run after 60s (real wait for user request)
  console.log("Waiting 60s (step 9)...");
  await page.waitForTimeout(60_000);

  const finished = new Date().toISOString();
  activeRun = null;
  keywords = kwRows();
  prompts = promptRows();
  if (projectRow) {
    projectRow = { ...projectRow, last_run_at: finished };
  }
  reportRuns = [
    {
      id: RUN_ID,
      started_at: reportRuns[0]?.started_at || finished,
      finished_at: finished,
      status: "success",
      error_summary: null,
      seo: keywords.map((k, i) => ({
        keyword_id: k.id,
        keyword: k.keyword,
        rank: 3 + i,
        best_url: `https://${DOMAIN}/p${i + 1}`,
        engine: "google",
      })),
      ai: prompts.flatMap((pr) =>
        (pr.models || []).map((model) => ({
          prompt_id: pr.id,
          prompt_text: pr.prompt_text,
          model,
          mentions_brand: model === "chatgpt",
          mentions_domain: true,
          citations_count: model === "perplexity" ? 2 : 1,
        }))
      ),
    },
  ];

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot(page, "vt-test-9.png");

  await page.locator("text=Keyword rankings").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "vt-test-11.png");

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
