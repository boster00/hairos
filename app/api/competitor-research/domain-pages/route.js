import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { fetchDomainOrganicPages } from "@/libs/monkey/tools/dataForSeo";
import { mockDomainPages } from "@/libs/topic-research/mockTopicResearch";

export async function POST(request) {
  if (process.env.CJGEO_DEV_FAKE_AUTH !== "1") {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain, limit = 20, location_code } = await request.json();
  if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  const useMock =
    process.env.TOPIC_RESEARCH_MOCK === "1" ||
    !process.env.DATAFORSEO_LOGIN ||
    !process.env.DATAFORSEO_PASSWORD;

  if (useMock) {
    return NextResponse.json(mockDomainPages(domain));
  }

  const result = await fetchDomainOrganicPages(cleanDomain, limit, location_code ?? null);

  if (!result.isToolVerified) {
    return NextResponse.json({ error: result.notes || "Failed to fetch pages" }, { status: 500 });
  }

  return NextResponse.json({ success: true, mock: false, domain: cleanDomain, pages: result.pages });
}
