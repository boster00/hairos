/**
 * Deterministic mock data when DataForSEO is unavailable or TOPIC_RESEARCH_MOCK=1
 */

export function mockTopPagesAnalysis(competitorDomain) {
  const base = competitorDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "competitor.com";

  const pages = [
    {
      url: `https://${base}/products/elisa-kits`,
      traffic_estimate: 12400,
      keywords_count: 89,
      top_keywords: [
        { keyword: "elisa kit", position: 3, search_volume: 8100, difficulty: 42 },
        { keyword: "elisa assay", position: 5, search_volume: 2900, difficulty: 38 },
        { keyword: "sandwich elisa", position: 7, search_volume: 1600, difficulty: 35 },
        { keyword: "elisa protocol", position: 4, search_volume: 1400, difficulty: 30 },
        { keyword: "hs elisa", position: 9, search_volume: 880, difficulty: 28 },
      ],
      all_keywords: [],
    },
    {
      url: `https://${base}/support/western-blot`,
      traffic_estimate: 8200,
      keywords_count: 56,
      top_keywords: [
        { keyword: "western blot antibody", position: 6, search_volume: 4400, difficulty: 45 },
        { keyword: "western blot protocol", position: 4, search_volume: 3600, difficulty: 32 },
        { keyword: "wb transfer", position: 11, search_volume: 900, difficulty: 22 },
        { keyword: "nitrocellulose membrane", position: 8, search_volume: 720, difficulty: 26 },
        { keyword: "blocking buffer western", position: 10, search_volume: 590, difficulty: 20 },
      ],
      all_keywords: [],
    },
  ];

  for (const p of pages) {
    const extra = [
      { keyword: "cell based assay", position: 15, search_volume: 2100, difficulty: 40 },
      { keyword: "immunoassay development", position: 18, search_volume: 450, difficulty: 33 },
    ];
    p.all_keywords = [...p.top_keywords, ...extra];
  }

  return {
    mock: true,
    competitor_domain: base,
    pages,
  };
}

export function mockDomainKeywords(domain) {
  const d = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "competitor.com";
  const keywords = [
    { keyword: "elisa kit", position: 4, rank_absolute: 4, search_volume: 8100, traffic_estimate: 1200, main_intent: "commercial" },
    { keyword: "primary antibody", position: 6, rank_absolute: 6, search_volume: 5400, traffic_estimate: 720, main_intent: "commercial" },
    { keyword: "western blot protocol", position: 3, rank_absolute: 3, search_volume: 3600, traffic_estimate: 890, main_intent: "informational" },
    { keyword: "cell proliferation assay", position: 8, rank_absolute: 8, search_volume: 1900, traffic_estimate: 210, main_intent: "informational" },
  ];
  return { mock: true, success: true, domain: d, keywords };
}

export function mockDomainPages(domain) {
  const d = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "competitor.com";
  return {
    mock: true,
    success: true,
    domain: d,
    pages: [
      { url: `https://${d}/products`, traffic_estimate: 15000, keywords_count: 120 },
      { url: `https://${d}/blog/protocols`, traffic_estimate: 9200, keywords_count: 64 },
    ],
  };
}

export function mockKeywordGap(competitorDomain, ourDomain) {
  const base = competitorDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "competitor.com";
  const our = (ourDomain || "bosterbio.com")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const rows = [
    {
      keyword: "elisa kit",
      competitor_rank: 2,
      our_rank: null,
      search_volume: 8100,
      difficulty: 44,
    },
    {
      keyword: "western blot troubleshooting",
      competitor_rank: 5,
      our_rank: 18,
      search_volume: 3200,
      difficulty: 36,
    },
    {
      keyword: "cell proliferation assay protocol",
      competitor_rank: 3,
      our_rank: null,
      search_volume: 1900,
      difficulty: 29,
    },
    {
      keyword: "ihc staining guide",
      competitor_rank: 7,
      our_rank: null,
      search_volume: 1200,
      difficulty: 31,
    },
  ].sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));

  return { mock: true, competitor_domain: base, our_domain: our, keywords: rows };
}
