"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Save, Eye, EyeOff, Code } from "lucide-react";
import "@/app/(private)/(shell)/content-magic/editor.css";
import {
  syncQuickActionPreviewShadow,
  ensureQuickActionPreviewShadowHost,
  attachShadowHostMediaWidthScaling,
} from "../utils/shadowPreviewSync";
import { findTopLevelBlockUnderEditor } from "@/libs/content-magic/utils/findTopLevelBlockUnderEditor";

/**
 * QuickActionPopupEditHtml
 * 
 * HTML code editor popup for editing section HTML directly.
 * Features:
 * - Code textarea with monospace font
 * - Preview pane toggle
 * - When customCssEnabled, preview renders in shadow DOM with custom CSS
 *
 * Preview uses syncQuickActionPreviewShadow (same as AI Edit / Change Template): mirrors
 * data-extracted-styles-wrapper, profile head, and inline style tags from the main editor.
 */
export default function QuickActionPopupEditHtml({
  isOpen,
  onClose,
  selectedElement,
  onSave,
  customCssEnabled = false,
  editorShadowRoot = null,
}) {
  const [htmlCode, setHtmlCode] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const previewShadowHostRef = useRef(null);

  // Initialize HTML code when dialog opens (top-level block under editor, same as AI Edit / Change Template)
  useEffect(() => {
    if (isOpen && selectedElement) {
      const editorRoot = selectedElement.closest?.(".editorContent");
      const blockElement = editorRoot
        ? findTopLevelBlockUnderEditor(editorRoot, selectedElement)
        : null;
      const block = blockElement || selectedElement;
      const elementHtml = block.outerHTML || block.innerHTML || "";
      setHtmlCode(elementHtml);
      setHasChanges(false);
    }
  }, [isOpen, selectedElement]);

  // Shadow preview: mirror editor chrome inside .editorContent + apply body via setQuickActionPreviewBodyHtml (see shadowPreviewSync)
  useEffect(() => {
    if (!isOpen || !showPreview || !previewShadowHostRef.current) return;
    const host = previewShadowHostRef.current;
    const { shadow, previewDiv } = ensureQuickActionPreviewShadowHost(host);
    if (!shadow || !previewDiv) return;
    syncQuickActionPreviewShadow({
      shadowRoot: shadow,
      editorShadowRoot,
      htmlString: htmlCode ?? "",
      selectedElement,
      previewDiv,
      setInnerHtml: true,
    });
  }, [
    isOpen,
    showPreview,
    htmlCode,
    selectedElement,
    editorShadowRoot,
    customCssEnabled,
  ]);

  useEffect(() => {
    if (!isOpen || !showPreview || !previewShadowHostRef.current?.shadowRoot) return;
    const lightHost = previewShadowHostRef.current;
    const scaleTarget = lightHost.shadowRoot.querySelector(".editorContent");
    if (!scaleTarget) return;
    return attachShadowHostMediaWidthScaling(lightHost, scaleTarget);
  }, [isOpen, showPreview]);

  const handleCodeChange = (e) => {
    setHtmlCode(e.target.value);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    if (onSave) {
      onSave(htmlCode);
    }

    setHasChanges(false);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[90] flex flex-col">
      {/* Header — same full-screen shell as QuickActionPopupAIFill (AI Edit) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Section HTML</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Edit the HTML code of the entire section containing your selection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Code Editor */}
        <div
          className={
            showPreview
              ? "w-1/2 min-w-0 border-r border-gray-200 flex flex-col min-h-0"
              : "w-full flex flex-col min-h-0"
          }
        >
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">HTML Code</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <textarea
              value={htmlCode}
              onChange={handleCodeChange}
              className="w-full h-full min-h-0 box-border px-4 py-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset bg-white"
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                fontSize: "13px",
                lineHeight: "1.6",
                tabSize: 2,
              }}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div className="w-1/2 min-w-0 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Preview</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-6 bg-gray-50">
              <div className="min-h-full flex flex-col">
                <p className="text-xs text-gray-500 mb-3 flex-shrink-0">
                  {customCssEnabled
                    ? "Preview with custom CSS applied"
                    : "Preview (custom CSS disabled)"}
                </p>
                <div
                  ref={previewShadowHostRef}
                  className="flex-1 min-h-[240px] rounded-lg border border-gray-200 overflow-hidden bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="text-sm text-gray-600">
          {hasChanges ? (
            <span className="text-amber-600 font-medium">Unsaved changes</span>
          ) : (
            <span className="text-gray-400">No changes</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
