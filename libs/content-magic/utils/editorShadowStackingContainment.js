/**
 * Shadow DOM does not use global document stylesheets for inner tree nodes.
 * Centralized injection (single module): two &lt;style&gt; tags placed as immediate
 * previous siblings of `:scope > .editorContent` (right above the contenteditable root).
 *
 * 1) isolation on .editorContent
 * 2) * { z-index: 0 !important } — user-requested flattening
 *
 * translateZ(0) on .editorContent is applied via JS with media-width scale()
 * (see attachShadowHostMediaWidthScaling / ContentMagicEditor).
 */

export const EDITOR_STACKING_CONTAIN_ATTR = 'data-editor-stacking-containment';
export const EDITOR_Z_INDEX_FLAT_ATTR = 'data-editor-shadow-z-index-flat';

export const EDITOR_ISOLATION_ONLY_CSS = `
.editorContent {
  isolation: isolate;
}
`;

/** Exact rule requested for previews / all editor shadows. */
export const EDITOR_Z_INDEX_FLAT_CSS = `*{z-index:0 !important;}`;

/**
 * Ensures exactly two &lt;style&gt; nodes (isolation + z-index flat), in that order,
 * immediately before `:scope > .editorContent`. Repositions them after every call so
 * they stay directly above the editor when sync inserts other nodes before it.
 *
 * @param {ShadowRoot | null | undefined} shadowRoot
 */
export function ensureEditorStackingContainmentStyleInShadowRoot(shadowRoot) {
  if (!shadowRoot) return;
  const editorContent = shadowRoot.querySelector(':scope > .editorContent');
  if (!editorContent || editorContent.parentNode !== shadowRoot) return;

  let isoStyle = shadowRoot.querySelector(`style[${EDITOR_STACKING_CONTAIN_ATTR}="true"]`);
  if (!isoStyle) {
    isoStyle = document.createElement('style');
    isoStyle.setAttribute(EDITOR_STACKING_CONTAIN_ATTR, 'true');
    isoStyle.textContent = EDITOR_ISOLATION_ONLY_CSS;
  }

  let zStyle = shadowRoot.querySelector(`style[${EDITOR_Z_INDEX_FLAT_ATTR}="true"]`);
  if (!zStyle) {
    zStyle = document.createElement('style');
    zStyle.setAttribute(EDITOR_Z_INDEX_FLAT_ATTR, 'true');
    zStyle.textContent = EDITOR_Z_INDEX_FLAT_CSS;
  }

  // Order: … , isolation, *{z-index:0}, .editorContent — z-index is last before editor
  shadowRoot.insertBefore(isoStyle, editorContent);
  shadowRoot.insertBefore(zStyle, editorContent);
}

/**
 * Transform for .editorContent: always include translateZ(0) for fixed/sticky containment;
 * optionally multiply by media-width scale.
 * @param {number} scale - 1 means no downscale
 * @returns {string}
 */
export function editorContentTransformForMediaWidth(scale) {
  if (scale != null && scale < 1 && Number.isFinite(scale)) {
    return `translateZ(0) scale(${scale})`;
  }
  return 'translateZ(0)';
}
