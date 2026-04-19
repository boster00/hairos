import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { clusterGapKeywords } from "@/libs/topic-research/clusterGapKeywords";
import { mockKeywordGap } from "@/libs/topic-research/mockTopicResearch";
import {
  fetchDomainIntersectionKeywordGap,
  fetchRankingKeywords,
} from "@/libs/monkey/tools/dataForSeo";

function normalizeDomain(d) {
  return d
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

async function loadGapRows(competitor_domain, our_domain, limit, location_code, rank_lag_threshold) {
  const useMock =
    process.env.TOPIC_RESEARCH_MOCK === "1" ||
    !process.env.DATAFORSEO_LOGIN ||
    !process.env.DATAFORSEO_PASSWORD;

  if (useMock) {
    return mockKeywordGap(competitor_domain, our_domain).keywords;
  }

  const gapRes = await fetchDomainIntersectionKeywordGap(
    competitor_domain,
    our_domain,
    limit,
    location_code ?? null,
    "en"
  );
  if (!gapRes.isToolVerified) {
    throw new Error(gapRes.notes || "Gap fetch failed");
  }

  const ourUrl = our_domain.startsWith("http")
    ? our_domain
    : `https://${normalizeDomain(our_domain)}`;
  const ourRanked = await fetchRankingKeywords([ourUrl], limit, location_code ?? null);
  const rankByKeyword = new Map();
  if (ourRanked.isToolVerified && ourRanked.results?.[0]?.keywords) {
    for (const k of ourRanked.results[0].keywords) {
      rankByKeyword.set(k.keyword.toLowerCase(), k.rank_absolute ?? k.position);
    }
  }

  const lag = Math.max(1, Number(rank_lag_threshold) || 5);
  return gapRes.keywords
    .map((row) => {
      const ourR = rankByKeyword.get(row.keyword.toLowerCase());
      const competitor_rank = row.competitor_rank;
      if (ourR != null && competitor_rank != null && ourR <= competitor_rank + lag) {
        return null;
      }
      return {
        keyword: row.keyword,
        competitor_rank,
        our_rank: ourR ?? null,
        search_volume: row.search_volume,
        difficulty: row.difficulty,
      };
    })
    .filter(Boolean);
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
    keywords: inputKeywords,
    competitor_domain,
    our_domain = "bosterbio.com",
    limit = 80,
    location_code,
    rank_lag_threshold = 5,
  } = body;

  let gapRows = inputKeywords;
  if (Array.isArray(gapRows) && gapRows.length > 0 && typeof gapRows[0] === "string") {
    gapRows = gapRows.map((keyword) => ({ keyword, search_volume: 0 }));
  }

  if (!Array.isArray(gapRows) || gapRows.length === 0) {
    if (!competitor_domain?.trim()) {
      return NextResponse.json(
        { error: "Provide keywords[] or competitor_domain + our_domain" },
        { status: 400 }
      );
    }
    try {
      gapRows = await loadGapRows(
        competitor_domain.trim(),
        our_domain.trim(),
        Math.min(1000, Number(limit) || 80),
        location_code,
        rank_lag_threshold
      );
    } catch (e) {
      return NextResponse.json({ error: e?.message || "Failed to load gaps" }, { status: 502 });
    }
  }

  const normalized = gapRows.map((r) => ({
    keyword: r.keyword,
    search_volume: r.search_volume ?? 0,
    competitor_rank: r.competitor_rank,
    our_rank: r.our_rank,
    difficulty: r.difficulty,
  }));

  const clusters = clusterGapKeywords(normalized);

  return NextResponse.json({
    success: true,
    mock:
      process.env.TOPIC_RESEARCH_MOCK === "1" ||
      !process.env.DATAFORSEO_LOGIN ||
      !process.env.DATAFORSEO_PASSWORD,
    clusters,
    gap_keyword_count: normalized.length,
  });
}
