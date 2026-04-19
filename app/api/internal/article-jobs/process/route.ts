import { NextResponse } from "next/server";
import { processArticleJobsBatch } from "@/libs/api/articleJobsProcessor";

export const maxDuration = 300;

/**
 * POST /api/internal/article-jobs/process
 * Processes up to 3 pending article_jobs (CRON_SECRET).
 */
export async function POST(request: Request) {
  const cronSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.CRON_SECRET;
  if (!expected || cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { processed, errors } = await processArticleJobsBatch();
    return NextResponse.json({ success: true, processed, errors });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "article_jobs processing failed" },
      { status: 500 }
    );
  }
}
