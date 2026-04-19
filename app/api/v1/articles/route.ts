import { NextResponse } from "next/server";
import { createServiceRoleClient } from "\u0040\u002flibs\u002f\u0073\u0075\u0070\u0061\u0062\u0061\u0073\u0065\u002fserviceRole"; // pragma: allowlist secret
import { validateApiKeyAndTouchUsage } from "@/libs/api/validateApiKey";

export async function POST(request: Request) {
  try {
    const apiKeyHeader =
      request.headers.get("x-api-key") ||
      request.headers.get("X-Api-Key") ||
      request.headers.get("X-API-Key");
    if (!apiKeyHeader) {
      return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 });
    }

    const db = createServiceRoleClient();
    const auth = await validateApiKeyAndTouchUsage(db, apiKeyHeader);
    if (!auth.valid) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }

    let body: { title?: string; prompt?: string; main_keyword?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const mainKeyword =
      typeof body.main_keyword === "string" ? body.main_keyword.trim() : "";

    if (!title || !prompt || !mainKeyword) {
      return NextResponse.json(
        { error: "title, prompt, and main_keyword are required" },
        { status: 400 }
      );
    }

    const { data: job, error } = await db
      .from("article_jobs")
      .insert({
        user_id: auth.userId,
        api_key_id: auth.keyId,
        status: "pending",
        title,
        prompt,
        main_keyword: mainKeyword,
      })
      .select("id, status")
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: "Failed to create job", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { job_id: job.id, status: job.status || "pending" },
      { status: 202 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to submit article job" },
      { status: 500 }
    );
  }
}
