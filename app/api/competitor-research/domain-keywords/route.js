import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { fetchRankingKeywords } from "@/libs/monkey/tools/dataForSeo";
import { mockDomainKeywords } from "@/libs/topic-research/mockTopicResearch";

export async function POST(request) {
  if (process.env.CJGEO_DEV_FAKE_AUTH !== "1") {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain, limit = 50, location_code } = await request.json();
  if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });

  const useMock =
    process.env.TOPIC_RESEARCH_MOCK === "1" ||
    !process.env.DATAFORSEO_LOGIN ||
    !process.env.DATAFORSEO_PASSWORD;

  if (useMock) {
    return NextResponse.json(mockDomainKeywords(domain));
  }

  // Normalize domain to URL format for fetchRankingKeywords
  const domainUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  const result = await fetchRankingKeywords([domainUrl], limit, location_code ?? null);

  if (!result.isToolVerified) {
    return NextResponse.json({ error: result.notes || "Failed to fetch keywords" }, { status: 500 });
  }

  const keywords = result.results?.[0]?.keywords || [];

  // Add traffic estimates: position n -> 0.7^n * search_volume (capped at pos 100)
  const withTraffic = keywords.map(kw => {
    const pos = kw.position ?? kw.rank_absolute ?? 10;
    const vol = kw.search_volume ?? 0;
    const trafficEstimate = Math.round(Math.pow(0.7, pos) * vol);
    return { ...kw, traffic_estimate: trafficEstimate };
  });

  // Sort by traffic estimate descending
  withTraffic.sort((a, b) => (b.traffic_estimate ?? 0) - (a.traffic_estimate ?? 0));

  return NextResponse.json({ success: true, mock: false, domain, keywords: withTraffic });
}
