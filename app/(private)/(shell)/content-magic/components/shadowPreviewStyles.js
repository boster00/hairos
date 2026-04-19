// Shared helper for copying <style> tags from the main editor content
// into a preview Shadow DOM used by quick action popups.
//
// Usage:
// - editorContent: the `.editorContent` element from the main editor
//   (typically resolved via selectedElement.closest('.editorContent')).
// - shadowRoot: the ShadowRoot instance of the preview container.
// - beforeNode: the node (usually the preview `.editorContent` div)
//   before which cloned <style> tags should be inserted.
//
// The helper:
// - Removes any previously-cloned styles marked with data-editor-inline-style="true"
// - Clones all descendant <style> tags from editorContent into the preview shadow root
// - Marks all injected nodes with data-editor-inline-style="true" for safe cleanup

export function copyEditorStyleTagsToShadow({ editorContent, shadowRoot, beforeNode }) {
  if (!editorContent || !shadowRoot || !beforeNode) return;

  try {
    // Remove previously injected editor styles
    const existing = shadowRoot.querySelectorAll('style[data-editor-inline-style="true"]');
    existing.forEach((node) => {
      if (node.parentNode === shadowRoot) {
        shadowRoot.removeChild(node);
      } else if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    // Clone descendant <style> tags (not draft/profile/chrome stack — those are mirrored separately)
    const styleNodes = editorContent.querySelectorAll("style");
    styleNodes.forEach((source) => {
      if (
        source.closest("[data-extracted-styles-wrapper], [data-custom-css-head]") ||
        source.getAttribute("data-draft-styles") === "true" ||
        source.getAttribute("data-custom-css-draft-injected") === "true"
      ) {
        return;
      }
      const text = source.textContent || "";
      if (!text.trim()) return;

      const cloned = document.createElement("style");
      cloned.textContent = text;
      cloned.setAttribute("data-editor-inline-style", "true");
      const parent = beforeNode.parentNode;
      if (parent) {
        parent.insertBefore(cloned, beforeNode);
      }
    });
  } catch (err) {
  }
}

