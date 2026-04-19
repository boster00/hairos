import { NextResponse, after } from "next/server";
import { createServiceRoleClient } from "@/libs/supabase/serviceRole";
import { runFullAgentic } from "@/libs/full-agentic/runner";
import { isPipelineDevMock, mockTick } from "@/libs/content-pipeline/devMockStore";

export const maxDuration = 120;

export async function POST(request) {
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expectedSecret = process.env.CRON_SECRET || process.env.VT_CRON_SECRET;
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPipelineDevMock()) {
    const out = mockTick();
    return NextResponse.json({
      success: true,
      dev_mock: true,
      processed: out.processed,
      items: out.items,
    });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Find due active pipelines
  const { data: duePipelines } = await supabase
    .from("content_pipelines")
    .select("*")
    .eq("status", "active")
    .lte("next_run_at", now);

  if (!duePipelines?.length) {
    return NextResponse.json({ success: true, processed: 0, message: "No due pipelines" });
  }

  const processed = [];

  for (const pipeline of duePipelines) {
    try {
      // Get next pending item
      const { data: nextItem } = await supabase
        .from("content_pipeline_items")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .eq("status", "pending")
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (!nextItem) {
        // All items done — mark pipeline as completed
        await supabase.from("content_pipelines").update({ status: "completed", updated_at: now }).eq("id", pipeline.id);
        continue;
      }

      // Mark item as processing
      await supabase.from("content_pipeline_items").update({ status: "processing", updated_at: now }).eq("id", nextItem.id);

      // Create article
      const articleTitle = nextItem.title || nextItem.keyword;
      const { data: article, error: articleError } = await supabase
        .from("content_magic_articles")
        .insert({
          user_id: pipeline.user_id,
          title: articleTitle,
          status: "agentic_processing",
          context: {
            mainKeyword: nextItem.keyword,
            icp_id: pipeline.icp_id,
            offer_id: pipeline.offer_id,
            agenticState: {
              currentPhase: "starting",
              phaseMessage: "Pipeline: starting agentic creation...",
              startedAt: now,
              pipelineId: pipeline.id,
              pipelineItemId: nextItem.id,
            },
            isAgenticCreation: true,
            isPipelineItem: true,
          },
        })
        .select()
        .single();

      if (articleError) throw new Error(articleError.message);

      // Link item to article
      await supabase.from("content_pipeline_items").update({ article_id: article.id }).eq("id", nextItem.id);

      // Update pipeline next_run_at
      const nextRun = new Date(Date.now() + pipeline.frequency_hours * 60 * 60 * 1000).toISOString();
      await supabase.from("content_pipelines").update({
        next_run_at: nextRun,
        current_index: pipeline.current_index + 1,
        updated_at: now,
      }).eq("id", pipeline.id);

      processed.push({ pipelineId: pipeline.id, itemId: nextItem.id, articleId: article.id });

      // Run agentic pipeline in background
      const articleId = article.id;
      const itemId = nextItem.id;
      after(async () => {
        try {
          await runFullAgentic({ supabase, articleId });
          // Mark pipeline item as done
          await supabase.from("content_pipeline_items").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", itemId);
        } catch (e) {
          await supabase.from("content_pipeline_items").update({
            status: "failed",
            error_message: e.message,
            updated_at: new Date().toISOString(),
          }).eq("id", itemId);
          await supabase.from("content_magic_articles").update({ status: "draft" }).eq("id", articleId);
        }
      });
    } catch (e) {
      // Log error but continue with next pipeline
    }
  }

  return NextResponse.json({ success: true, processed: processed.length, items: processed });
}
