"use client";

/**
 * Static layout mirror for Playwright: Edit Draft generation row + example template controls.
 * Not linked in nav; used for template-url-4 screenshot.
 */
import ExamplePageTemplateControls from "@/libs/content-magic/components/ExamplePageTemplateControls";

export default function EditDraftPreviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Edit Draft — Generation (preview)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Same control row as in Edit Draft: custom templates toggle + example page layout. Open a real article →
        Edit Draft for the full flow.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Prompt</label>
          <textarea
            className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm"
            readOnly
            value="Generate a landing page for our ELISA kits..."
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-700">Use custom templates</span>
            <span className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full bg-gray-200 border-2 border-transparent">
              <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-1 mt-0.5" />
            </span>
          </label>
          <ExamplePageTemplateControls />
        </div>
      </div>
    </div>
  );
}
