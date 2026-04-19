/**
 * Session persistence for "Example page layout" (URL-fetched template) in Content Magic Edit Draft.
 */
export const EXAMPLE_TEMPLATE_STORAGE_KEY = "cm_example_page_template_v1";

/** @returns {{ sourceUrl: string, domain: string, templateHtml: string } | null} */
export function readExampleTemplateFromSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(EXAMPLE_TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.templateHtml && p?.sourceUrl) return p;
    return null;
  } catch {
    return null;
  }
}

export function writeExampleTemplateToSession(data) {
  if (typeof window === "undefined") return;
  try {
    if (data) {
      sessionStorage.setItem(EXAMPLE_TEMPLATE_STORAGE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(EXAMPLE_TEMPLATE_STORAGE_KEY);
    }
    window.dispatchEvent(new Event("cm-example-template-changed"));
  } catch {
    /* quota or private mode */
  }
}

export function parseExamplePageUrl(input) {
  const t = String(input || "").trim();
  if (!t) return { error: "Enter a URL" };
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { error: "Only http and https URLs are supported" };
    }
    return { url: u.toString() };
  } catch {
    return { error: "Invalid URL" };
  }
}

export function hostnameFromUrl(urlString) {
  try {
    return new URL(urlString).hostname.replace(/^www\./, "");
  } catch {
    return urlString;
  }
}
