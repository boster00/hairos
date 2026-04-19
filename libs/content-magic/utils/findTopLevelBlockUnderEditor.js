/**
 * The editor content root is a single element (e.g. .editorContent); quick actions should target
 * its direct children whether they are <section>, <div>, etc.
 *
 * @param {HTMLElement | null} editorRoot
 * @param {Node | null} node
 * @returns {HTMLElement | null}
 */
export function findTopLevelBlockUnderEditor(editorRoot, node) {
  if (!editorRoot || !node || !editorRoot.contains(node)) return null;
  let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return null;
  while (el.parentElement && el.parentElement !== editorRoot) {
    el = el.parentElement;
  }
  return el.parentElement === editorRoot ? el : null;
}
