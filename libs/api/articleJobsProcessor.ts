import { createServiceRoleClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserviceRole"; // pragma: allowlist secret
import { runWriteArticleLandingForJob } from "@/libs/api/runArticleJobWriteLanding";

const BATCH_LIMIT = 3;

export async function processArticleJobsBatch(): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const db = createServiceRoleClient();

  const { data: pending, error: qErr } = await db
    .from("article_jobs")
    .select("id, user_id, title, prompt, main_keyword")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (qErr) {
    return { processed: 0, errors: [qErr.message] };
  }

  if (!pending?.length) {
    return { processed: 0, errors: [] };
  }

  let processed = 0;
  const now = new Date().toISOString();

  for (const job of pending) {
    const { error: lockErr } = await db
      .from("article_jobs")
      .update({ status: "processing", started_at: now, updated_at: now })
      .eq("id", job.id)
      .eq("status", "pending");

    if (lockErr) {
      errors.push(`${job.id}: ${lockErr.message}`);
      continue;
    }

    const result = await runWriteArticleLandingForJob({
      title: job.title,
      prompt: job.prompt,
      mainKeyword: job.main_keyword,
    });

    if ("error" in result) {
      await db
        .from("article_jobs")
        .update({
          status: "failed",
          error_message: result.error,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      errors.push(`${job.id}: ${result.error}`);
      continue;
    }

    const html = result.html;
    const { data: article, error: insErr } = await db
      .from("content_magic_articles")
      .insert({
        user_id: job.user_id,
        title: job.title,
        content_html: html,
        status: "draft",
        type: "API_JOB",
        context: {
          source: "external_api_article_job",
          job_id: job.id,
          main_keyword: job.main_keyword,
        },
      })
      .select("id")
      .single();

    if (insErr || !article) {
      await db
        .from("article_jobs")
        .update({
          status: "failed",
          error_message: insErr?.message || "Failed to insert article",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      errors.push(`${job.id}: insert article failed`);
      continue;
    }

    await db
      .from("article_jobs")
      .update({
        status: "completed",
        result_article_id: article.id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    processed += 1;
  }

  return { processed, errors };
}
