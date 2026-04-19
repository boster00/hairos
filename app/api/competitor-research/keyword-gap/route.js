import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import {
  fetchDomainIntersectionKeywordGap,
  fetchRankingKeywords,
} from "@/libs/monkey/tools/dataForSeo";
import { mockKeywordGap } from "@/libs/topic-research/mockTopicResearch";

function normalizeDomain(d) {
  return d
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

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

  const {
    competitor_domain,
    our_domain = "bosterbio.com",
    limit = 100,
    location_code,
    rank_lag_threshold = 5,
  } = body;

  if (!competitor_domain?.trim() || !our_domain?.trim()) {
    return NextResponse.json(
      { error: "competitor_domain and our_domain are required" },
      { status: 400 }
    );
  }

  const useMock =
    process.env.TOPIC_RESEARCH_MOCK === "1" ||
    !process.env.DATAFORSEO_LOGIN ||
    !process.env.DATAFORSEO_PASSWORD;

  if (useMock) {
    const mock = mockKeywordGap(competitor_domain, our_domain);
    return NextResponse.json({ success: true, ...mock });
  }

  const comp = competitor_domain.trim();
  const ours = our_domain.trim();
  const loc = location_code ?? null;
  const lim = Math.min(1000, Math.max(1, Number(limit) || 100));
  const lag = Math.max(1, Number(rank_lag_threshold) || 5);

  const gapRes = await fetchDomainIntersectionKeywordGap(comp, ours, lim, loc, "en");
  if (!gapRes.isToolVerified) {
    return NextResponse.json(
      { error: gapRes.notes || "Keyword gap fetch failed" },
      { status: 502 }
    );
  }

  const ourUrl = ours.startsWith("http") ? ours : `https://${normalizeDomain(ours)}`;
  const ourRanked = await fetchRankingKeywords([ourUrl], lim, loc);
  const rankByKeyword = new Map();
  if (ourRanked.isToolVerified && ourRanked.results?.[0]?.keywords) {
    for (const k of ourRanked.results[0].keywords) {
      rankByKeyword.set(k.keyword.toLowerCase(), k.rank_absolute ?? k.position);
    }
  }

  const keywords = gapRes.keywords.map((row) => {
    const ourR = rankByKeyword.get(row.keyword.toLowerCase());
    let our_rank = ourR ?? null;
    let status = "gap";
    if (our_rank != null && row.competitor_rank != null && our_rank <= row.competitor_rank + lag) {
      status = "not_worse";
    }
    return {
      keyword: row.keyword,
      competitor_rank: row.competitor_rank,
      our_rank,
      search_volume: row.search_volume,
      difficulty: row.difficulty,
      status,
    };
  });

  const filtered = keywords.filter((k) => k.status === "gap");
  filtered.sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));

  return NextResponse.json({
    success: true,
    mock: false,
    competitor_domain: normalizeDomain(comp),
    our_domain: normalizeDomain(ours),
    rank_lag_threshold: lag,
    keywords: filtered,
  });
}
