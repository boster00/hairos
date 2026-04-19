"use client";

import { useState, useCallback, useEffect, useMemo, Fragment } from "react";
import {
  Search,
  Loader,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronRight,
  Send,
  AlertCircle,
} from "lucide-react";

export default function ContentBenchmarkingPage() {
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [activeTab, setActiveTab] = useState("keywords");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [keywordResults, setKeywordResults] = useState(null);
  const [pageAnalysis, setPageAnalysis] = useState(null);
  const [expandedPages, setExpandedPages] = useState(() => new Set());

  const [selectedKeywords, setSelectedKeywords] = useState(() => new Set());
  const [clusters, setClusters] = useState(null);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [topicError, setTopicError] = useState(null);

  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [pipelineMessage, setPipelineMessage] = useState(null);

  const keywordVolumeMap = useMemo(() => {
    const m = new Map();
    (keywordResults?.keywords || []).forEach((k) => {
      if (k.keyword) m.set(String(k.keyword).toLowerCase(), k.search_volume ?? 0);
    });
    (pageAnalysis?.pages || []).forEach((p) => {
      (p.all_keywords || p.top_keywords || []).forEach((k) => {
        if (k.keyword && !m.has(k.keyword.toLowerCase())) {
          m.set(k.keyword.toLowerCase(), k.search_volume ?? 0);
        }
      });
    });
    return m;
  }, [keywordResults, pageAnalysis]);

  const loadPipelines = useCallback(async () => {
    try {
      const res = await fetch("/api/content-pipeline");
      const data = await res.json();
      if (data.success && data.pipelines) {
        setPipelines(data.pipelines);
        setSelectedPipelineId((prev) => prev || data.pipelines[0]?.id || "");
      }
    } catch {
      setPipelines([]);
    }
  }, []);

  useEffect(() => {
    if (selectedKeywords.size > 0) loadPipelines();
  }, [selectedKeywords.size, loadPipelines]);

  const toggleKeyword = (kw) => {
    const k = String(kw).trim();
    if (!k) return;
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      const key = k.toLowerCase();
      const existing = [...next].find((x) => x.toLowerCase() === key);
      if (existing) next.delete(existing);
      else next.add(k);
      return next;
    });
  };

  const selectAllKeywordRows = () => {
    if (!keywordResults?.keywords?.length) return;
    setSelectedKeywords(new Set(keywordResults.keywords.map((k) => k.keyword).filter(Boolean)));
  };

  const clearSelection = () => {
    setSelectedKeywords(new Set());
    setClusters(null);
    setTopicError(null);
    setPipelineMessage(null);
  };

  const togglePageExpand = (url) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleAnalyzeKeywords = async () => {
    if (!competitorDomain.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/competitor-research/domain-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: competitorDomain.trim(), limit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch keywords");
      setKeywordResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopPagesAnalysis = async () => {
    if (!competitorDomain.trim()) return;
    setLoading(true);
    setError(null);
    setExpandedPages(new Set());
    try {
      const res = await fetch("/api/competitor-research/top-pages-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor_domain: competitorDomain.trim(),
          page_limit: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setPageAnalysis(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTopics = async () => {
    if (selectedKeywords.size === 0) return;
    setClustersLoading(true);
    setTopicError(null);
    setPipelineMessage(null);
    try {
      const keywords = [...selectedKeywords].map((keyword) => ({
        keyword,
        search_volume: keywordVolumeMap.get(keyword.toLowerCase()) ?? 0,
      }));
      const res = await fetch("/api/competitor-research/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Topic suggestions failed");
      setClusters(data.clusters || []);
    } catch (e) {
      setTopicError(e.message);
      setClusters(null);
    } finally {
      setClustersLoading(false);
    }
  };

  const handleSendToPipeline = async (cluster) => {
    setPipelineMessage(null);
    if (!selectedPipelineId) {
      await loadPipelines();
      setPipelineMessage({ type: "error", text: "Select a content pipeline first" });
      return;
    }
    try {
      const res = await fetch(
        `/api/content-pipeline/${encodeURIComponent(selectedPipelineId)}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                keyword: cluster.target_keyword,
                title: cluster.suggested_title,
              },
            ],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add to pipeline");
      setPipelineMessage({
        type: "success",
        text: data.dev_mock
          ? "Added (dev mock store)."
          : "Added to pipeline.",
      });
    } catch (e) {
      setPipelineMessage({ type: "error", text: e.message });
    }
  };

  const isKwSelected = (kw) => {
    const key = String(kw).toLowerCase();
    return [...selectedKeywords].some((x) => x.toLowerCase() === key);
  };

  const TopicSelectorPanel = () => {
    if (selectedKeywords.size === 0) return null;
    return (
      <div className="mt-6 space-y-4 border border-base-300 rounded-lg p-4 bg-base-200/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary badge-lg">{selectedKeywords.size} selected</span>
            <span className="text-sm text-base-content/70">AI Topic Selector</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSuggestTopics}
            disabled={clustersLoading}
          >
            {clustersLoading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Suggest topics from selection
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">Pipeline:</span>
          <select
            className="select select-bordered select-sm max-w-xs"
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
          >
            <option value="">Select pipeline…</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-xs" onClick={loadPipelines}>
            Refresh
          </button>
        </div>

        {topicError && (
          <p className="text-sm text-error" data-testid="topic-selector-error">
            {topicError}
          </p>
        )}
        {pipelineMessage && (
          <p
            className={`text-sm ${pipelineMessage.type === "error" ? "text-error" : "text-success"}`}
          >
            {pipelineMessage.text}
          </p>
        )}

        {clusters && clusters.length > 0 && (
          <div className="grid gap-3" data-testid="topic-suggestion-cards">
            {clusters.map((c) => (
              <div key={c.id} className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body py-3 px-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{c.label}</h3>
                      <p className="text-sm text-base-content/70 mt-1">
                        <strong>Title:</strong> {c.suggested_title}
                      </p>
                      <p className="text-sm">
                        <strong>Target keyword:</strong>{" "}
                        <span className="font-mono text-xs bg-base-200 px-1 rounded">
                          {c.target_keyword}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-primary btn-sm gap-1 shrink-0"
                      onClick={() => handleSendToPipeline(c)}
                    >
                      <Send className="w-4 h-4" />
                      Send to Pipeline
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.keywords.map((k) => (
                      <span key={k.keyword} className="badge badge-ghost badge-sm">
                        {k.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6" />
          Content Benchmarking
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Compare competitor keyword rankings and top organic pages. Select keywords to cluster into content topics
          and send to your pipeline. Uses DataForSEO when configured; otherwise mock data for testing.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-gray-600 block mb-1">Competitor domain</label>
          <input
            type="text"
            placeholder="e.g. abcam.com"
            value={competitorDomain}
            onChange={(e) => setCompetitorDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (activeTab === "keywords") handleAnalyzeKeywords();
                if (activeTab === "pages") handleTopPagesAnalysis();
              }
            }}
            className="border rounded px-3 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-end gap-2">
          {activeTab === "keywords" && (
            <button
              type="button"
              onClick={handleAnalyzeKeywords}
              disabled={loading || !competitorDomain.trim()}
              className="btn btn-primary flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Analyze
            </button>
          )}
          {activeTab === "pages" && (
            <button
              type="button"
              onClick={handleTopPagesAnalysis}
              disabled={loading || !competitorDomain.trim()}
              className="btn btn-primary flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Analyze pages
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap border-b border-base-300 mb-4 gap-1">
        {[
          { id: "keywords", label: "Keyword Rankings", icon: TrendingUp },
          { id: "pages", label: "Top Page Analysis", icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setError(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-500">Loading…</span>
        </div>
      )}

      {!loading && activeTab === "keywords" && keywordResults && (
        <div data-testid="keywords-tab-results">
          {keywordResults.mock && (
            <p
              data-testid="benchmarking-mock-banner-keywords"
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2 inline-block"
            >
              Mock data (TOPIC_RESEARCH_MOCK=1 or no DataForSEO keys)
            </p>
          )}
          <p className="text-sm text-gray-500 mb-3">
            Found <strong>{keywordResults.keywords.length}</strong> ranking keywords for{" "}
            <strong>{keywordResults.domain}</strong>
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" className="btn btn-sm btn-outline" onClick={selectAllKeywordRows}>
              Select all
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearSelection}>
              Clear selection
            </button>
          </div>
          <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-lg shadow-sm">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-10" />
                  <th>Keyword</th>
                  <th className="text-right">Position</th>
                  <th className="text-right">Search Volume</th>
                  <th className="text-right">Est. Traffic</th>
                  <th>Intent</th>
                </tr>
              </thead>
              <tbody>
                {keywordResults.keywords.map((kw, i) => (
                  <tr
                    key={i}
                    className={`cursor-pointer hover:bg-base-200/80 ${isKwSelected(kw.keyword) ? "bg-primary/5" : ""}`}
                    onClick={() => toggleKeyword(kw.keyword)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={isKwSelected(kw.keyword)}
                        onChange={() => toggleKeyword(kw.keyword)}
                        aria-label={`Select ${kw.keyword}`}
                      />
                    </td>
                    <td className="font-medium">{kw.keyword}</td>
                    <td className="text-right">#{kw.position ?? kw.rank_absolute ?? "—"}</td>
                    <td className="text-right">{kw.search_volume?.toLocaleString() ?? "—"}</td>
                    <td className="text-right text-success">
                      {kw.traffic_estimate?.toLocaleString() ?? "—"}
                    </td>
                    <td className="capitalize text-base-content/70">{kw.main_intent ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TopicSelectorPanel />
        </div>
      )}

      {!loading && activeTab === "pages" && pageAnalysis && (
        <div data-testid="pages-tab-results">
          {pageAnalysis.mock && (
            <p
              data-testid="benchmarking-mock-banner-pages"
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2 inline-block"
            >
              Mock data
            </p>
          )}
          <p className="text-sm text-gray-500 mb-3">
            Top pages for <strong>{pageAnalysis.competitor_domain}</strong> with estimated traffic and ranking
            keywords per URL.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                const all = new Set();
                (pageAnalysis.pages || []).forEach((p) => {
                  (p.all_keywords || []).forEach((k) => {
                    if (k.keyword) all.add(k.keyword);
                  });
                });
                setSelectedKeywords(all);
              }}
            >
              Select all page keywords
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearSelection}>
              Clear selection
            </button>
          </div>
          <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-lg shadow-sm">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>URL</th>
                  <th className="text-right">Est. traffic</th>
                  <th className="text-right">Keywords</th>
                  <th>Top 5 keywords</th>
                </tr>
              </thead>
              <tbody>
                {pageAnalysis.pages.map((page) => (
                  <Fragment key={page.url}>
                    <tr className="hover:bg-base-200/80">
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          onClick={() => togglePageExpand(page.url)}
                          aria-expanded={expandedPages.has(page.url)}
                        >
                          {expandedPages.has(page.url) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary break-all text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {page.url}
                        </a>
                      </td>
                      <td className="text-right font-medium text-success">
                        {page.traffic_estimate?.toLocaleString() ?? "—"}
                      </td>
                      <td className="text-right">{page.keywords_count?.toLocaleString() ?? "—"}</td>
                      <td className="text-xs max-w-md">
                        {(page.top_keywords || [])
                          .slice(0, 5)
                          .map((k) => k.keyword)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                    {expandedPages.has(page.url) && (
                      <tr className="bg-base-200/50">
                        <td colSpan={5} className="p-4">
                          <p className="text-xs font-semibold text-base-content/70 mb-2">
                            All keywords for this page ({(page.all_keywords || []).length}) — click to select for
                            topic suggestions
                          </p>
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                            {(page.all_keywords || []).map((k) => (
                              <label
                                key={`${page.url}-${k.keyword}`}
                                className={`cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                                  isKwSelected(k.keyword)
                                    ? "border-primary bg-primary/10"
                                    : "border-base-300 bg-base-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-xs"
                                  checked={isKwSelected(k.keyword)}
                                  onChange={() => toggleKeyword(k.keyword)}
                                />
                                <span>
                                  {k.keyword}
                                  {k.rank_absolute != null ? ` (#${k.rank_absolute})` : ""}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <TopicSelectorPanel />
        </div>
      )}

      {!loading && activeTab === "keywords" && !keywordResults && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/40">
          <Search className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">Enter a competitor domain</p>
          <p className="text-sm mt-1">Run Analyze to load keyword rankings</p>
        </div>
      )}

      {!loading && activeTab === "pages" && !pageAnalysis && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/40">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">Top page analysis</p>
          <p className="text-sm mt-1">Enter a domain and click Analyze pages</p>
        </div>
      )}
    </div>
  );
}
