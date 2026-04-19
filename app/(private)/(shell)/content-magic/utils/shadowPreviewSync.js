/**
 * Centralized quick-action preview shadow pipeline.
 * Mirrors non-content nodes from the main editor shadow (draft + monkey-injected CSS),
 * then applies HTML-specific head injection and inline styles from live .editorContent.
 */

import { copyEditorStyleTagsToShadow } from '../components/shadowPreviewStyles';
import {
  extractHeadStyles,
  extractBodyContent,
} from '@/libs/content-magic/utils/renderShadowDOM';
import {
  isEditorShadowChromeElement,
  setQuickActionPreviewBodyHtml,
} from '@/libs/content-magic/utils/editorShadowChrome';
import {
  ensureEditorStackingContainmentStyleInShadowRoot,
  editorContentTransformForMediaWidth,
} from '@/libs/content-magic/utils/editorShadowStackingContainment';

/** Cloned from editor shadow (draft, profile head, injected draft rewrite, etc.) */
const MIRROR_ATTR = 'data-preview-editor-mirror';

const HEAD_WRAPPER_ATTR = 'data-preview-extracted-head';

/**
 * Dev diagnostics: why main-editor styles may not appear in the preview shadow.
 * @param {ShadowRoot | null | undefined} editorShadowRoot
 * @param {Element | null | undefined} selectedElement
 * @returns {Record<string, unknown>}
 */
export function getEditorPreviewMirrorDiagnostics(editorShadowRoot, selectedElement) {
  const out = {
    editorShadowRootPresent: !!editorShadowRoot,
    selectedElementPresent: !!selectedElement,
    selectedInEditorShadowTree: false,
    closestDotEditorContentFromSelection: false,
    liveEditorContentFound: false,
    shadowLevelNodeCount: 0,
    chromeDirectChildCount: 0,
    chromeChildHints: [],
    extractedWrapperInLiveEditor: false,
    extractedStyleCount: 0,
    extractedStylesheetLinkCount: 0,
    customCssHeadInLiveEditor: false,
    draftStylesTagInLiveEditor: false,
  };

  if (!editorShadowRoot) {
    out.hint =
      'editorShadowRoot is null — no mirror of data-extracted-styles-wrapper / profile CSS. Ensure ContentMagicQuickActions gets editorRef.getShadowRoot() and the editor shadow is attached.';
    return out;
  }

  if (selectedElement && typeof selectedElement.getRootNode === 'function') {
    try {
      out.selectedInEditorShadowTree = editorShadowRoot === selectedElement.getRootNode();
    } catch (_) {
      out.selectedInEditorShadowTree = false;
    }
  }

  if (selectedElement && typeof selectedElement.closest === 'function') {
    out.closestDotEditorContentFromSelection = !!selectedElement.closest('.editorContent');
  }

  const shadowLevel = Array.from(editorShadowRoot.children).filter(
    (c) =>
      !c.classList?.contains('editor-media-width-wrapper') &&
      !c.classList?.contains('editorContent')
  );
  out.shadowLevelNodeCount = shadowLevel.length;

  const liveEditorContent =
    editorShadowRoot.querySelector(':scope > .editor-media-width-wrapper > .editorContent') ||
    editorShadowRoot.querySelector(':scope > .editorContent');
  out.liveEditorContentFound = !!liveEditorContent;

  if (!liveEditorContent) {
    out.hint =
      out.hint ||
      'Could not find :scope > .editorContent in editorShadowRoot — mirror has no source for chrome.';
    return out;
  }

  const chromeFromEditor = Array.from(liveEditorContent.children).filter((c) =>
    isEditorShadowChromeElement(c)
  );
  out.chromeDirectChildCount = chromeFromEditor.length;
  out.chromeChildHints = chromeFromEditor.map((c) => {
    if (c.getAttribute?.('data-extracted-styles-wrapper') === 'true') return 'data-extracted-styles-wrapper';
    if (c.getAttribute?.('data-custom-css-head') === 'true') return 'data-custom-css-head';
    if (c.tagName === 'STYLE' && c.getAttribute('data-draft-styles') === 'true') return 'data-draft-styles';
    if (c.tagName === 'STYLE' && c.getAttribute('data-custom-css-draft-injected') === 'true') {
      return 'data-custom-css-draft-injected';
    }
    return c.tagName || '?';
  });

  const wrapper = liveEditorContent.querySelector(':scope > [data-extracted-styles-wrapper]');
  out.extractedWrapperInLiveEditor = !!wrapper;
  if (wrapper) {
    out.extractedStyleCount = wrapper.querySelectorAll('style').length;
    out.extractedStylesheetLinkCount = wrapper.querySelectorAll('link[rel="stylesheet"]').length;
  }

  out.customCssHeadInLiveEditor = !!liveEditorContent.querySelector(
    ':scope > [data-custom-css-head]'
  );
  out.draftStylesTagInLiveEditor = !!liveEditorContent.querySelector(
    ':scope > style[data-draft-styles="true"]'
  );

  if (out.chromeDirectChildCount === 0 && !out.hint) {
    out.hint =
      'Main editor .editorContent has no chrome children (no extracted wrapper / profile head). Preview will only get section HTML + any copyEditorStyleTags clones.';
  }

  return out;
}

/**
 * Post-sync snapshot of the AI Edit preview shadow (dev diagnostics).
 * Call after `syncQuickActionPreviewShadow` to compare editor vs preview DOM.
 *
 * @param {ShadowRoot | null | undefined} previewShadowRoot
 * @param {HTMLElement | null | undefined} previewEditorContent - `.editorContent` inside preview shadow
 * @returns {Record<string, unknown>}
 */
export function getAiEditPreviewShadowSnapshot(previewShadowRoot, previewEditorContent) {
  if (!previewShadowRoot || !previewEditorContent) {
    return {
      previewShadowPresent: !!previewShadowRoot,
      previewEditorContentPresent: !!previewEditorContent,
    };
  }
  return {
    previewShadowPresent: true,
    previewEditorContentPresent: true,
    mirroredNodesWithPreviewAttr: previewShadowRoot.querySelectorAll(
      `[${MIRROR_ATTR}="true"]`
    ).length,
    previewDirectChildHasExtractedWrapper: !!previewEditorContent.querySelector(
      ':scope > [data-extracted-styles-wrapper]'
    ),
    previewEditorContentChildElementCount: previewEditorContent.children?.length ?? 0,
    previewShadowInlineStyleCloneCount: previewShadowRoot.querySelectorAll(
      'style[data-editor-inline-style="true"]'
    ).length,
    previewHeadInjectedFromHtmlStringCount: previewShadowRoot.querySelectorAll(
      `[${HEAD_WRAPPER_ATTR}="true"]`
    ).length,
  };
}

/**
 * @param {string} [html]
 * @returns {boolean}
 */
export function isLikelyFullHtmlDocument(html) {
  if (!html || typeof html !== 'string') return false;
  const t = html.trim().slice(0, 800);
  if (/^<!doctype\b/i.test(html.trim())) return true;
  return /<\s*html[\s>]/.test(t) || /<\s*head[\s>]/.test(t);
}

export function removePreviewExtractedHeadWrapper(shadowRoot) {
  if (!shadowRoot) return;
  shadowRoot.querySelectorAll(`[${HEAD_WRAPPER_ATTR}="true"]`).forEach((n) => n.remove());
}

/**
 * Remove nodes previously cloned from the main editor shadow.
 * @param {ShadowRoot} previewShadow
 */
export function removePreviewMirroredEditorNodes(previewShadow) {
  if (!previewShadow) return;
  previewShadow.querySelectorAll(`[${MIRROR_ATTR}="true"]`).forEach((n) => n.remove());
}

/**
 * Clone all direct children of the editor shadow except the content wrapper.
 * Preserves order (draft styles, monkey-injected head/styles, etc.).
 *
 * @param {ShadowRoot} previewShadow
 * @param {ShadowRoot | null | undefined} editorShadowRoot
 * @param {Node} previewEditorContent - Typically the preview .editorContent node.
 */
export function mirrorEditorShadowNonContentNodes(previewShadow, editorShadowRoot, previewEditorContent) {
  removePreviewMirroredEditorNodes(previewShadow);
  if (!previewShadow || !editorShadowRoot || !previewEditorContent?.parentNode) return;

  const shadowLevel = Array.from(editorShadowRoot.children).filter(
    (c) =>
      !c.classList?.contains('editor-media-width-wrapper') &&
      !c.classList?.contains('editorContent')
  );
  const liveEditorContent =
    editorShadowRoot.querySelector(':scope > .editor-media-width-wrapper > .editorContent') ||
    editorShadowRoot.querySelector(':scope > .editorContent');
  const chromeFromEditor = liveEditorContent
    ? Array.from(liveEditorContent.children).filter((c) => isEditorShadowChromeElement(c))
    : [];

  let anchor = previewEditorContent;
  for (let i = shadowLevel.length - 1; i >= 0; i--) {
    const clone = shadowLevel[i].cloneNode(true);
    clone.setAttribute(MIRROR_ATTR, 'true');
    previewShadow.insertBefore(clone, anchor);
    anchor = clone;
  }

  let innerAnchor = previewEditorContent.firstChild;
  for (let i = chromeFromEditor.length - 1; i >= 0; i--) {
    const clone = chromeFromEditor[i].cloneNode(true);
    clone.setAttribute(MIRROR_ATTR, 'true');
    previewEditorContent.insertBefore(clone, innerAnchor);
    innerAnchor = clone;
  }
}

/**
 * Same as ContentMagicEditor: scale content when the light-DOM host is narrower than design width.
 *
 * @param {HTMLElement | null} hostEl – element with shadow root (carries `data-media-width`)
 * @param {HTMLElement | null} scaleTargetEl – typically `.editorContent` inside the shadow root
 * @returns {() => void} cleanup
 */
export function attachShadowHostMediaWidthScaling(hostEl, scaleTargetEl) {
  if (!hostEl || !scaleTargetEl) return () => {};

  const updateScale = () => {
    const mediaWidth = hostEl.getAttribute('data-media-width');
    const px = mediaWidth ? parseInt(mediaWidth, 10) : null;
    if (px == null || !Number.isFinite(px)) {
      scaleTargetEl.style.width = '';
      scaleTargetEl.style.transform = editorContentTransformForMediaWidth(1);
      scaleTargetEl.style.transformOrigin = '';
      return;
    }
    scaleTargetEl.style.width = `${px}px`;
    scaleTargetEl.style.transformOrigin = 'top left';
    const hostWidth = hostEl.clientWidth || px;
    const scale = Math.min(1, hostWidth / px);
    scaleTargetEl.style.transform = editorContentTransformForMediaWidth(scale);
  };

  updateScale();

  const resizeObserver = new ResizeObserver(updateScale);
  resizeObserver.observe(hostEl);

  const mutationObserver = new MutationObserver((mutations) => {
    if (
      mutations.some(
        (m) => m.type === 'attributes' && m.attributeName === 'data-media-width'
      )
    ) {
      updateScale();
    }
  });
  mutationObserver.observe(hostEl, {
    attributes: true,
    attributeFilter: ['data-media-width'],
  });

  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    scaleTargetEl.style.width = '';
    scaleTargetEl.style.transform = '';
    scaleTargetEl.style.transformOrigin = '';
  };
}

/**
 * Create or reuse shadow root with `shadow > .editorContent` (matches main editor + renderShadowDOM).
 *
 * @param {HTMLElement | null} hostEl
 * @param {{ contentEditable?: 'true' | 'false', previewLog?: (d: Record<string, unknown>) => void }} [opts]
 * @returns {{ shadow: ShadowRoot | null, wrapper: null, previewDiv: HTMLElement | null }}
 */
export function ensureQuickActionPreviewShadowHost(hostEl, opts = {}) {
  if (!hostEl) return { shadow: null, wrapper: null, previewDiv: null };
  const previewLog = typeof opts.previewLog === 'function' ? opts.previewLog : null;
  let shadow = hostEl.shadowRoot;
  let createdNewShadow = false;
  if (!shadow) {
    shadow = hostEl.attachShadow({ mode: 'open' });
    createdNewShadow = true;
  }

  const legacyWrap = shadow.querySelector(':scope > .editor-media-width-wrapper');
  if (legacyWrap) {
    const inner = legacyWrap.querySelector(':scope > .editorContent');
    if (inner) {
      legacyWrap.replaceWith(inner);
    } else {
      legacyWrap.remove();
    }
  }

  let previewDiv = shadow.querySelector(':scope > .editorContent');
  let createdPreviewDiv = false;
  if (!previewDiv) {
    previewDiv = document.createElement('div');
    previewDiv.className =
      'editorContent min-h-full outline-none rounded-lg p-4 border border-gray-200 bg-white';
    previewDiv.style.wordBreak = 'break-word';
    previewDiv.style.overflowWrap = 'break-word';
    if (opts.contentEditable != null) {
      previewDiv.contentEditable = opts.contentEditable;
    }
    shadow.appendChild(previewDiv);
    createdPreviewDiv = true;
  }

  previewLog?.({
    stage: 'ensure-shadow-host',
    createdNewShadow,
    createdWrapper: false,
    createdPreviewDiv,
    contentEditable: opts.contentEditable ?? null,
    shadowChildCount: shadow.childNodes.length,
    hasMediaWidthWrapper: !!shadow.querySelector('.editor-media-width-wrapper'),
  });

  ensureEditorStackingContainmentStyleInShadowRoot(shadow);

  return { shadow, wrapper: null, previewDiv };
}

/**
 * If htmlString looks like a full document, inject rewritten head styles (and link tags) before insertBefore.
 * @returns {boolean} whether head nodes were injected
 */
export function injectHeadStylesFromHtmlIfDocument(previewShadow, htmlString, insertBefore) {
  removePreviewExtractedHeadWrapper(previewShadow);
  if (!previewShadow || !insertBefore?.parentNode) return false;
  if (!isLikelyFullHtmlDocument(htmlString)) return false;
  const nodes = extractHeadStyles(htmlString);
  if (!nodes.length) return false;
  const wrapper = document.createElement('div');
  wrapper.setAttribute(HEAD_WRAPPER_ATTR, 'true');
  wrapper.style.display = 'contents';
  nodes.forEach((n) => wrapper.appendChild(n));
  previewShadow.insertBefore(wrapper, insertBefore);
  return true;
}

/**
 * Body HTML to show inside .editorContent for a preview string (fragment or full document).
 * @param {string} [htmlString]
 * @returns {string}
 */
export function getBodyHtmlForPreview(htmlString) {
  if (htmlString == null) return '';
  if (isLikelyFullHtmlDocument(htmlString)) return extractBodyContent(htmlString);
  return htmlString;
}

/**
 * Full pipeline: mirror editor shadow (styles/links/head) → extracted doc head (if full HTML) →
 * inline &lt;style&gt; from live .editorContent → optional body innerHTML.
 *
 * Profile / draft CSS comes from mirroring the live editor shadow, so popups should not call
 * monkey.applyCustomCssToShadowDom separately (avoids duplicate injections).
 *
 * @param {{
 *   shadowRoot: ShadowRoot,
 *   editorShadowRoot?: ShadowRoot | null,
 *   htmlString: string,
 *   selectedElement?: Element | null,
 *   previewDiv: HTMLElement,
 *   setInnerHtml?: boolean,
 *   previewLog?: (detail: Record<string, unknown>) => void
 * }} opts
 */
export function syncQuickActionPreviewShadow({
  shadowRoot,
  editorShadowRoot = null,
  htmlString = '',
  selectedElement = null,
  previewDiv,
  setInnerHtml = true,
  previewLog: previewLog_,
}) {
  const previewLog = typeof previewLog_ === 'function' ? previewLog_ : null;

  if (!shadowRoot || !previewDiv) {
    previewLog?.({
      stage: 'sync-abort',
      reason: 'missing shadowRoot or previewDiv',
    });
    return;
  }

  const previewHost =
    shadowRoot && typeof shadowRoot.host !== 'undefined' ? shadowRoot.host : null;
  const editorHost =
    editorShadowRoot && typeof editorShadowRoot.host !== 'undefined'
      ? editorShadowRoot.host
      : null;
  if (previewHost && editorHost) {
    const mw = editorHost.getAttribute('data-media-width');
    if (mw != null && mw !== '') previewHost.setAttribute('data-media-width', mw);
    else previewHost.removeAttribute('data-media-width');
  } else if (previewHost) {
    previewHost.removeAttribute('data-media-width');
  }
  previewLog?.({
    stage: 'sync-media-width-attr',
    detail:
      'Copies data-media-width from the editor shadow host to the preview host so .editorContent can scale like the main editor.',
    previewDataMediaWidth: previewHost?.getAttribute?.('data-media-width') ?? null,
  });

  const mirrorAnchor = previewDiv;

  const editorChildrenBefore =
    editorShadowRoot && editorShadowRoot.children
      ? Array.from(editorShadowRoot.children).map((c) => ({
          tag: c.tagName,
          className: typeof c.className === 'string' ? c.className.slice(0, 120) : '',
          isContentWrapper:
            (c.classList?.contains('editor-media-width-wrapper') ?? false) ||
            (c.classList?.contains('editorContent') ?? false),
        }))
      : [];

  previewLog?.({
    stage: 'sync-start',
    hasEditorShadowRoot: !!editorShadowRoot,
    editorShadowDirectChildren: editorChildrenBefore,
    htmlStringChars: htmlString?.length ?? 0,
    setInnerHtml,
    isLikelyFullDocument: isLikelyFullHtmlDocument(htmlString),
  });

  previewLog?.({
    stage: 'style-adoption-diagnostics',
    ...getEditorPreviewMirrorDiagnostics(editorShadowRoot, selectedElement),
  });

  mirrorEditorShadowNonContentNodes(shadowRoot, editorShadowRoot, mirrorAnchor);
  const mirrored = shadowRoot.querySelectorAll(`[${MIRROR_ATTR}="true"]`);
  previewLog?.({
    stage: 'mirror-editor-shadow',
    detail:
      'Clones chrome inside live .editorContent + any extra shadow siblings before the preview .editorContent.',
    mirroredNodeCount: mirrored.length,
    mirroredNodes: [...mirrored].map((n) => ({
      tag: n.tagName,
      className: typeof n.className === 'string' ? n.className.slice(0, 120) : '',
      id: n.id || undefined,
    })),
  });

  const injectedHead = injectHeadStylesFromHtmlIfDocument(
    shadowRoot,
    htmlString,
    mirrorAnchor
  );
  previewLog?.({
    stage: 'inject-head-from-html-string',
    detail:
      'If htmlString looks like a full document, extractHeadStyles injects <style>/<link> before the preview .editorContent.',
    injected: injectedHead,
  });

  const editorContent =
    selectedElement && typeof selectedElement.closest === 'function'
      ? selectedElement.closest('.editorContent')
      : null;
  const styleSourceCount = editorContent
    ? editorContent.querySelectorAll('style').length
    : 0;

  copyEditorStyleTagsToShadow({
    editorContent,
    shadowRoot,
    beforeNode: previewDiv,
  });

  const clonedInlineCount = shadowRoot.querySelectorAll(
    'style[data-editor-inline-style="true"]'
  ).length;
  previewLog?.({
    stage: 'copy-inline-style-tags-from-editor-content',
    detail:
      'Clones descendant <style> nodes from live .editorContent (section inline styles) into the preview shadow.',
    foundEditorContent: !!editorContent,
    styleTagsInEditorContent: styleSourceCount,
    clonedIntoPreviewShadow: clonedInlineCount,
  });

  if (setInnerHtml) {
    const body = getBodyHtmlForPreview(htmlString);
    setQuickActionPreviewBodyHtml(previewDiv, body);
    previewLog?.({
      stage: 'set-body-innerhtml',
      bodyChars: body.length,
    });
  } else {
    previewLog?.({
      stage: 'skip-body-innerhtml',
      detail: 'setInnerHtml false (e.g. contenteditable preview tab keeps DOM as source of truth).',
    });
  }

  previewLog?.({
    stage: 'style-adoption-result',
    mirroredPreviewNodesTotal: mirrored.length,
    previewEditorContentHasExtractedWrapper: !!previewDiv.querySelector(
      ':scope > [data-extracted-styles-wrapper]'
    ),
    previewShadowInlineStyleClones: shadowRoot.querySelectorAll(
      'style[data-editor-inline-style="true"]'
    ).length,
  });

  ensureEditorStackingContainmentStyleInShadowRoot(shadowRoot);
}
