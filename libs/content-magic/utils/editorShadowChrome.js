/**
 * "Chrome" nodes inside shadow .editorContent: draft head wrapper, profile CSS head,
 * injected draft rewrite. Body HTML for storage excludes these; profile CSS inserts before the first body node.
 */

export function isEditorShadowChromeElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.getAttribute("data-extracted-styles-wrapper") === "true") return true;
  if (el.getAttribute("data-custom-css-head") === "true") return true;
  if (el.tagName === "STYLE" && el.getAttribute("data-draft-styles") === "true") return true;
  if (el.tagName === "STYLE" && el.getAttribute("data-custom-css-draft-injected") === "true") {
    return true;
  }
  return false;
}

/** First child of editorEl before which profile/draft CSS should be inserted (first non-chrome node, or null). */
export function getEditorShadowProfileInsertBefore(editorEl) {
  if (!editorEl) return null;
  for (const child of editorEl.childNodes) {
    if (child.nodeType !== 1) return child;
    if (!isEditorShadowChromeElement(child)) return child;
  }
  return null;
}

/** Drop non-chrome children only; append body HTML. */
export function setEditorShadowBodyHtml(editorEl, bodyHtml) {
  if (!editorEl) return;
  for (const child of Array.from(editorEl.childNodes)) {
    if (child.nodeType === 1 && isEditorShadowChromeElement(child)) continue;
    editorEl.removeChild(child);
  }
  if (bodyHtml) editorEl.insertAdjacentHTML("beforeend", bodyHtml);
}

/**
 * Same as setEditorShadowBodyHtml but also keeps preview-only cloned section styles
 * (see copyEditorStyleTagsToShadow) so quick-action shadow sync does not strip them.
 */
export function setQuickActionPreviewBodyHtml(editorEl, bodyHtml) {
  if (!editorEl) return;
  for (const child of Array.from(editorEl.childNodes)) {
    if (child.nodeType === 1 && isEditorShadowChromeElement(child)) continue;
    if (
      child.nodeType === 1 &&
      child.tagName === "STYLE" &&
      child.getAttribute("data-editor-inline-style") === "true"
    ) {
      continue;
    }
    editorEl.removeChild(child);
  }
  if (bodyHtml) editorEl.insertAdjacentHTML("beforeend", bodyHtml);
}

/** Serialize editable body only (no chrome) for save/copy. */
export function getEditorBodyHtmlExcludingChrome(editorEl) {
  if (!editorEl) return "";
  const div = document.createElement("div");
  for (const child of editorEl.childNodes) {
    if (child.nodeType === 1 && isEditorShadowChromeElement(child)) continue;
    div.appendChild(child.cloneNode(true));
  }
  return div.innerHTML;
}
