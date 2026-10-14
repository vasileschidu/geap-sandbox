/* Empty state — the ONE component for "nothing here" (Tailwind "simple" empty state on our
   tokens; CSS in css/empty-state.css). Used by every product: back-office shell, front office,
   Form Builder, classifiers page, EVO Cabinet, RAP, eKYC. No other empty-state markup exists
   (components.md › „Empty state — one component everywhere”).

   GEAPEmptyState.render({ title, text, icon, actionHtml, compact, bare, loading }) → HTML
     - no title: the first sentence of `text` becomes the title, the rest the line;
     - icon = a sprite id without "icon-" (default page-text);
     - variants by container: normal = dashed box (page sections) · compact = drawers, modals,
       side panels · bare = inside a table row, a bordered list, a modal list · bare + compact =
       inside a menu / popover / combobox list.
   GEAPEmptyState.noResults(title, { text, actionHtml, compact, bare }) → search icon,
     default line „Verifică ortografia sau încearcă alți termeni.” (search / filter results;
     a filtered list carries the page's own „Șterge filtrele” / „Resetează filtrele” action).
   GEAPEmptyState.tableRow(colSpan, html) → `<tr><td colspan>` holding a (bare) empty state.

   The sprite path is resolved from this script's own URL, so pages one level down
   (cabinet-evo/, rap-evo/) need no path rewriting. */
(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const SPRITE = (() => {
    try {
      const src = document.currentScript?.src;
      return src ? new URL("../assets/icons/sprite.svg", src).pathname : "assets/icons/sprite.svg";
    } catch (error) {
      return "assets/icons/sprite.svg";
    }
  })();

  /* loading = the same box while data is on its way: a brand spinner in the icon circle
     (eKYC lists and dashboard, 2026-10-13) */
  const render = ({ title = "", text = "", icon = "page-text", actionHtml = "", compact = false, bare = false, loading = false } = {}) => {
    let heading = title;
    let line = text;
    if (!heading) {
      const match = String(text).match(/^(.+?[.!?])\s+([\s\S]+)$/);
      heading = (match ? match[1] : String(text)).replace(/\.$/, "");
      line = match ? match[2] : "";
    }
    return `
      <div class="e-permits-empty${compact ? " e-permits-empty--compact" : ""}${bare ? " e-permits-empty--bare" : ""}" role="status">
        <span class="e-permits-empty__icon" aria-hidden="true">${loading ? '<span class="spinner spinner--medium spinner--brand"></span>' : `<svg class="icon"><use href="${SPRITE}#icon-${esc(icon)}"></use></svg>`}</span>
        <p class="e-permits-empty__title">${esc(heading)}</p>
        ${line ? `<p class="e-permits-empty__text">${esc(line)}</p>` : ""}
        ${actionHtml ? `<div class="e-permits-empty__actions">${actionHtml}</div>` : ""}
      </div>
    `;
  };

  const noResults = (title, { text = "Verifică ortografia sau încearcă alți termeni.", actionHtml = "", compact = false, bare = false } = {}) =>
    render({ title: String(title).replace(/\.$/, ""), text, icon: "search", actionHtml, compact, bare });

  /* an empty table body: one full-width cell around a bare empty state */
  const tableRow = (colSpan, html) => `<tr class="e-permits-empty-row"><td class="e-permits-empty-cell" colspan="${Number(colSpan) || 1}">${html}</td></tr>`;

  window.GEAPEmptyState = { render, noResults, tableRow, sprite: SPRITE };
})();
