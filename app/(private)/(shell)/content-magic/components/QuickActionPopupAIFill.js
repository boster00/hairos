"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Wand2, Sparkles } from "lucide-react";
import { initMonkey } from "@/libs/monkey";
import "@/app/(private)/(shell)/content-magic/editor.css";
import {
  syncQuickActionPreviewShadow,
  getBodyHtmlForPreview,
  ensureQuickActionPreviewShadowHost,
  attachShadowHostMediaWidthScaling,
  getEditorPreviewMirrorDiagnostics,
  getAiEditPreviewShadowSnapshot,
} from "../utils/shadowPreviewSync";
import { setQuickActionPreviewBodyHtml } from "@/libs/content-magic/utils/editorShadowChrome";
import { findTopLevelBlockUnderEditor } from "@/libs/content-magic/utils/findTopLevelBlockUnderEditor";
import { useWritingGuide } from "@/libs/content-magic/context/WritingGuideContext";
import { parseDraftStylesAndBody } from "@/libs/content-magic/utils/draftStylesPayload";

/**
 * When live mirror finds no `data-extracted-styles-wrapper` in the preview, prepend it from
 * serialized article/editor HTML (same leading block as ContentMagicEditor load path).
 * @returns {boolean} whether a node was inserted
 */
function injectExtractedStylesWrapperFromContentHtml(previewDiv, contentHtml) {
  if (!previewDiv || !contentHtml?.trim()) return false;
  if (previewDiv.querySelector(":scope > [data-extracted-styles-wrapper]")) return false;
  const { extractedWrapperHtml } = parseDraftStylesAndBody(contentHtml);
  if (!extractedWrapperHtml?.trim()) return false;
  previewDiv.querySelector("[data-preview-article-wrapper-injected='true']")?.remove();
  const tpl = document.createElement("template");
  tpl.innerHTML = extractedWrapperHtml.trim();
  const node = tpl.content.firstElementChild;
  if (!node || node.getAttribute("data-extracted-styles-wrapper") !== "true") return false;
  node.setAttribute("data-preview-article-wrapper-injected", "true");
  previewDiv.insertBefore(node, previewDiv.firstChild);
  return true;
}

/**
 * QuickActionPopupAIFill (AI Edit)
 * 
 * Full-screen popup for AI-powered content editing.
 * Provides a prompt-based interface with before/after preview.
 * The "after" version is contenteditable and used for serial editing.
 * When customCssEnabled is true, preview renders in a shadow DOM with custom CSS.
 */
export default function QuickActionPopupAIFill({
  isOpen,
  onClose,
  selectedElement,
  onApply,
  sectionElementToReplace = null,
  customCssEnabled = false,
  editorShadowRoot = null,
}) {
  const { getEditorHtml, article } = useWritingGuide();
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [beforeHtml, setBeforeHtml] = useState('');
  const [afterHtml, setAfterHtml] = useState('');
  const [activeTab, setActiveTab] = useState('preview');
  const [chatHistory, setChatHistory] = useState([]);
  const [originalParentSection, setOriginalParentSection] = useState(null);
  const [jsonPreviewItem, setJsonPreviewItem] = useState(null); // { index, raw } for dev-only floating json
  const [isDev, setIsDev] = useState(false);
  /** Bumps when preview body should be pushed from React (open, AI response, original→preview tab). */
  const [previewBodyNonce, setPreviewBodyNonce] = useState(0);
  const prevActiveTabRef = useRef(activeTab);

  // Compute isDev on client after mount (avoids SSR/stale closure issues)
  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location?.hostname ?? "" : "";
    const dev =
      /^(localhost|127\.0\.0\.1|\[::1\]|\.local)$/i.test(host) ||
      (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");
    setIsDev(dev);
  }, []);

  const previewShadowHostRef = useRef(null);
  const previewShadowContentRef = useRef(null);
  /** Dev: only warn once per open when editorShadowRoot is missing (avoids console spam on afterHtml updates). */
  const warnedNullEditorShadowRef = useRef(false);
  /** Dev: monotonic sequence for INIT → MOUNT → SYNC → NONCE order debugging (reset when dialog closes). */
  const aiEditLogSeqRef = useRef(0);
  /** One profile CSS inject per dialog open when preview still lacks data-custom-css-head after sync. */
  const aiEditProfileFallbackDoneRef = useRef(false);
  const setAfterHtmlRef = useRef(setAfterHtml);
  setAfterHtmlRef.current = setAfterHtml;

  /** Dev-only: log how preview shadow is created and how styles flow in (see shadowPreviewSync). */
  const logAiEditPreview = useCallback((detail) => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    console.log("[AI Edit Preview]", detail.stage ?? "log", detail);
  }, []);

  // Initialize before/after HTML when popup opens
  useEffect(() => {
    if (isOpen && selectedElement) {
      const editorRoot = selectedElement.closest?.(".editorContent");
      const blockElement = editorRoot
        ? findTopLevelBlockUnderEditor(editorRoot, selectedElement)
        : null;
      const block = blockElement || selectedElement;
      const initialHtml = block.outerHTML || block.innerHTML || "";

      setBeforeHtml(initialHtml);
      setAfterHtml(initialHtml);
      setOriginalParentSection(block);
      setPrompt('');
      setChatHistory([]); // Clear chat history when popup opens
      setPreviewBodyNonce((n) => n + 1);
      prevActiveTabRef.current = "preview";
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[AI Edit Preview] INIT_OPEN", {
          seq: ++aiEditLogSeqRef.current,
          initialHtmlChars: initialHtml.length,
          hasEditorRoot: !!editorRoot,
          blockTag: block?.tagName ?? null,
        });
      }
    }
  }, [isOpen, selectedElement]);

  useEffect(() => {
    if (!isOpen) {
      warnedNullEditorShadowRef.current = false;
      aiEditLogSeqRef.current = 0;
      aiEditProfileFallbackDoneRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (prevActiveTabRef.current === "original" && activeTab === "preview") {
      setPreviewBodyNonce((n) => n + 1);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  // Shadow host + content div (shared with other quick-action previews); input syncs React state when editable.
  // Deps: [isOpen] only — avoids removing input listener when afterHtml/beforeHtml change (sync effect populates content)
  useEffect(() => {
    if (!previewShadowHostRef.current || !isOpen) return;
    const host = previewShadowHostRef.current;
    const devLog =
      typeof window !== "undefined" && process.env.NODE_ENV !== "production";
    if (devLog) {
      console.info("[AI Edit Preview] MOUNT_SHADOW_HOST", { seq: ++aiEditLogSeqRef.current });
      console.groupCollapsed("[AI Edit Preview] mount: shadow host + contenteditable");
    }
    const { previewDiv } = ensureQuickActionPreviewShadowHost(host, {
      contentEditable: "true",
      previewLog: devLog ? logAiEditPreview : undefined,
    });
    if (devLog) {
      console.groupEnd();
    }
    if (!previewDiv) return;
    previewShadowContentRef.current = previewDiv;

    const onInput = () => {
      if (previewDiv.contentEditable === "true") {
        setAfterHtmlRef.current(previewDiv.innerHTML);
      }
    };
    previewDiv.addEventListener("input", onInput);

    return () => {
      previewDiv.removeEventListener("input", onInput);
      previewShadowContentRef.current = null;
    };
  }, [isOpen, logAiEditPreview]);

  // Match ContentMagicEditor: design width + scale when the preview pane is narrower than `data-media-width`.
  useEffect(() => {
    if (!isOpen || !previewShadowHostRef.current?.shadowRoot) return;
    const lightHost = previewShadowHostRef.current;
    const scaleTarget = lightHost.shadowRoot.querySelector(".editorContent");
    if (!scaleTarget) return;
    return attachShadowHostMediaWidthScaling(lightHost, scaleTarget);
  }, [isOpen]);

  // Draft + head + section styles; on preview tab do not overwrite body (contenteditable).
  useEffect(() => {
    if (!isOpen || !previewShadowHostRef.current?.shadowRoot) return;
    const shadow = previewShadowHostRef.current.shadowRoot;
    const previewDiv = shadow.querySelector(".editorContent");
    if (!previewDiv) return;
    const htmlStr = activeTab === "preview" ? afterHtml : beforeHtml;
    const devLog =
      typeof window !== "undefined" && process.env.NODE_ENV !== "production";
    if (devLog) {
      console.groupCollapsed(
        "[AI Edit Preview] sync pipeline (mirror → head → inline styles → body)"
      );
      if (!editorShadowRoot && !warnedNullEditorShadowRef.current) {
        warnedNullEditorShadowRef.current = true;
        console.warn(
          "[AI Edit Preview] editorShadowRoot is null — cannot mirror main editor chrome (data-extracted-styles-wrapper, profile CSS). Expect unstyled preview unless htmlString is a full document with head. Check WritingGuide editorRef.getShadowRoot()."
        );
      }
    }
    syncQuickActionPreviewShadow({
      shadowRoot: shadow,
      editorShadowRoot,
      htmlString: htmlStr ?? "",
      selectedElement,
      previewDiv,
      setInnerHtml: activeTab !== "preview",
      previewLog: devLog ? logAiEditPreview : undefined,
    });

    if (!previewDiv.querySelector(":scope > [data-extracted-styles-wrapper]")) {
      const contentForWrapper =
        (typeof getEditorHtml === "function" ? getEditorHtml() : "") || article?.content_html || "";
      injectExtractedStylesWrapperFromContentHtml(previewDiv, contentForWrapper);
    }

    if (
      customCssEnabled &&
      !previewDiv.querySelector("[data-custom-css-head]") &&
      !aiEditProfileFallbackDoneRef.current
    ) {
      aiEditProfileFallbackDoneRef.current = true;
      const shadowAtSchedule = shadow;
      void (async () => {
        try {
          const monkey = await initMonkey(true);
          const host = previewShadowHostRef.current;
          if (!host?.isConnected) return;
          const sh = host?.shadowRoot;
          if (!sh || sh !== shadowAtSchedule) return;
          const div = sh.querySelector(".editorContent");
          if (!div) return;
          if (div.querySelector("[data-custom-css-head]")) return;
          await monkey.applyCustomCssToShadowDom(sh, div);
        } catch (_) {
          aiEditProfileFallbackDoneRef.current = false;
        }
      })();
    }

    if (devLog) {
      console.groupEnd();
      const editorDiagnostics = getEditorPreviewMirrorDiagnostics(
        editorShadowRoot,
        selectedElement
      );
      const previewAfterSync = getAiEditPreviewShadowSnapshot(shadow, previewDiv);
      console.info(
        "[AI Edit Preview] STYLE_SNAPSHOT — editor vs preview after sync (expand if unstyled)",
        {
          seq: ++aiEditLogSeqRef.current,
          phase: "after-sync",
          activeTab,
          setInnerHtmlApplied: activeTab !== "preview",
          htmlStringChars: (htmlStr ?? "").length,
          editorShadowRootPropTruthy: !!editorShadowRoot,
          editorDiagnostics,
          previewAfterSync,
        }
      );
    }
    previewDiv.contentEditable = activeTab === "preview";
  }, [
    isOpen,
    activeTab,
    afterHtml,
    beforeHtml,
    selectedElement,
    editorShadowRoot,
    customCssEnabled,
    logAiEditPreview,
    getEditorHtml,
    article?.content_html,
  ]);

  // Push preview body only when nonce bumps (open, AI apply, original→preview) — not every keystroke.
  const afterHtmlRef = useRef(afterHtml);
  afterHtmlRef.current = afterHtml;
  useEffect(() => {
    if (!isOpen || activeTab !== "preview" || !previewShadowContentRef.current) return;
    const body = getBodyHtmlForPreview(afterHtmlRef.current ?? "");
    setQuickActionPreviewBodyHtml(previewShadowContentRef.current, body);
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      const el = previewShadowContentRef.current;
      const shadow = previewShadowHostRef.current?.shadowRoot ?? null;
      const snap = shadow && el ? getAiEditPreviewShadowSnapshot(shadow, el) : null;
      console.info("[AI Edit Preview] NONCE_BODY_PUSH", {
        seq: ++aiEditLogSeqRef.current,
        previewBodyNonce,
        bodyChars: body.length,
        afterHtmlRefChars: (afterHtmlRef.current ?? "").length,
        previewStillHasExtractedWrapper: !!el?.querySelector?.(
          ":scope > [data-extracted-styles-wrapper]"
        ),
        previewChildElementCount: el?.children?.length ?? 0,
        previewSnapshot: snap,
      });
    }
  }, [isOpen, activeTab, previewBodyNonce]);

  // Read current preview HTML from DOM when on preview tab (source of truth for manual edits)
  const getCurrentPreviewHtml = () => {
    if (activeTab !== "preview" || !previewShadowContentRef.current) return afterHtml;
    return previewShadowContentRef.current.innerHTML ?? afterHtml;
  };

  // Example prompts for user guidance
  const examplePrompts = [
    "Replace the content with: xxx",
    "Make xxx more concise",
    "Design svg icons for each item",
    "Add bullet points to summarize the key points",
  ];

  const handleApply = async () => {
    if (!prompt.trim()) {
      alert('Please provide instructions for the AI');
      return;
    }

    const htmlToEdit = getCurrentPreviewHtml();
    if (!htmlToEdit) {
      alert('No content to edit');
      return;
    }
    
    
    setProcessing(true);

    try {
      const requestPayload = {
        prompt: prompt,
        html: htmlToEdit
      };
      
      // Call server-side API route for AI editing
      const monkey = await initMonkey();
      const responseText = await monkey.apiCall('/api/content-magic/ai-edit', requestPayload);
      
      const data = JSON.parse(responseText);
      if (data.error) {
        throw new Error(data.error || 'AI Edit request failed');
      }
      
      
      
      
      // Update the "after" version with AI-edited content
      setAfterHtml(data.html);
      setPreviewBodyNonce((n) => n + 1);
      
      // Add to chat history (include raw response for dev json viewer)
      const currentPrompt = prompt; // Save before clearing
      const rawStr = JSON.stringify(data);
      
      setChatHistory(prev => [...prev, {
        prompt: currentPrompt,
        timestamp: new Date().toLocaleTimeString(),
        success: true,
        rawResponse: data
      }]);
      
      setPrompt(''); // Clear prompt for next edit
    } catch (err) {
      // Add failed attempt to chat history (include raw error for dev json viewer)
      const currentPrompt = prompt; // Save before clearing
      const errRaw = { error: err.message, name: err.name, stack: err.stack };
      
      setChatHistory(prev => [...prev, {
        prompt: currentPrompt,
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        error: err.message,
        rawResponse: errRaw
      }]);
      
      alert(`AI Edit failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    const htmlToApply = getCurrentPreviewHtml();

    if (onApply && htmlToApply) {
      const elementToReplace = originalParentSection || selectedElement;
      onApply(htmlToApply, elementToReplace);
    }
    onClose();
  };

  const handleAfterHtmlChange = (e) => {
    // Kept for backward compatibility; editing is now handled directly in the shadow DOM contentEditable div.
    setAfterHtml(e.target.innerHTML);
  };

  const handleExampleClick = (examplePrompt) => {
    setPrompt(examplePrompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[90] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Edit</h2>
            <p className="text-sm text-gray-500 mt-0.5">Edit content with AI instructions</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Prompt Input */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">AI Instructions</h3>
            <p className="text-xs text-gray-500 mt-0.5">Describe how you want to edit the content</p>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900 font-medium mb-1">💡 How to use</p>
              <p className="text-xs text-blue-800">
                Use like you would in AI LLM. A good strategy is asking AI to better target one of your target prompts/questions in this section.
              </p>
            </div>

            {/* Example Prompts */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Examples (click to use)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors border border-gray-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Your Instructions
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Type your instructions here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                onKeyDown={(e) => {
                  // Allow Ctrl+Enter or Cmd+Enter to submit
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleApply();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ctrl+Enter to apply
              </p>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={processing || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Apply AI Edit
                </>
              )}
            </button>

            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Chat History
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chatHistory.map((item, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg text-xs ${
                        item.success
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <span className={`font-medium ${
                          item.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {item.success ? '✓ Applied' : '✗ Failed'}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isDev && (
                            <button
                              type="button"
                              onClick={() => setJsonPreviewItem({ index, raw: item.rawResponse ?? null })}
                              className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                            >
                              json
                            </button>
                          )}
                          <span className="text-gray-500 text-xs">{item.timestamp}</span>
                        </div>
                      </div>
                      <p className={`text-xs ${
                        item.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {item.prompt}
                      </p>
                      {item.error && (
                        <p className="text-xs text-red-600 mt-1 italic">
                          Error: {item.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tabbed Preview */}
        <div className="w-2/3 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('original')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'original'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Show Original
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  {activeTab === "preview"
                    ? customCssEnabled
                      ? "AI-edited version - you can make manual edits here (custom CSS applied)"
                      : "AI-edited version - you can make manual edits here"
                    : "Original content for reference (read-only)"}
                </p>
                <div
                  ref={previewShadowHostRef}
                  className="min-h-[200px] rounded-lg border border-gray-200 overflow-hidden"
                  style={{ minHeight: "200px" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dev-only: floating JSON viewer for chat history item raw response */}
      {isDev && jsonPreviewItem != null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50"
          onClick={() => setJsonPreviewItem(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <span className="text-sm font-medium text-gray-700">Raw response (item #{jsonPreviewItem.index + 1})</span>
              <button
                type="button"
                onClick={() => setJsonPreviewItem(null)}
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
              {jsonPreviewItem.raw == null
                ? "No raw response stored for this item (e.g. from before this feature)."
                : typeof jsonPreviewItem.raw === "string"
                  ? jsonPreviewItem.raw
                  : JSON.stringify(jsonPreviewItem.raw, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <span>Make edits in the preview, then accept to apply changes</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Abandon Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!getCurrentPreviewHtml()}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Wand2 className="w-4 h-4" />
            Accept Changes
          </button>
        </div>
      </div>
    </div>
  );
}
