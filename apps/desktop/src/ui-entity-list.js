/** @typedef {import("./types.js").EditorSnapshot} EditorSnapshot */

/**
 * @typedef {{
 *   id: number | null,
 *   text: string
 * }} EntityListRow
 */

/**
 * Build deterministic entity list rows for rendering.
 *
 * @param {EditorSnapshot} snapshot
 * @returns {EntityListRow[]}
 */
export function buildEntityListRows(snapshot) {
  const entities = Array.isArray(snapshot?.entities) ? snapshot.entities : [];
  if (entities.length === 0) {
    return [{ id: null, text: "No entities." }];
  }
  const selection = Array.isArray(snapshot?.selection) ? snapshot.selection : [];
  return entities.map((entity) => ({
    id: entity.id,
    text: `${selection.includes(entity.id) ? "[Selected] " : ""}${entity.name} (#${entity.id}) @ (${entity.position.x}, ${entity.position.y})`,
  }));
}

/**
 * @typedef {{
 *   entityList: HTMLElement | null
 * }} EntityListControllerElements
 */

/**
 * @param {{ elements: EntityListControllerElements }} deps
 */
export function createEntityListController({ elements }) {
  function renderEntityList(snapshot) {
    if (!elements.entityList) {
      return;
    }
    const rows = buildEntityListRows(snapshot);
    const fragment = document.createDocumentFragment();
    rows.forEach((entry) => {
      const row = document.createElement("li");
      if (entry.id !== null) {
        row.setAttribute("data-entity-id", String(entry.id));
      }
      row.textContent = entry.text;
      fragment.append(row);
    });
    elements.entityList.replaceChildren(fragment);
  }

  function dispose() {
    // No listeners in this controller.
  }

  return {
    dispose,
    renderEntityList,
  };
}
