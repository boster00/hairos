import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const maxDuration = 30;

function getOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (process.env.CJGEO_DEV_FAKE_AUTH !== "1" && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.CJGEO_DEV_FAKE_AUTH === "1" && process.env.CONTENT_MAGIC_TEMPLATE_MOCK === "1") {
    const mockHtml = `<!DOCTYPE html><html><head><title>Mock</title></head><body><header><nav>Nav</nav></header><main><h1>Example</h1><section><h2>Features</h2><p>Mock template body for tests.</p></section></main></body></html>`;
    return NextResponse.json({
      success: true,
      templateHtml: extractTemplateStructure(mockHtml),
      sourceUrl: "https://example.com/mock-page",
      charCount: mockHtml.length,
      dev_mock: true,
    });
  }

  const contentType = request.headers.get("content-type") || "";
  let url = null;
  let uploadedHtml = null;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    url = body.url;
  } else if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    url = formData.get("url");
    const file = formData.get("file");
    if (file && file.size > 0) {
      uploadedHtml = await file.text();
    }
  }

  let rawHtml = uploadedHtml;

  // If URL provided, fetch via the crawl API
  if (!rawHtml && url) {
    try {
      const origin = getOrigin();
      const cookieHeader = request.headers.get("cookie") || "";
      const crawlRes = await fetch(`${origin}/api/content-magic/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieHeader },
        body: JSON.stringify({ url }),
      });
      const crawlData = await crawlRes.json();
      rawHtml = crawlData.content_html || crawlData.content || null;
    } catch (e) {
      return NextResponse.json({ error: `Failed to fetch URL: ${e.message}` }, { status: 500 });
    }
  }

  if (!rawHtml) {
    return NextResponse.json({ error: "No HTML content found. Provide a URL or upload a file." }, { status: 400 });
  }

  // Extract a representative section from the fetched HTML
  // We try to get the <body> content, then strip scripts/styles to get the structural HTML
  const cleanHtml = extractTemplateStructure(rawHtml);

  return NextResponse.json({
    success: true,
    templateHtml: cleanHtml,
    sourceUrl: url || null,
    charCount: cleanHtml.length,
  });
}

function extractTemplateStructure(html) {
  // Remove <script> tags
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove <style> content but keep the tags (for class-based structure)
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  // Remove HTML comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  // Remove inline event handlers
  clean = clean.replace(/\s+on\w+="[^"]*"/gi, "");
  // Collapse excessive whitespace
  clean = clean.replace(/\s{3,}/g, "  ").trim();
  // Limit to first 15000 chars to avoid prompt overload
  if (clean.length > 15000) {
    clean = clean.substring(0, 15000) + "\n<!-- [truncated for template extraction] -->";
  }
  return clean;
}
