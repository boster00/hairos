"use client";

import React, { useState, useEffect } from "react";
import { Loader, Check, X, LayoutTemplate } from "lucide-react";
import {
  readExampleTemplateFromSession,
  writeExampleTemplateToSession,
  parseExamplePageUrl,
  hostnameFromUrl,
} from "@/libs/content-magic/exampleTemplateStorage";

/**
 * Fetch example page HTML (template-from-url) and persist in sessionStorage
 * so Edit Draft / generate-outline can send it as examplePageTemplate.
 */
export default function ExamplePageTemplateControls({ className = "" }) {
  const [exampleLayoutOpen, setExampleLayoutOpen] = useState(false);
  const [exampleUrlInput, setExampleUrlInput] = useState("");
  const [exampleTemplate, setExampleTemplate] = useState(null);
  const [exampleFetchLoading, setExampleFetchLoading] = useState(false);
  const [exampleFetchError, setExampleFetchError] = useState(null);

  useEffect(() => {
    const saved = readExampleTemplateFromSession();
    if (saved) {
      setExampleTemplate(saved);
      setExampleUrlInput(saved.sourceUrl || "");
    }
  }, []);

  useEffect(() => {
    writeExampleTemplateToSession(exampleTemplate);
  }, [exampleTemplate]);

  const handleFetchExampleTemplate = async () => {
    setExampleFetchError(null);
    const parsed = parseExamplePageUrl(exampleUrlInput);
    if (parsed.error) {
      setExampleFetchError(parsed.error);
      return;
    }
    setExampleFetchLoading(true);
    try {
      const res = await fetch("/api/content-magic/template-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsed.url }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch template");
      }
      setExampleTemplate({
        sourceUrl: data.sourceUrl || parsed.url,
        domain: hostnameFromUrl(data.sourceUrl || parsed.url),
        templateHtml: data.templateHtml || "",
      });
    } catch (e) {
      setExampleFetchError(e?.message || "Request failed");
    } finally {
      setExampleFetchLoading(false);
    }
  };

  const handleClearExampleTemplate = () => {
    setExampleTemplate(null);
    setExampleFetchError(null);
    setExampleUrlInput("");
  };

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => setExampleLayoutOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md border transition-colors ${
          exampleTemplate
            ? "border-green-600 bg-green-50 text-green-900"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        aria-expanded={exampleLayoutOpen}
        data-testid="example-page-layout-toggle"
      >
        <LayoutTemplate className="w-4 h-4 shrink-0" />
        Example page layout
        {exampleTemplate && (
          <span className="text-xs font-normal text-green-800 truncate max-w-[140px]">
            ({exampleTemplate.domain || hostnameFromUrl(exampleTemplate.sourceUrl)})
          </span>
        )}
      </button>
      {exampleLayoutOpen && (
        <div className="flex flex-wrap items-center gap-2 justify-end max-w-xl">
          <input
            type="url"
            value={exampleUrlInput}
            onChange={(e) => {
              setExampleUrlInput(e.target.value);
              setExampleFetchError(null);
            }}
            placeholder="https://example.com/page"
            className="min-w-[200px] flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            disabled={exampleFetchLoading}
            data-testid="example-template-url-input"
          />
          <button
            type="button"
            onClick={handleFetchExampleTemplate}
            disabled={exampleFetchLoading || !exampleUrlInput.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            data-testid="example-template-fetch"
          >
            {exampleFetchLoading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            Fetch
          </button>
          {exampleTemplate && (
            <button
              type="button"
              onClick={handleClearExampleTemplate}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              title="Remove example template"
              data-testid="example-template-clear"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
          {exampleTemplate && !exampleFetchLoading && (
            <span
              className="inline-flex items-center gap-1 text-sm text-green-700"
              data-testid="example-template-success"
            >
              <Check className="w-4 h-4" />
              {exampleTemplate.domain || hostnameFromUrl(exampleTemplate.sourceUrl)}
            </span>
          )}
        </div>
      )}
      {exampleFetchError && (
        <p className="text-xs text-red-600 text-right max-w-md" data-testid="example-template-error">
          {exampleFetchError}
        </p>
      )}
      {exampleTemplate && (
        <p className="text-xs text-green-800 text-right max-w-md">
          Active: Edit Draft generation uses this page&apos;s HTML structure as reference (with profile custom
          templates when enabled).
        </p>
      )}
    </div>
  );
}
