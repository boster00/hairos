import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { fetchTopPagesWithKeywordsAndGaps } from "@/libs/monkey/tools/dataForSeo";
import { mockTopPagesAnalysis } from "@/libs/topic-research/mockTopicResearch";

export async function POST(request) {
  if (process.env.CJGEO_DEV_FAKE_AUTH !== "1") {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { competitor_domain, our_domain = "bosterbio.com", page_limit = 15, location_code } = body;
  if (!competitor_domain?.trim()) {
    return NextResponse.json({ error: "competitor_domain is required" }, { status: 400 });
  }

  const useMock =
    process.env.TOPIC_RESEARCH_MOCK === "1" ||
    !process.env.DATAFORSEO_LOGIN ||
    !process.env.DATAFORSEO_PASSWORD;

  if (useMock) {
    const mock = mockTopPagesAnalysis(competitor_domain);
    return NextResponse.json({ success: true, ...mock });
  }

  const result = await fetchTopPagesWithKeywordsAndGaps(
    competitor_domain.trim(),
    (our_domain || "bosterbio.com").trim(),
    Math.min(20, Number(page_limit) || 15),
    50,
    100,
    location_code ?? null
  );

  if (!result.isToolVerified) {
    return NextResponse.json(
      { error: result.notes || "Analysis failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    mock: false,
    competitor_domain: competitor_domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0],
    our_domain: our_domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0],
    pages: result.pages,
  });
}
