"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, RefreshCw, Check } from "lucide-react";
import ShowTemplates from "@/libs/monkey/components/ShowTemplates";
import { initMonkey } from "@/libs/monkey";
import "@/app/(private)/(shell)/content-magic/editor.css";
import {
  syncQuickActionPreviewShadow,
  ensureQuickActionPreviewShadowHost,
  attachShadowHostMediaWidthScaling,
} from "../utils/shadowPreviewSync";
import { findTopLevelBlockUnderEditor } from "@/libs/content-magic/utils/findTopLevelBlockUnderEditor";

/**
 * QuickActionPopupChangeTemplate
 * 
 * Full-screen modal for changing/converting a section to a different template.
 * Shows current section preview (with editor styles) and available templates.
 * Uses AI to replace template content with original section content.
 * When customCssEnabled, left-panel preview renders in shadow DOM with custom CSS.
 *
 * Current-section preview uses syncQuickActionPreviewShadow (same as AI Edit / Edit HTML): mirrors
 * data-extracted-styles-wrapper, profile head, and inline style tags from the main editor.
 */
export default function QuickActionPopupChangeTemplate({
  isOpen,
  onClose,
  selectedElement,
  onApply,
  customCssEnabled = false,
  editorShadowRoot = null,
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertedHtml, setConvertedHtml] = useState(null);
  const [originalHtml, setOriginalHtml] = useState('');
  const [originalParentSection, setOriginalParentSection] = useState(null);
  const customInstructionsRef = useRef(null);
  const [keepPlaceholders, setKeepPlaceholders] = useState(false);
  const [templateMode, setTemplateMode] = useState("saved"); // "saved" | "url"
  const [exampleUrl, setExampleUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fetchingTemplate, setFetchingTemplate] = useState(false);
  const [fetchedTemplate, setFetchedTemplate] = useState(null); // { templateHtml, sourceUrl }

  const previewShadowHostRef = useRef(null);

  // Initialize original HTML when popup opens
  useEffect(() => {
    if (isOpen && selectedElement) {
      const editorRoot = selectedElement.closest?.(".editorContent");
      const blockElement = editorRoot
        ? findTopLevelBlockUnderEditor(editorRoot, selectedElement)
        : null;
      const block = blockElement || selectedElement;
      const initialHtml = block.outerHTML || block.innerHTML || "";

      setOriginalHtml(initialHtml);
      setOriginalParentSection(block);
      setConvertedHtml(null); // Reset converted HTML
      setSelectedTemplate(null); // Reset selected template
      if (customInstructionsRef.current) customInstructionsRef.current.value = '';
      setKeepPlaceholders(false); // Reset keep placeholders toggle
      setTemplateMode("saved");
      setExampleUrl("");
      setUploadedFile(null);
      setFetchedTemplate(null);
    }
  }, [isOpen, selectedElement]);

  // Shadow preview: mirror editor chrome inside .editorContent + apply body via setQuickActionPreviewBodyHtml (see shadowPreviewSync)
  useEffect(() => {
    if (!isOpen || !previewShadowHostRef.current) return;
    const host = previewShadowHostRef.current;
    const { shadow, previewDiv } = ensureQuickActionPreviewShadowHost(host);
    if (!shadow || !previewDiv) return;
    const htmlStr = convertedHtml || originalHtml || "";
    syncQuickActionPreviewShadow({
      shadowRoot: shadow,
      editorShadowRoot,
      htmlString: htmlStr,
      selectedElement,
      previewDiv,
      setInnerHtml: true,
    });
  }, [
    isOpen,
    selectedElement,
    editorShadowRoot,
    convertedHtml,
    originalHtml,
    customCssEnabled,
  ]);

  useEffect(() => {
    if (!isOpen || !previewShadowHostRef.current?.shadowRoot) return;
    const lightHost = previewShadowHostRef.current;
    const scaleTarget = lightHost.shadowRoot.querySelector(".editorContent");
    if (!scaleTarget) return;
    return attachShadowHostMediaWidthScaling(lightHost, scaleTarget);
  }, [isOpen]);

  const handleFetchTemplate = async () => {
    if (!exampleUrl.trim() && !uploadedFile) return;
    setFetchingTemplate(true);
    try {
      let response;
      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        if (exampleUrl.trim()) formData.append("url", exampleUrl.trim());
        response = await fetch("/api/content-magic/template-from-url", { method: "POST", body: formData });
      } else {
        response = await fetch("/api/content-magic/template-from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: exampleUrl.trim() }),
        });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch template");
      setFetchedTemplate({ templateHtml: data.templateHtml, sourceUrl: data.sourceUrl });
      setSelectedTemplate({ id: "url-template", name: data.sourceUrl || "Example page", html: data.templateHtml });
      setConvertedHtml(null);
    } catch (e) {
      alert(`Failed to fetch template: ${e.message}`);
    } finally {
      setFetchingTemplate(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setConvertedHtml(null); // Reset converted HTML when selecting a new template
    // Keep custom instructions when selecting a new template
  };

  // Helper function to strip HTML tags and extract only text content
  const stripHtmlTags = (html) => {
    if (!html) return '';
    // Create a temporary DOM element to extract text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleApply = async () => {
    if (!selectedTemplate || !selectedElement) {
      return;
    }
    setConverting(true);

    try {
      // Get template HTML
      const templateHtml = selectedTemplate.html || selectedTemplate.template || '';
      
      // Strip HTML tags from original content to extract only text
      // This ensures we only adopt the text content, not any HTML structure
      const originalTextOnly = stripHtmlTags(originalHtml);
      
      // Build prompt: take content from original section and adapt it to the template's format
      // Include template HTML directly in the prompt for clarity (read from ref to avoid re-renders on type)
      const customInstructionsValue = (customInstructionsRef.current?.value ?? '').trim();
      const customInstructionsText = customInstructionsValue
        ? `\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${customInstructionsValue}` 
        : '';
      
      // Conditional instruction for placeholder elements based on toggle
      const placeholderInstruction = keepPlaceholders
        ? '- If the source content lacks information for certain template elements, retain those elements with their placeholder content'
        : '- Remove template elements that lack corresponding content from the source';
      
      const prompt = `Take the TEXT CONTENT from the original section below and adapt it to match the template's structure and format.

GLOBAL GUIDE RAILS — Apply the following unless they conflict with the user's direct instructions, in which case follow the user's instructions:
1. Retain all source information and text. If the template does not have enough space or elements allocated, improvise as needed; this will signal to the user to update the prompt about what to do with the extra content.
2. Do not retain HTML from the source. Use the source HTML only for contextual understanding of what the source elements are.
3. Images are informational; retain them from the source.
4. The source (and the template) may implement images as backgrounds of divs or other elements. Treat those as images: deduce where the images are and retain them.

TEMPLATE STRUCTURE (use this format, structure, CSS classes, and layout):
${templateHtml}

CRITICAL REQUIREMENTS:
- Extract ONLY the TEXT CONTENT from the original section - DO NOT adopt any HTML tags, structure, or formatting from the source
- Use ONLY the template's HTML structure, layout, CSS classes, and visual format
- The source HTML is provided for reference, but you must IGNORE all HTML tags and structure from it
- Extract only the plain text content and place it into the template's structure
- Preserve the template's design and styling completely
- Do not copy any HTML tags, attributes, classes, or structure from the source
- Map the extracted text content into the template's format appropriately
- Do not lose any text content from the original section
${placeholderInstruction}${customInstructionsText}

ORIGINAL SECTION TEXT CONTENT (extract ONLY the text, ignore all HTML):
${originalTextOnly}

ORIGINAL SECTION HTML (for reference only - DO NOT use its HTML structure):
${originalHtml}`;
      
      // Call AI edit API with template HTML and prompt
      // Note: We pass templateHtml as a flag so API knows this is template conversion
      // The prompt already includes the template HTML, and html param is the template to use as base
      const requestPayload = {
        prompt: prompt,
        html: templateHtml,
        templateHtml: true // Flag to indicate this is template conversion
      };
      const monkey = await initMonkey();
      const responseText = await monkey.apiCall('/api/content-magic/ai-edit', requestPayload);
      
      const data = JSON.parse(responseText);
      
      
      // Store converted HTML instead of applying immediately
      if (data.html) {
        setConvertedHtml(data.html);
      } else {
        throw new Error('No HTML returned from conversion');
      }
    } catch (err) {
      alert(`Template conversion failed: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  const handleAcceptChange = () => {
    if (onApply && convertedHtml) {
      const elementToReplace = originalParentSection || selectedElement;
      onApply(convertedHtml, elementToReplace);
    }

    // Reset and close
    setSelectedTemplate(null);
    setConvertedHtml(null);
    setTemplateMode("saved");
    setExampleUrl("");
    setUploadedFile(null);
    setFetchedTemplate(null);
    onClose();
  };

  const handleCancel = () => {
    // Reset converted HTML but keep template selected and custom instructions
    setConvertedHtml(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[90] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Change Template</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select a template to convert your section. Only text content will be extracted from the source - HTML structure will not be adopted.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedTemplate(null);
            setTemplateMode("saved");
            setExampleUrl("");
            setUploadedFile(null);
            setFetchedTemplate(null);
            onClose();
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content - Two Sections */}
      <div className="flex-1 flex overflow-hidden">
        {/* First Section: Selected Section Preview */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Current Section</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Preview of the section you're converting. Only text content will be extracted - HTML tags and structure will be ignored.
            </p>
          </div>
          
          {/* Custom Instructions Input */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Custom Instructions (optional)
            </label>
            <textarea
              ref={customInstructionsRef}
              defaultValue=""
              rows={3}
              placeholder="e.g., do not keep icons, remove images, keep only text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              disabled={converting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Add specific instructions for the template conversion
            </p>
          </div>
          
          {/* Keep Placeholder Elements Toggle */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={keepPlaceholders}
                  onChange={(e) => setKeepPlaceholders(e.target.checked)}
                  className="sr-only"
                  disabled={converting}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  keepPlaceholders ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ml-0.5 ${
                    keepPlaceholders ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 block">
                  Retain Unfilled Template Elements
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  When enabled, template elements without matching source content will be kept with placeholder text. When disabled, these elements will be removed.
                </span>
              </div>
            </label>
          </div>
          
          {/* Accept/Cancel buttons - shown only when converted HTML is available */}
          {convertedHtml && (
            <div className="px-6 py-3 border-b border-gray-200 bg-blue-50 flex items-center gap-3">
              <button
                onClick={handleAcceptChange}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                Accept Change
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          
          <div className="flex-1 overflow-auto p-6">
            <div>
              <p className="text-xs text-gray-500 mb-3">
                {customCssEnabled
                  ? "Preview with custom CSS applied"
                  : "Preview (custom CSS disabled)"}
              </p>
              <div
                ref={previewShadowHostRef}
                className="min-h-[200px] rounded-lg border border-gray-200 overflow-hidden bg-white"
                style={{ minHeight: "200px" }}
              />
            </div>
          </div>
        </div>

        {/* Second Section: Template Selection */}
        <div className="w-1/2 flex flex-col">
          {/* Sub-tab switcher */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => { setTemplateMode("saved"); setFetchedTemplate(null); setSelectedTemplate(null); setConvertedHtml(null); }}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                templateMode === "saved"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Use Saved Template
            </button>
            <button
              onClick={() => { setTemplateMode("url"); setSelectedTemplate(null); setConvertedHtml(null); }}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                templateMode === "url"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Use Example Page
            </button>
          </div>

          {templateMode === "saved" ? (
            <>
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Available Templates</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select a template to convert your section</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <ShowTemplates
                  onTemplateClick={handleTemplateSelect}
                  selectedTemplateId={selectedTemplate?.id || null}
                  editorShadowRoot={editorShadowRoot}
                  editorCustomCssEnabled={customCssEnabled}
                  hideCustomStylesToggle
                />
              </div>
            </>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Example Page Template</h3>
                <p className="text-xs text-gray-500 mt-0.5">Provide a URL or upload an HTML file to use its structure as the template</p>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Page URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/page"
                        value={exampleUrl}
                        onChange={(e) => setExampleUrl(e.target.value)}
                        disabled={fetchingTemplate}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Or upload an HTML file</label>
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                      disabled={fetchingTemplate}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <button
                    onClick={handleFetchTemplate}
                    disabled={fetchingTemplate || (!exampleUrl.trim() && !uploadedFile)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium w-full justify-center"
                  >
                    {fetchingTemplate ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Fetching template...</>
                    ) : (
                      "Extract Template Structure"
                    )}
                  </button>
                  {fetchedTemplate && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-800">Template extracted successfully!</p>
                      <p className="text-xs text-green-600 mt-1">
                        {fetchedTemplate.sourceUrl && <>From: {fetchedTemplate.sourceUrl}<br /></>}
                        Template ready — click "Apply Template Change" to convert your section.
                      </p>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <strong>How it works:</strong> The system fetches the page HTML and extracts its structural layout and CSS classes. Your section's text content will then be adapted to fit that structure.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          {selectedTemplate ? (
            <span>Selected: <strong>{selectedTemplate.name}</strong></span>
          ) : (
            <span className="text-gray-400">No template selected</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedTemplate(null);
              setConvertedHtml(null);
              setTemplateMode("saved");
              setExampleUrl("");
              setUploadedFile(null);
              setFetchedTemplate(null);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleApply}
            disabled={converting || !selectedTemplate || !!convertedHtml}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {converting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Converting...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Apply Template Change
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
