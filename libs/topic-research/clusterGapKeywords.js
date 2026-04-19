/**
 * Simple word-overlap clustering for gap keywords (no AI required).
 * @param {Array<{ keyword: string, search_volume?: number }>} keywords
 * @returns {Array<{ id: string, label: string, keywords: typeof keywords, suggested_title: string, target_keyword: string }>}
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "for", "to", "in", "on", "of", "with", "vs", "how", "what",
  "best", "top", "guide", "kit", "assay", "test", "protocol", "cell", "cells",
]);

function tokens(phrase) {
  return String(phrase || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function scoreTokenOverlap(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let n = 0;
  for (const t of ta) if (tb.has(t)) n += 1;
  return n / Math.min(ta.size, tb.size);
}

export function clusterGapKeywords(keywordRows) {
  const list = [...keywordRows].filter((r) => r.keyword);
  if (list.length === 0) return [];

  const used = new Set();
  const clusters = [];
  let idx = 0;

  for (let i = 0; i < list.length; i++) {
    if (used.has(i)) continue;
    const seed = list[i];
    const group = [seed];
    used.add(i);
    for (let j = i + 1; j < list.length; j++) {
      if (used.has(j)) continue;
      const sim = scoreTokenOverlap(seed.keyword, list[j].keyword);
      if (sim >= 0.35) {
        group.push(list[j]);
        used.add(j);
      }
    }
    const vol = (r) => r.search_volume ?? 0;
    group.sort((a, b) => vol(b) - vol(a));
    const target = group[0];
    const labelTokens = tokens(target.keyword).slice(0, 3);
    const label = labelTokens.length ? labelTokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") : target.keyword;
    clusters.push({
      id: `cluster-${idx++}`,
      label,
      keywords: group,
      suggested_title: `${label}: practical guide and comparison`,
      target_keyword: target.keyword,
    });
  }

  clusters.sort(
    (a, b) =>
      Math.max(...b.keywords.map((k) => k.search_volume ?? 0)) -
      Math.max(...a.keywords.map((k) => k.search_volume ?? 0))
  );

  return clusters;
}
