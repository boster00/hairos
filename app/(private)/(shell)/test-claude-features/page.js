"use client";
import { useState } from "react";
import { CheckCircle, Circle, ExternalLink, Loader, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

const BRANCH = "claude/add-tracking-features-u21Wn";

function Section({ number, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {number}
          </span>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t pt-4">{children}</div>}
    </div>
  );
}

function Step({ num, text, note }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
        {num}
      </span>
      <div>
        <p className="text-sm text-gray-800">{text}</p>
        {note && <p className="text-xs text-gray-500 mt-0.5 italic">{note}</p>}
      </div>
    </div>
  );
}

function Expected({ children }) {
  return (
    <div className="flex gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-green-800"><strong>Expected result:</strong> {children}</p>
    </div>
  );
}

function ApiTestButton({ label, endpoint, method = "GET", body, description }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const opts = { method };
      if (body) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(endpoint, opts);
      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 mt-3">
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <button
        onClick={run}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Circle className="w-3 h-3" />}
        {label}
      </button>
      {error && (
        <div className="mt-2 flex gap-2 text-red-700 text-xs bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {result && (
        <div className="mt-2">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${result.status < 300 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            HTTP {result.status}
          </span>
          <pre className="mt-1 text-xs bg-white border rounded p-2 overflow-auto max-h-40 text-gray-700">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function TestClaudeFeaturesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="bg-gray-100 px-2 py-1 rounded font-mono">{BRANCH}</span>
          <span>•</span>
          <span>Smoke test guide — run through these before merging</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Feature Smoke Tests</h1>
        <p className="text-gray-500 mt-2 text-sm">
          This page guides you through testing all 5 features added in branch <code className="bg-gray-100 px-1 rounded">{BRANCH}</code>.
          Each section includes self-test buttons where possible and step-by-step instructions where not.
          Expand each section to see the tests.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Before testing:</strong> Make sure <code>DATAFORSEO_LOGIN</code>, <code>DATAFORSEO_PASSWORD</code>, and <code>EDEN_AI_API_KEY</code> are set in your .env file. The pipeline and agentic features also require <code>CRON_SECRET</code>.
          </div>
        </div>
      </div>

      {/* Feature 1: Visibility Tracker */}
      <Section number="1" title="AI + SEO Visibility Tracking" defaultOpen={true}>
        <p className="text-sm text-gray-600 mb-4">
          The visibility tracker was nearly complete but hidden behind a <code className="bg-gray-100 px-1 rounded">devOnly</code> flag. It's now enabled in the sidebar. It tracks your domain's SERP rankings for keywords and monitors which AI models mention your brand in responses to prompts.
        </p>

        <h3 className="font-semibold text-gray-800 mb-2">Step-by-step test:</h3>
        <Step num="1" text='Click "Visibility Tracking" in the left sidebar — it should now appear for all users.' note="Previously it was hidden unless SHOW_DEV_SIDEBAR_ITEMS=true in development." />
        <Step num="2" text='Click "Add project". Enter your domain (e.g. yourdomain.com), any brand terms (comma-separated), and select a cadence.' />
        <Step num="3" text='After creating the project, click "Edit settings". Add at least 1 keyword (e.g. "content marketing") and 1 prompt (e.g. "What is the best tool for content marketing?"). Select models for the prompt (chatgpt, claude, or perplexity).' />
        <Step num="4" text='Go back to the project page and click "Run now". The status should change to "Project is running".' />
        <Step num="5" text="Wait 1–2 minutes then refresh. Results should appear in the Keyword Rankings and Prompt Mentions tables." />

        <Expected>Sidebar shows "Visibility Tracking". Project creation works. After a run: keyword rankings show position numbers, prompt mentions show Brand: Y/N, Domain: Y/N, and citations count.</Expected>

        <ApiTestButton
          label="Test: List projects API"
          endpoint="/api/visibility_tracker/projects"
          description="Calls the projects list API. Should return { success: true, projects: [...] }"
        />
        <ApiTestButton
          label="Test: List recent runs"
          endpoint="/api/visibility_tracker/runs?limit=5"
          description="Should return { success: true, runs: [...] }"
        />
      </Section>

      {/* Feature 2: Topic Research */}
      <Section number="2" title="Topic Research">
        <p className="text-sm text-gray-600 mb-4">
          A new standalone module accessible from the sidebar. Enter a competitor's domain to discover what keywords they rank for (with estimated traffic) or which pages drive their most organic traffic.
        </p>

        <h3 className="font-semibold text-gray-800 mb-2">Step-by-step test:</h3>
        <Step num="1" text='Click "Topic Research" in the sidebar.' />
        <Step num="2" text='Enter a competitor domain (e.g. "ahrefs.com") and click Analyze with the "Keyword Rankings" tab active.' note="This calls DataForSEO — results may take 5–10 seconds." />
        <Step num="3" text='You should see a table of keywords with: position, search volume, estimated traffic (= 0.7^position × search volume), and intent.' />
        <Step num="4" text='Switch to the "Top Pages" tab, enter the same domain, and click Analyze again.' />
        <Step num="5" text="Top pages table shows URL, estimated monthly traffic, and keyword count for each page." />

        <Expected>
          Keyword Rankings table shows actual ranking keywords for the competitor domain with position numbers and traffic estimates. Top Pages table shows the pages driving most organic traffic.
        </Expected>

        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Self-test: Keyword rankings API</h4>
          <ApiTestButton
            label="Test domain keywords (ahrefs.com)"
            endpoint="/api/competitor-research/domain-keywords"
            method="POST"
            body={{ domain: "ahrefs.com", limit: 5 }}
            description='POST to /api/competitor-research/domain-keywords with domain: "ahrefs.com". Expects { success: true, keywords: [...] } with traffic_estimate field.'
          />
        </div>

        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Self-test: Domain pages API</h4>
          <ApiTestButton
            label="Test domain pages (ahrefs.com)"
            endpoint="/api/competitor-research/domain-pages"
            method="POST"
            body={{ domain: "ahrefs.com", limit: 5 }}
            description='POST to /api/competitor-research/domain-pages. Expects { success: true, pages: [...] } with traffic_estimate and keywords_count.'
          />
        </div>
      </Section>

      {/* Feature 3: Full Agentic Creation */}
      <Section number="3" title="Full Agentic Article Creation">
        <p className="text-sm text-gray-600 mb-4">
          A new "Full Agentic Creation" button next to "New article" in the Content Magic list. When clicked, it opens a modal where you provide a main keyword, optional title, ICP, and Offer. The system then handles competitor research → keyword research → outline → draft generation automatically. The article only becomes visible in the list once processing is complete.
        </p>

        <h3 className="font-semibold text-gray-800 mb-2">Step-by-step test:</h3>
        <Step num="1" text='Go to Content Magic (click "ContentMagic.ai" in sidebar).' />
        <Step num="2" text='Look for the purple "Full Agentic Creation" button next to the blue "New article" button in the top-right.' />
        <Step num="3" text='Click "Full Agentic Creation". A modal appears with fields: Main Keyword (required), Article Title (optional), ICP dropdown, Offer dropdown.' />
        <Step num="4" text='Enter "best project management software for teams" as the keyword. Leave title blank. Select an ICP/Offer if you have them. Click "Start Agentic Creation".' />
        <Step num="5" text='A loading screen appears with rotating helpful messages. You can watch the phase message update (e.g. "Researching competitors...", "Found X keywords...").' note="This will take 1–3 minutes." />
        <Step num="6" text='Once done, a success screen appears with "Open Article" button. Click it. The article editor loads with a draft ready.' />

        <Expected>
          Modal opens cleanly. Loading messages rotate. Phase messages update in real-time. After completion, clicking "Open Article" takes you to a fully created article draft in the editor.
        </Expected>

        <ApiTestButton
          label="Test: Agentic status API (self-check)"
          endpoint="/api/content-magic/full-agentic/status?articleId=test"
          description="Should return 404 for invalid articleId — confirms the API route is wired up."
        />

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">
            This feature requires DataForSEO credentials to work fully. Without them, the keyword research step will be skipped and a basic draft will still be generated.
          </p>
        </div>
      </Section>

      {/* Feature 4: Content Pipeline */}
      <Section number="4" title="Content Pipeline">
        <p className="text-sm text-gray-600 mb-4">
          A new top-level module for automating article creation at scale. You provide a list of keywords/topics, set an ICP and Offer, and choose a cadence (minimum 1/hour, default 1/day). The system processes one keyword per cadence interval using the Full Agentic Creation flow.
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-800">
            <strong>DB Migration Required:</strong> Before using this feature, run the SQL migration at{" "}
            <code className="bg-orange-100 px-1 rounded">libs/migrations/content-pipeline.sql</code> in your Supabase SQL editor.
            This creates the <code>content_pipelines</code> and <code>content_pipeline_items</code> tables.
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-2">Step-by-step test:</h3>
        <Step num="1" text='Click "Content Pipeline" in the sidebar.' />
        <Step num="2" text='Click "New Pipeline". Fill in: Name = "Test Pipeline", then in the keywords textarea enter 3 keywords one per line (e.g. "best CRM software", "project management tips", "team collaboration tools").' note="You can optionally set title with pipe: keyword | My Custom Title" />
        <Step num="3" text="Set cadence to 'Every hour' for testing. Select an ICP and Offer if available. Click Create Pipeline." />
        <Step num="4" text="The pipeline appears in the list with a status badge (active) and item count (0/3 done)." />
        <Step num="5" text="Click the expand chevron on the pipeline to see all 3 items with status 'pending'." />
        <Step num="6" text="To trigger the pipeline manually (without waiting for cron), use the self-test button below." />
        <Step num="7" text="After ~2 minutes, refresh the pipeline items. The first item should show 'done' status with an article link." />

        <Expected>
          Pipeline created successfully. Items show correct keywords and statuses. After triggering the cron tick, the first pending item becomes 'processing' then 'done', with a linked article.
        </Expected>

        <ApiTestButton
          label="Test: List pipelines"
          endpoint="/api/content-pipeline"
          description="GET /api/content-pipeline — should return { success: true, pipelines: [...] }"
        />

        <div className="bg-gray-50 border rounded-lg p-3 mt-3">
          <p className="text-xs text-gray-500 mb-2">
            To manually trigger the pipeline cron (processes one item from due pipelines), use this curl command in your terminal with your CRON_SECRET:
          </p>
          <pre className="text-xs bg-white border rounded p-2 overflow-auto">
{`curl -X POST http://localhost:3000/api/content-pipeline/tick \\
  -H "Authorization: Bearer YOUR_CRON_SECRET" \\
  -H "Content-Type: application/json"`}
          </pre>
        </div>
      </Section>

      {/* Feature 5: Custom Template from URL */}
      <Section number="5" title="Custom Template from Example Page">
        <p className="text-sm text-gray-600 mb-4">
          When converting a section's template in the article editor, there are now TWO options instead of one: "Use Saved Template" (existing behavior) and "Use Example Page" (new). The "Use Example Page" option lets you provide a URL or upload an HTML file, and the system extracts that page's HTML structure to use as the template for your section conversion.
        </p>

        <h3 className="font-semibold text-gray-800 mb-2">Step-by-step test:</h3>
        <Step num="1" text="Open any article in the Content Magic editor." />
        <Step num="2" text='Select any section block in the editor. In the quick actions panel on the right, find the "Change Template" button and click it.' />
        <Step num="3" text="A full-screen modal opens. On the right panel, you should see two tabs: 'Use Saved Template' and 'Use Example Page'." />
        <Step num="4" text='Click "Use Example Page" tab. A URL input and file upload appear.' />
        <Step num="5" text='Enter a URL (e.g. https://stripe.com/pricing) and click "Extract Template Structure".' note="This fetches the page via the crawl API and extracts its HTML structure." />
        <Step num="6" text='After extraction, a green confirmation box appears: "Template extracted successfully!"' />
        <Step num="7" text='Click "Apply Template Change" in the footer. The AI will convert your section content to match the structure of the example page.' />
        <Step num="8" text="A preview of the converted section appears on the left. Click 'Accept Change' to apply it." />

        <Expected>
          The "Use Example Page" tab is visible in the modal. Entering a URL and clicking Extract fetches the page structure. The Apply Template Change button becomes active after extraction. The converted section uses the layout from the example page.
        </Expected>

        <ApiTestButton
          label="Test: Template from URL API"
          endpoint="/api/content-magic/template-from-url"
          method="POST"
          body={{ url: "https://example.com" }}
          description="POST to /api/content-magic/template-from-url with a URL. Should return { success: true, templateHtml: '...', charCount: N }"
        />
      </Section>

      {/* Summary */}
      <div className="bg-gray-50 border rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Test Checklist</h2>
        <div className="space-y-2 text-sm text-gray-700">
          {[
            "Visibility Tracking appears in sidebar (no dev flag needed)",
            "Can create a VT project with keywords and prompts",
            "Run now triggers SERP + AI checks and results populate",
            "Topic Research page accessible from sidebar",
            "Domain Keywords returns ranked keywords with traffic estimates",
            "Domain Pages returns top pages by organic traffic",
            "Full Agentic Creation button visible next to New Article",
            "Agentic modal accepts keyword, title (optional), ICP, offer",
            "Loading screen shows phase-by-phase messages",
            "Article is created and accessible after agentic completion",
            "Content Pipeline accessible from sidebar",
            "DB migration ran successfully (content_pipelines table exists)",
            "Can create a pipeline with keywords and cadence",
            "Pipeline cron tick processes one item per run",
            "Change Template modal has two tabs (Saved Template + Example Page)",
            "Example Page tab accepts URL and file upload",
            "Template extraction works and pre-fills the template for conversion",
          ].map((item, i) => (
            <label key={i} className="flex items-start gap-2 cursor-pointer hover:text-gray-900">
              <input type="checkbox" className="mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          Branch: <code className="bg-gray-100 px-1 rounded">{BRANCH}</code> •
          DB migrations needed: <code className="bg-gray-100 px-1 rounded">libs/migrations/content-pipeline.sql</code> •
          APIs tested: competitor-research, full-agentic, content-pipeline, template-from-url, visibility_tracker
        </div>
      </div>
    </div>
  );
}
