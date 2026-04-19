import { NextResponse } from "next/server";
import { createServiceRoleClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserviceRole"; // pragma: allowlist secret
import { validateApiKeyLookup } from "@/libs/api/validateApiKey";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;
    if (!jobId) {
      return NextResponse.json({ error: "job id is required" }, { status: 400 });
    }

    const apiKeyHeader =
      request.headers.get("x-api-key") ||
      request.headers.get("X-Api-Key") ||
      request.headers.get("X-API-Key");
    if (!apiKeyHeader) {
      return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 });
    }

    const db = createServiceRoleClient();
    const auth = await validateApiKeyLookup(db, apiKeyHeader);
    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }

    const { data: job, error } = await db
      .from("article_jobs")
      .select("id, user_id, status, title, result_article_id, error_message")
      .eq("id", jobId)
      .maybeSingle();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.user_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status === "pending" || job.status === "processing") {
      return NextResponse.json({
        job_id: job.id,
        status: job.status,
        message: "Article is being generated",
      });
    }

    if (job.status === "failed") {
      return NextResponse.json({
        job_id: job.id,
        status: "failed",
        error: job.error_message || "Unknown error",
      });
    }

    if (job.status === "completed" && job.result_article_id) {
      const { data: article, error: aErr } = await db
        .from("content_magic_articles")
        .select("id, title, content_html")
        .eq("id", job.result_article_id)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (aErr || !article) {
        return NextResponse.json(
          { error: "Result article not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        job_id: job.id,
        status: "completed",
        article_id: article.id,
        title: article.title,
        content_html: article.content_html,
      });
    }

    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      message: "Article is being generated",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load job" },
      { status: 500 }
    );
  }
}
